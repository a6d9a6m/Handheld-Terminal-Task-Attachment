import { pipeline, env} from '@xenova/transformers';

env.remoteHost = 'https://huggingface.co';
env.allowLocalModels = false;

let chatPipeline = null;

const progress_callback = (data) => {
  if (data.status === 'progress') {
    const { file, progress, loaded, total } = data;
    console.log(`Downloading ${file}: ${progress.toFixed(2)}% (${(loaded / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`);
  } else if (data.status === 'done') {
    console.log(`Finished downloading ${data.file}.`);
  } else {
    console.log('Loading status update:', data);
  }
};

// 添加网络请求监控
function setupNetworkMonitoring() {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.includes('huggingface') || url.includes('config.json'))) {
      console.log('🔍 Fetch Request:', url);
    }
    return originalFetch.apply(this, args).catch(error => {
      if (typeof url === 'string' && (url.includes('huggingface') || url.includes('config.json'))) {
        console.error('❌ Fetch Error for:', url, error);
      }
      throw error;
    });
  };
  
  // 监控 XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (url.includes('huggingface') || url.includes('config.json'))) {
      console.log('🔍 XHR Request:', url);
      
      // 监听错误
      this.addEventListener('error', (e) => {
        console.error('❌ XHR Error for:', url, e);
      });
      
      // 监听加载
      this.addEventListener('load', () => {
        console.log('✅ XHR Success for:', url, 'Status:', this.status);
      });
    }
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  // 监控所有网络请求
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes('huggingface') || entry.name.includes('config.json')) {
        console.log('🔍 Performance Request:', entry.name, entry.entryType);
      }
    }
  });
  observer.observe({ entryTypes: ['resource'] });
}



