import Mock from 'mockjs';

console.log('agvMock loaded')

const tasks = [
  {
    id: 1,
    taskCode: 'TASK0001',
    taskName: '任务1',
    startPos: 'A',
    taskTrip: '1000米',
    creator: 'admin',
    executor: 'user1',
    execTime: '2025-06-25 10:00',
    endTime: '2025-06-25 10:30',
    createTime: '2025-06-24 09:00',
    taskStatus: '已完成',
    round: 1,
    uploaded: true,
    remark: '',
    cloudTaskId: 10001,
    deleteFlag: false,
  },
  {
    id: 2,
    taskCode: 'TASK0002',
    taskName: '任务2',
    startPos: 'B',
    taskTrip: '800米',
    creator: 'admin',
    executor: 'user2',
    execTime: '2025-06-26 11:00',
    endTime: '2025-06-26 12:00',
    createTime: '2025-06-25 10:00',
    taskStatus: '巡视中',
    round: 1,
    uploaded: false,
    remark: '',
    cloudTaskId: 10002,
    deleteFlag: false,
  },
];

const flaws = [
  {
    id: 101,
    taskId: 1,
    round: 1,
    flawType: '结构缺陷',
    flawName: '裂缝',
    flawDesc: '隧道侧壁裂缝约20cm',
    flawDistance: 100.2,
    flawImage: '/images/flaw1.jpg',
    flawImageUrl: 'https://dummyimage.com/400x200/000/fff&text=裂缝',
    flawRtsp: '',
    shown: false,
    confirmed: true,
    uploaded: true,
    createTime: '2025-06-24 09:30',
    remark: '',
    flawLength: 20.0,
    flawArea: 15.5,
    level: '中',
    countNum: 1,
    deleteFlag: false,
  },
  {
    id: 102,
    taskId: 1,
    round: 1,
    flawType: '渗漏问题',
    flawName: '渗水点',
    flawDesc: '轨道旁电缆沟潮湿',
    flawDistance: 220.5,
    flawImage: '/images/flaw2.jpg',
    flawImageUrl: 'https://dummyimage.com/400x200/444/fff&text=渗水点',
    flawRtsp: '',
    shown: false,
    confirmed: null,
    uploaded: false,
    createTime: '2025-06-24 10:00',
    remark: '',
    flawLength: 10.5,
    flawArea: 8.2,
    level: '低',
    countNum: 1,
    deleteFlag: false,
  },
];

// helper: 查找 task id 对应任务
function findTaskById(id) {
  return tasks.find(t => t.id === Number(id));
}

// helper: 查找 flaw id
function findFlawById(id) {
  return flaws.find(f => f.id === Number(id));
}

