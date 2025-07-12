<template>
  <div 
    class="floating-chat" 
    :class="{ open }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="startDrag"
    ref="chatContainer"
  >
    <div class="chat-header" @click="toggleOpen" @dblclick="resetPosition">
      <span>智能助手</span>
      <span v-if="!open">💬</span>
      <span v-else>×</span>
    </div>
    <div v-if="open" class="chat-body">
      <div class="messages">
        <div v-for="(msg, i) in messages" :key="i" :class="msg.role">
          <div class="message-content">{{ msg.text }}</div>
          <div v-if="msg.taskPreview" class="task-preview">
            <div class="preview-title">任务预览：</div>
            <div class="preview-item">
              <span class="label">任务编号：</span>
              <span>{{ msg.taskPreview.taskCode }}</span>
            </div>
            <div class="preview-item">
              <span class="label">任务名称：</span>
              <span>{{ msg.taskPreview.taskName }}</span>
            </div>
            <div class="preview-item">
              <span class="label">起始位置：</span>
              <span>{{ msg.taskPreview.startPos }}</span>
            </div>
            <div class="preview-item">
              <span class="label">任务距离：</span>
              <span>{{ msg.taskPreview.taskTrip }}米</span>
            </div>
            <div class="preview-item">
              <span class="label">执行人：</span>
              <span>{{ msg.taskPreview.executor }}</span>
            </div>
            <div class="preview-item">
              <span class="label">任务状态：</span>
              <span class="status-badge" :style="{ color: getStatusColor(msg.taskPreview.taskStatus) }">
                {{ msg.taskPreview.taskStatus }}
              </span>
            </div>
            <div class="preview-item">
              <span class="label">创建时间：</span>
              <span>{{ msg.taskPreview.createTime }}</span>
            </div>
            <div class="preview-item">
              <span class="label">备注：</span>
              <span>{{ msg.taskPreview.remark }}</span>
            </div>
            <div class="preview-actions">
              <button @click="confirmCreateTask(msg.taskPreview)" class="confirm-btn">确认创建</button>
              <button @click="viewTaskDetail(msg.taskPreview)" class="view-btn">查看详情</button>
              <button @click="goToTaskManage" class="manage-btn">任务管理</button>
              <button @click="cancelTaskCreation(i)" class="cancel-btn">取消</button>
            </div>
          </div>
          <div v-if="msg.taskList" class="task-list">
            <div class="list-title">任务列表：</div>
            <div v-for="task in msg.taskList" :key="task.taskCode" class="task-item">
              <div class="task-code">{{ task.taskCode }}</div>
              <div class="task-name">{{ task.taskName }}</div>
              <div class="task-status" :style="{ color: getStatusColor(task.taskStatus) }">
                {{ task.taskStatus }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <form @submit.prevent="handleSend">
        <input v-model="input" placeholder="请输入任务描述或与AI对话..." />
        <button type="submit" :disabled="loading">发送</button>
      </form>
      <div v-if="loading" class="loading">模型思考中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { chatWithWasm } from '../api/mcpWasm';
import { listTask, addTask } from '../api/taskmanagee.js';

const router = useRouter();
const open = ref(false);
const input = ref('');
const messages = ref([]);
const loading = ref(false);

// 拖拽相关状态
const position = ref({ x: window.innerWidth - 420, y: window.innerHeight - 100 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const chatContainer = ref(null);

// 生成任务对象 - 使用现有系统的字段结构
function genTaskFromParams(params) {
  const now = new Date();
  const taskCode = 'AI' + now.getTime();
  
  return {
    taskName: params.taskName || 'AI智能助手任务',
    taskCode: taskCode,
    startPos: params.startPos || 'AI入口',
    taskTrip: parseInt(params.taskTrip) || 500, // 使用数字类型，符合现有系统
    creator: 'AI助手',
    executor: params.executor || '巡检机器人',
    remark: params.remark || 'AI自动创建',
    // 添加缺失的字段
    taskStatus: '待巡视', // 新创建的任务状态为待巡视
    createTime: now.toISOString().replace('T', ' ').substring(0, 19), // 创建时间
    execTime: '', // 执行时间（待巡视时为空）
    endTime: '', // 结束时间（待巡视时为空）
    round: 1, // 轮次
    uploaded: false, // 是否已上传
    cloudTaskId: null, // 云端任务ID
    deleteFlag: false // 删除标记
  };
}

function toggleOpen() {
  open.value = !open.value;
}

// 拖拽功能
function startDrag(event) {
  // 只有点击header才能拖拽
  if (!event.target.closest('.chat-header')) return;
  
  // 如果点击的是关闭按钮，不进行拖拽
  if (event.target.textContent === '×') return;
  
  isDragging.value = true;
  const rect = chatContainer.value.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  event.preventDefault();
}

function onDrag(event) {
  if (!isDragging.value) return;
  
  const newX = event.clientX - dragOffset.value.x;
  const newY = event.clientY - dragOffset.value.y;
  
  // 限制在窗口范围内
  const maxX = window.innerWidth - 380;
  const maxY = window.innerHeight - 100;
  
  position.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  };
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// 窗口大小改变时调整位置
function handleResize() {
  const maxX = window.innerWidth - 380;
  const maxY = window.innerHeight - 100;
  
  position.value = {
    x: Math.min(position.value.x, maxX),
    y: Math.min(position.value.y, maxY)
  };
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});

async function handleSend() {
  if (!input.value.trim()) return;
  
  const userInput = input.value;
  messages.value.push({ role: 'user', text: userInput });
  input.value = '';
  loading.value = true;
  
  try {
    const result = await chatWithWasm(userInput);
    console.log('AI分析结果:', result);
    
    // 添加AI回复
    messages.value.push({ 
      role: 'bot', 
      text: result.reply || '我理解了您的需求',
      taskPreview: null,
      taskList: null
    });
    
    // 根据意图处理不同的响应
    if (result.intent === '新建任务' && result.shouldCreateTask && result.params) {
      const task = genTaskFromParams(result.params);
      messages.value.push({
        role: 'bot',
        text: '我为您生成了任务，请确认信息：',
        taskPreview: task,
        taskList: null
      });
    } else if (result.intent === '查询任务') {
      // 查询任务列表 - 使用现有的API
      try {
        const taskResult = await listTask({ page: 1, size: 5 });
        if (taskResult && taskResult.data) {
          messages.value.push({
            role: 'bot',
            text: '以下是您的任务列表：',
            taskPreview: null,
            taskList: taskResult.data.slice(0, 5) // 只显示前5个任务
          });
        } else {
          messages.value.push({
            role: 'bot',
            text: '暂无任务数据',
            taskPreview: null,
            taskList: []
          });
        }
      } catch (error) {
        messages.value.push({
          role: 'bot',
          text: '查询任务列表失败，请稍后重试',
          taskPreview: null,
          taskList: null
        });
      }
    }
    
  } catch (e) {
    console.error('AI助手出错:', e);
    messages.value.push({ 
      role: 'bot', 
      text: '抱歉，AI助手暂时无法响应，请稍后重试',
      taskPreview: null,
      taskList: null
    });
  }
  
  loading.value = false;
}

async function confirmCreateTask(taskData) {
  try {
    // 使用现有的addTask API
    const result = await addTask(taskData);
    if (result && (result.code === 200 || result.success)) {
      // 获取创建后的任务ID
      const createdTask = result.data || taskData;
      const taskId = createdTask.id || createdTask.taskCode;
      
      messages.value.push({ 
        role: 'bot', 
        text: `✅ 任务创建成功！\n任务编号：${taskData.taskCode}\n任务名称：${taskData.taskName}\n状态：${taskData.taskStatus}\n创建时间：${taskData.createTime}`,
        taskPreview: null,
        taskList: null
      });
      
      // 添加查看详情的提示
      messages.value.push({
        role: 'bot',
        text: `您可以点击下方按钮查看任务详情，或前往任务管理页面查看所有任务。`,
        taskPreview: { ...createdTask, id: taskId },
        taskList: null
      });
    } else {
      messages.value.push({ 
        role: 'bot', 
        text: `❌ 任务创建失败：${result?.msg || '未知错误'}`,
        taskPreview: null,
        taskList: null
      });
    }
  } catch (e) {
    console.error('任务创建失败:', e);
    messages.value.push({ 
      role: 'bot', 
      text: '❌ 任务创建接口异常，请稍后重试',
      taskPreview: null,
      taskList: null
    });
  }
}

function cancelTaskCreation(messageIndex) {
  // 移除任务预览消息
  messages.value.splice(messageIndex, 1);
  messages.value.push({ 
    role: 'bot', 
    text: '已取消任务创建',
    taskPreview: null,
    taskList: null
  });
}

function viewTaskDetail(taskData) {
  // 跳转到任务详情页面
  router.push(`/task-detail/${taskData.id || taskData.taskCode}`);
}

function goToTaskManage() {
  router.push('/task-manage');
}

function getStatusColor(status) {
  const statusColors = {
    '待巡视': '#e6a23c',
    '巡视中': '#409eff',
    '待上传': '#909399',
    '已完成': '#67c23a',
    '已取消': '#f56c6c'
  };
  return statusColors[status] || '#909399';
}

function resetPosition() {
  position.value = { x: window.innerWidth - 420, y: window.innerHeight - 200 };
}
</script>

<style scoped>
.floating-chat {
  position: fixed;
  width: 380px;
  z-index: 9999;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  overflow: hidden;
  border: 1px solid #e1e5e9;
  user-select: none; /* 防止拖拽时选中文字 */
}

.floating-chat .chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 12px 16px;
  cursor: move; /* 显示拖拽光标 */
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.floating-chat .chat-header:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.floating-chat .chat-body {
  padding: 16px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.floating-chat .messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  max-height: 350px;
}

.floating-chat .user { 
  text-align: right; 
  margin-bottom: 8px;
}

.floating-chat .bot { 
  text-align: left; 
  margin-bottom: 8px;
}

.floating-chat .message-content {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 80%;
  word-wrap: break-word;
}

.floating-chat .user .message-content {
  background: #667eea;
  color: #fff;
}

.floating-chat .bot .message-content {
  background: #f5f5f5;
  color: #333;
}

.task-preview {
  margin-top: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.task-list {
  margin-top: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.preview-title, .list-title {
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  font-size: 13px;
}

.preview-item {
  display: flex;
  margin-bottom: 4px;
  font-size: 12px;
}

.preview-item .label {
  color: #6c757d;
  min-width: 70px;
  font-weight: 500;
}

.status-badge {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0,0,0,0.05);
  font-size: 11px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 12px;
}

.task-item:last-child {
  border-bottom: none;
}

.task-code {
  font-weight: 600;
  color: #495057;
  flex: 1;
}

.task-name {
  color: #6c757d;
  flex: 2;
  margin: 0 8px;
}

.task-status {
  font-weight: 500;
  flex: 1;
  text-align: right;
}

.preview-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.confirm-btn {
  background: #67c23a;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.view-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.manage-btn {
  background: #9c27b0;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.cancel-btn {
  background: #f56c6c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.confirm-btn:hover {
  background: #5daf34;
}

.view-btn:hover {
  background: #337ecc;
}

.manage-btn:hover {
  background: #7b1fa2;
}

.cancel-btn:hover {
  background: #e64242;
}

.floating-chat form {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.floating-chat input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.floating-chat input:focus {
  border-color: #667eea;
}

.floating-chat button {
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.floating-chat button:hover:not(:disabled) {
  background: #5a6fd8;
}

.floating-chat button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading {
  color: #6c757d;
  font-size: 13px;
  margin-top: 8px;
  text-align: center;
  font-style: italic;
}

/* 滚动条样式 */
.messages::-webkit-scrollbar {
  width: 4px;
}

.messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 