export async function chatWithWasm(input) {
  console.log('chatWithWasm called', input);

  // setupNetworkMonitoring() 和 pipeline 初始化代码保持不变...
  if (!chatPipeline) {
    console.log('loading pipeline...');
    try {
      const model_name = 'Xenova/Qwen1.5-0.5B-Chat';
      chatPipeline = await pipeline(
          'text-generation',
          model_name,
          {
            quantized: true,
            progress_callback: progress_callback,
          })
      console.log('Remote model loaded successfully');
    } catch (error) {
      console.error('Remote model loading failed:', error);
      throw new Error('无法加载远程AI模型，请检查网络连接');
    }
  }

  // 这个指令教模型如何根据用户输入自己决定输出格式
  const messages = [
    {
      role: 'system',
      content: `你是一个专门用于解析用户意图并输出JSON的AI。你的唯一任务是分析用户信息，并严格按照下面的格式只返回一个JSON对象，禁止返回任何其他解释、问候或文字。

// 1. 如果用户意图是创建任务，像这样填充JSON:
{
  "intent": "新建任务",
  "confidence": 0.9,
  "params": {
    "taskName": "从用户输入中提取的任务名",
    "startPos": "从用户输入中提取的起始点", 
    "taskTrip": "从用户输入中提取的距离(数字)",
    "executor": "从用户输入中提取的执行人",
    "remark": "根据用户输入生成的备注"
  },
  "reply": "已为您创建任务。",
  "shouldCreateTask": true
}

// 2. 如果用户只是打招呼或闲聊，像这样填充JSON:
{
  "intent": "打招呼",
  "confidence": 0.9,
  "params": {},
  "reply": "您好！我是您的地铁巡检助手，有什么可以帮您的吗？",
  "shouldCreateTask": false
}`
    },
    {
      role: 'user',
      content: input
    },
  ];

  const prompt = chatPipeline.tokenizer.apply_chat_template(messages, {
    tokenize: false,
    add_generation_prompt: true,
  });

  console.log('Starting inference with a FORCED JSON prompt:', prompt);

  try {
    // --- 关键修改 2: 使用最严格、最确定的推理参数 ---
    // 杜绝模型任何“自由发挥”的可能性
    const result = await chatPipeline(prompt, {
      return_full_text: false, // 只返回新文本，这非常重要

      max_new_tokens: 256, // JSON通常不需要太长

      // 强制使用贪婪解码，关闭所有随机性
      temperature: 0.01,
      do_sample: false,

      repetition_penalty: 1.1,
    });

    // --- 关键修改 3: 一个更健壮的解析逻辑 ---
    let structured = null; // 初始化为 null，以便后续判断是否成功解析
    const assistant_reply = result[0].generated_text.trim();

    console.log('=== AI 的 JSON-only 回复 ===');
    console.log(assistant_reply);
    console.log('============================');

// NEW: 使用非贪婪正则表达式从AI回复中提取所有可能的JSON块
// 这可以抵御模型偶尔在前后添加 markdown ```json 标记或返回多个JSON对象
    const jsonMatches = assistant_reply.match(/\{[\s\S]*?\}/g);

    if (jsonMatches && jsonMatches.length > 0) {
      // 遍历所有找到的JSON字符串，尝试解析第一个有效的
      for (const match of jsonMatches) {
        try {
          structured = JSON.parse(match);
          console.log('成功解析出一个JSON对象，将使用此对象。', structured);
          // 只要成功解析出第一个，就跳出循环，不再处理后续的JSON块
          break;
        } catch (e) {
          // 如果当前块解析失败，打印一个警告，然后继续尝试下一个
          console.warn('发现一个非标准的JSON块，已跳过:', match);
        }
      }
    }

// 如果在所有尝试后，structured 仍然为 null，说明没有找到任何有效的JSON
    if (structured) {
      try {
        // 检查JSON是否完整，如果不完整则补充缺失字段
        if (!structured.intent || !structured.confidence || !structured.params || structured.shouldCreateTask === undefined) {
          console.log('AI返回的JSON不完整，将尝试补充缺失字段');

          // 如果只有reply字段，判断是否为问候
          const replyValue = structured.reply || structured[" reply"];
          if (replyValue && !structured.intent) {
            const replyText = replyValue.toLowerCase();
            if (replyText.includes('您好') || replyText.includes('你好') || replyText.includes('hi') || replyText.includes('hello')) {
              structured.intent = '打招呼';
              structured.confidence = structured.confidence || 0.9;
              structured.params = structured.params || {};
              structured.shouldCreateTask = false;
              structured.reply = replyValue;
            } else {
              console.log('JSON不完整且非问候，启用兜底解析');
              structured = parseTextToStructured(assistant_reply, input);
            }
          } else {
            // 补充其他缺失字段
            structured.intent = structured.intent || '未知';
            structured.confidence = structured.confidence || 0.5;
            structured.params = structured.params || {};
            structured.shouldCreateTask = structured.shouldCreateTask !== undefined ? structured.shouldCreateTask : false;
            structured.reply = structured.reply || structured[" reply"] || '我理解了您的需求';
          }
        }
      } catch (e) {
        console.error("在补充JSON字段时发生错误，启用兜底方案。", e);
        structured = parseTextToStructured(assistant_reply, input);
      }
    } else {
      // 如果模型未能返回任何可解析的JSON，则启用兜底方案
      console.warn('模型未能按指令返回任何可解析的JSON，启用兜底方案。');
      structured = parseTextToStructured(assistant_reply, input);
    }

// 现在，您的应用代码可以100%可靠地根据这个JSON来决策
    const CONFIDENCE_THRESHOLD = 0.7; // 设定一个置信度阈值，例如0.7

    if (structured && structured.shouldCreateTask && structured.confidence >= CONFIDENCE_THRESHOLD) {
      // 当意图是创建任务，且置信度足够高时
      const templateParams = generateTaskParams(input);
      structured.params = { ...templateParams, ...structured.params };
      console.log("决策：创建任务 (高置信度)", structured.params);

    } else if (structured && structured.shouldCreateTask && structured.confidence < CONFIDENCE_THRESHOLD) {
      // 当意图是创建任务，但置信度不足时
      console.log("决策：意图不明确，请求用户确认");
      structured.reply = `我似乎理解您想创建一个任务，但不太确定。您可以换个方式，或者提供更具体的信息吗？`;
      structured.shouldCreateTask = false; // 修正决策，不创建任务

    } else if (structured) {
      // 其他情况（如打招呼或低置信度的其他意图）
      console.log("决策：显示聊天回复", structured.reply);
    }

    console.log("reply:" + (structured ? structured.reply : ''));
    return structured;

  } catch (inferenceError) {
    console.error('Inference failed:', inferenceError);
    return parseTextToStructured('', input);
  }
}