export default [
  // 任务列表
  {
    url: '/api/agv/task/list',
    method: 'get',
    response: ({ query }) => {
      // 兼容 pageNum 和 page
      const page = Number(query.pageNum || query.page) || 1;
      const pageSize = Number(query.pageSize) || 10;
      const data = tasks.slice((page - 1) * pageSize, page * pageSize);
      return {
        code: 200,
        msg: '成功',
        rows: data, // 注意这里应该是 rows
        total: tasks.length,
      };
    },
  },

  // 获取任务详情
  {
    url: /\/api\/agv\/task\/\d+/,
    method: 'get',
    response: ({ url }) => {
      const id = url.split('/').pop();
      const task = findTaskById(id);
      if (!task) {
        return { code: 404, msg: '任务不存在' };
      }
      return { code: 200, msg: '成功', data: task };
    },
  },

  // 新增任务
  {
    url: '/api/agv/task',
    method: 'post',
    response: ({ body }) => {
      const newTask = { id: tasks.length + 1, ...body };
      tasks.push(newTask);
      return { code: 200, msg: '新增成功', data: newTask };
    },
  },

  // 更新任务
  {
    url: '/api/agv/task',
    method: 'put',
    response: ({ body }) => {
      const idx = tasks.findIndex(t => t.id === body.id);
      if (idx === -1) return { code: 404, msg: '任务不存在' };
      tasks[idx] = { ...tasks[idx], ...body };
      return { code: 200, msg: '更新成功', data: tasks[idx] };
    },
  },

  // 删除任务
  {
    url: /\/api\/agv\/task\/\d+/,
    method: 'delete',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) return { code: 404, msg: '任务不存在' };
      tasks.splice(idx, 1);
      return { code: 200, msg: '删除成功' };
    },
  },

  // 启动任务
  {
    url: /\/api\/agv\/task\/start\/\d+/,
    method: 'post',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const task = findTaskById(id);
      if (!task) return { code: 404, msg: '任务不存在' };
      task.taskStatus = '巡视中';
      return { code: 200, msg: '任务已启动', data: task };
    },
  },

  // 结束任务
  {
    url: /\/api\/agv\/task\/end\/\d+/,
    method: 'post',
    response: ({ url, query }) => {
      const id = Number(url.split('/').pop());
      const isAbort = query.isAbort === 'true';
      const task = findTaskById(id);
      if (!task) return { code: 404, msg: '任务不存在' };
      task.taskStatus = isAbort ? '已中止' : '已完成';
      task.endTime = new Date().toISOString();
      return { code: 200, msg: '任务已结束', data: task };
    },
  },

  // 查询待上传数据
  {
    url: /\/api\/agv\/task\/preupload\/\d+/,
    method: 'get',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const task = findTaskById(id);
      if (!task) return { code: 404, msg: '任务不存在' };
      // 这里只模拟
      return { code: 200, msg: '待上传数据', data: { taskId: id, files: [] } };
    },
  },

  // 上传任务数据
  {
    url: /\/api\/agv\/task\/upload\/\d+/,
    method: 'post',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const task = findTaskById(id);
      if (!task) return { code: 404, msg: '任务不存在' };
      task.uploaded = true;
      return { code: 200, msg: '上传成功', data: task };
    },
  },

  // 缺陷列表
  {
    url: '/api/agv/flaw/list',
    method: 'get',
    response: ({ query }) => {
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 10;
      // 可加过滤条件...
      const data = flaws.slice((page - 1) * pageSize, page * pageSize);
      return {
        code: 200,
        msg: '成功',
        data,
        total: flaws.length,
      };
    },
  },

  // 获取缺陷详情
  {
    url: /\/api\/agv\/flaw\/\d+/,
    method: 'get',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const flaw = findFlawById(id);
      if (!flaw) return { code: 404, msg: '缺陷不存在' };
      return { code: 200, msg: '成功', data: flaw };
    },
  },

  // 新增缺陷
  {
    url: '/api/agv/flaw',
    method: 'post',
    response: ({ body }) => {
      const newFlaw = { id: flaws.length + 101, ...body };
      flaws.push(newFlaw);
      return { code: 200, msg: '新增成功', data: newFlaw };
    },
  },

  // 更新缺陷
  {
    url: '/api/agv/flaw',
    method: 'put',
    response: ({ body }) => {
      const idx = flaws.findIndex(f => f.id === body.id);
      if (idx === -1) return { code: 404, msg: '缺陷不存在' };
      flaws[idx] = { ...flaws[idx], ...body };
      return { code: 200, msg: '更新成功', data: flaws[idx] };
    },
  },

  // 删除缺陷
  {
    url: /\/api\/agv\/flaw\/\d+/,
    method: 'delete',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const idx = flaws.findIndex(f => f.id === id);
      if (idx === -1) return { code: 404, msg: '缺陷不存在' };
      flaws.splice(idx, 1);
      return { code: 200, msg: '删除成功' };
    },
  },

  // 轮询获取任务实时缺陷信息（模拟）
  {
    url: /\/api\/agv\/flaw\/live\/\d+/,
    method: 'get',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const liveFlaws = flaws.filter(f => f.taskId === id);
      return { code: 200, msg: '成功', data: liveFlaws };
    },
  },

  // 检查所有缺陷是否已确认
  {
    url: /\/api\/agv\/flaw\/check\/\d+/,
    method: 'get',
    response: ({ url }) => {
      const id = Number(url.split('/').pop());
      const taskFlaws = flaws.filter(f => f.taskId === id);
      const allConfirmed = taskFlaws.every(f => f.confirmed === true);
      return { code: 200, msg: '成功', data: allConfirmed };
    },
  },
];