// 文本解析为结构化数据的兜底函数
function parseTextToStructured(text, originalInput) {
  const structured = {
    intent: '未知',
    confidence: 0.5,
    params: {},
    reply: text || '我理解了您的需求',
    shouldCreateTask: false
  };
  
  // 简单的关键词匹配 - 适配地铁隧道巡检系统
  const createTaskKeywords = ['新建任务', '创建任务', '建个任务', '添加任务', '生成任务', '帮我创建', '帮我建', '巡检', '检查', '监控', 'create', 'new', 'task', 'inspection', 'check', 'monitor', '地铁', '隧道', '轨道', '线路'];
  const queryTaskKeywords = ['查询任务', '查看任务', '任务列表', '有哪些任务', '任务状态', '任务进度', 'query', 'list', 'status', 'progress', '查看', '查询', '了解'];
  const greetingKeywords = ['你好', '您好', '早上好', '下午好', '晚上好', 'hi', 'hello', 'good morning', 'good afternoon', 'good evening'];
  
  const lowerText = text.toLowerCase();
  const lowerInput = originalInput.toLowerCase();
  
  // 判断意图 - 优先处理打招呼
  if (greetingKeywords.some(keyword => lowerText.includes(keyword) || lowerInput.includes(keyword))) {
    structured.intent = '打招呼';
    structured.confidence = 0.9;
    structured.reply = '您好！我是智能任务助手，可以帮您创建和管理任务。请告诉我您需要什么帮助？';
    
  } else if (createTaskKeywords.some(keyword => lowerText.includes(keyword) || lowerInput.includes(keyword))) {
    structured.intent = '新建任务';
    structured.shouldCreateTask = true;
    structured.confidence = 0.8;
    
    // 使用任务模板系统提取参数
    const templateParams = generateTaskParams(originalInput);
    structured.params = templateParams;
    structured.reply = `已为您创建${templateParams.taskName}，起始位置：${templateParams.startPos}，距离：${templateParams.taskTrip}米，执行人：${templateParams.executor}`;
    
  } else if (queryTaskKeywords.some(keyword => lowerText.includes(keyword) || lowerInput.includes(keyword))) {
    structured.intent = '查询任务';
    structured.confidence = 0.7;
    structured.reply = '我可以帮您查询任务信息，请告诉我您想了解什么？';
    
  } else {
    // 检查是否包含任务相关词汇
    const taskType = identifyTaskTypeFromText(originalInput);
    if (taskType) {
      structured.intent = '新建任务';
      structured.shouldCreateTask = true;
      structured.confidence = 0.6;
      structured.params = taskType;
      structured.reply = `已为您创建${taskType.taskName}，起始位置：${taskType.startPos}，距离：${taskType.taskTrip}米，执行人：${taskType.executor}`;
    } else {
      // 智能回复 - 根据输入内容提供有用的回复
      if (originalInput.includes('地铁') || originalInput.includes('隧道') || originalInput.includes('巡检')) {
        structured.intent = '新建任务';
        structured.shouldCreateTask = true;
        structured.confidence = 0.5;
        const defaultTask = {
          taskName: '地铁隧道巡检任务',
          startPos: '隧道入口',
          taskTrip: 1000,
          executor: '巡检机器人',
          remark: '自动生成的巡检任务'
        };
        structured.params = defaultTask;
        structured.reply = `检测到您提到地铁隧道巡检相关内容，已为您创建默认巡检任务。您可以告诉我具体的起始位置和距离要求。`;
      } else {
        structured.reply = '我理解了您的需求，正在为您处理...';
      }
    }
  }
  
  return structured;
}

// 从文本中识别任务类型
function identifyTaskTypeFromText(text) {
  const lowerText = text.toLowerCase();
  
  for (const [type, template] of Object.entries(taskTemplates)) {
    if (template.keywords.some(keyword => lowerText.includes(keyword))) {
      return {
        ...template.defaultParams,
        taskType: type,
        confidence: 0.6
      };
    }
  }
  
  return null;
}

// 任务模板配置 - 适配地铁隧道巡检系统
const taskTemplates = {
  // 隧道巡检任务模板（主要类型）
  tunnel_inspection: {
    name: '隧道巡检任务',
    defaultParams: {
      taskName: '隧道巡检任务',
      startPos: '隧道入口',
      taskTrip: 1000,
      executor: '巡检机器人',
      remark: '地铁隧道安全巡检'
    },
    keywords: ['巡检', '检查', '巡视', '巡查', '检测', '隧道', '地铁', '轨道', '线路'],
    description: '地铁隧道安全巡检任务'
  },
  
  // 设备检查任务模板
  equipment_check: {
    name: '设备检查任务',
    defaultParams: {
      taskName: '设备检查任务',
      startPos: '设备区域',
      taskTrip: 500,
      executor: '巡检机器人',
      remark: '设备状态检查'
    },
    keywords: ['设备', '检查', '维护', '保养', '修理', '维修', '检修', '故障'],
    description: '设备状态检查和维护任务'
  },
  
  // 安全监控任务模板
  safety_monitoring: {
    name: '安全监控任务',
    defaultParams: {
      taskName: '安全监控任务',
      startPos: '监控区域',
      taskTrip: 800,
      executor: '巡检机器人',
      remark: '安全状态监控'
    },
    keywords: ['监控', '监视', '观察', '跟踪', '监测', '安全', '防护', '预警'],
    description: '安全状态监控任务'
  }
};

// 任务参数解析规则 - 适配地铁隧道巡检系统
const taskParamRules = {
  // 任务名称提取规则
  taskName: [
    /任务名[称]?[：:]\s*([^\s,，。]+)/,
    /创建[一个]?([^任务\s,，。]+)任务/,
    /新建[一个]?([^任务\s,，。]+)任务/,
    /([^任务\s,，。]+)巡检/,
    /([^任务\s,，。]+)检查/,
    /([^任务\s,，。]+)监控/,
    /隧道([^任务\s,，。]+)/,
    /地铁([^任务\s,，。]+)/
  ],
  
  // 起始位置提取规则
  startPos: [
    /起点[：:]\s*([^\s,，。]+)/,
    /起始[位置]?[：:]\s*([^\s,，。]+)/,
    /从([^\s,，。]+)开始/,
    /在([^\s,，。]+)进行/,
    /隧道([^任务\s,，。]+)/,
    /地铁([^任务\s,，。]+)/,
    /([^任务\s,，。]+)站/,
    /([^任务\s,，。]+)入口/
  ],
  
  // 任务距离提取规则
  taskTrip: [
    /(\d+)\s*(米|m|M)/,
    /距离[：:]\s*(\d+)\s*(米|m|M)/,
    /行程[：:]\s*(\d+)\s*(米|m|M)/,
    /长度[：:]\s*(\d+)\s*(米|m|M)/,
    /(\d+)\s*公里/,
    /(\d+)\s*km/
  ],
  
  // 执行人提取规则
  executor: [
    /执行人[：:]\s*([^\s,，。]+)/,
    /由([^\s,，。]+)执行/,
    /([^\s,，。]+)负责/,
    /巡检([^\s,，。]+)/,
    /机器人/,
    /AGV/
  ],
  
  // 备注提取规则
  remark: [
    /备注[：:]\s*([^\s,，。]+)/,
    /说明[：:]\s*([^\s,，。]+)/,
    /描述[：:]\s*([^\s,，。]+)/,
    /原因[：:]\s*([^\s,，。]+)/,
    /目的[：:]\s*([^\s,，。]+)/
  ]
};

// 智能任务参数提取函数
function extractTaskParams(text) {
  const params = {};
  
  // 提取任务名称
  for (const rule of taskParamRules.taskName) {
    const match = text.match(rule);
    if (match) {
      params.taskName = match[1];
      break;
    }
  }
  
  // 提取起始位置
  for (const rule of taskParamRules.startPos) {
    const match = text.match(rule);
    if (match) {
      params.startPos = match[1];
      break;
    }
  }
  
  // 提取任务距离
  for (const rule of taskParamRules.taskTrip) {
    const match = text.match(rule);
    if (match) {
      params.taskTrip = parseInt(match[1]); // 返回数字
      break;
    }
  }
  
  // 提取执行人
  for (const rule of taskParamRules.executor) {
    const match = text.match(rule);
    if (match) {
      params.executor = match[1];
      break;
    }
  }
  
  // 提取备注
  for (const rule of taskParamRules.remark) {
    const match = text.match(rule);
    if (match) {
      params.remark = match[1];
      break;
    }
  }
  
  return params;
}

// 任务类型识别函数
function identifyTaskType(text) {
  const lowerText = text.toLowerCase();
  
  for (const [type, template] of Object.entries(taskTemplates)) {
    if (template.keywords.some(keyword => lowerText.includes(keyword))) {
      return {
        type,
        template,
        confidence: 0.8
      };
    }
  }
  
  // 默认返回隧道巡检任务（主要业务类型）
  return {
    type: 'tunnel_inspection',
    template: taskTemplates.tunnel_inspection,
    confidence: 0.5
  };
}

// 生成完整任务参数
function generateTaskParams(text) {
  const taskType = identifyTaskType(text);
  const extractedParams = extractTaskParams(text);
  
  // 合并默认参数和提取的参数
  const finalParams = {
    ...taskType.template.defaultParams,
    ...extractedParams
  };
  
  // 如果没有提取到任务名称，使用模板默认名称
  if (!finalParams.taskName || finalParams.taskName === taskType.template.defaultParams.taskName) {
    finalParams.taskName = taskType.template.name;
  }
  
  return {
    ...finalParams,
    taskType: taskType.type,
    confidence: taskType.confidence
  };
} 
