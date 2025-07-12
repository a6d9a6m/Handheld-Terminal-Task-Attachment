import axios from '../utils/request';
const baseUrl = '/api/agv/taskmanagee';
// API 服务配置

const API_BASE_URL = '/api';
const WEBRTC_BASE_URL = '/webrtc-api';

// 配置axios默认设置
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// ==================== 系统配置相关接口 ====================

/**
 * 获取系统配置
 * @returns {Promise}
 */
export function getConfig() {
    return axios.get(`${API_BASE_URL}/agv/config`);
}

/**
 * 更新系统配置
 * @param {object} config - 配置数据对象，结构需符合 AgvConfig 实体
 * @returns {Promise}
 */
export function updateConfig(config) {
    return axios.put(`${API_BASE_URL}/agv/config`, config);
}

// ==================== 故障缺陷管理相关接口 ====================

/**
 * 获取缺陷列表
 * @param {object} params - 查询参数：过滤条件、分页信息
 * @returns {Promise}
 */
export function listFlaw(params) {
    return axios.get(`${API_BASE_URL}/agv/flaw/list`, { params });
}

/**
 * 获取缺陷详情
 * @param {number} id - 缺陷ID
 * @returns {Promise}
 */
export function getFlaw(id) {
    return axios.get(`${API_BASE_URL}/agv/flaw/${id}`);
}

/**
 * 新增缺陷
 * @param {object} flaw - 缺陷对象
 * @returns {Promise}
 */
export function addFlaw(flaw) {
    return axios.post(`${API_BASE_URL}/agv/flaw`, flaw);
}

/**
 * 更新缺陷
 * @param {object} flaw - 缺陷对象
 * @returns {Promise}
 */
export function updateFlaw(flaw) {
    return axios.put(`${API_BASE_URL}/agv/flaw`, flaw);
}

/**
 * 删除缺陷
 * @param {number} id - 缺陷ID
 * @returns {Promise}
 */
export function delFlaw(id) {
    return axios.delete(`${API_BASE_URL}/agv/flaw/${id}`);
}

/**
 * 轮询获取任务实时缺陷信息
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function liveInfo(id) {
    return axios.get(`${API_BASE_URL}/agv/flaw/live/${id}`);
}

/**
 * 检查任务缺陷是否已全部确认
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function checkAllConfirmed(id) {
    return axios.get(`${API_BASE_URL}/agv/flaw/check/${id}`);
}

// ==================== AGV移动控制相关接口 ====================

/**
 * 查询AGV心跳状态
 * @returns {Promise}
 */
export function heartbeat() {
    return axios.get(`${API_BASE_URL}/agv/movement/heartbeat`);
}

/**
 * 控制AGV向前移动
 * @returns {Promise}
 */
export function agvForward() {
    return axios.post(`${API_BASE_URL}/agv/movement/forward`);
}

/**
 * 停止AGV
 * @returns {Promise}
 */
export function agvStop() {
    return axios.post(`${API_BASE_URL}/agv/movement/stop`);
}

/**
 * 控制AGV向后移动
 * @returns {Promise}
 */
export function agvBackward() {
    return axios.post(`${API_BASE_URL}/agv/movement/backward`);
}



// ==================== 巡视任务管理相关接口 ====================

/**
 * 获取任务列表
 * @param {object} params - 查询参数：过滤条件、分页信息
 * @returns {Promise}
 */
export function listTask(params) {
    return axios.get(`${API_BASE_URL}/agv/task/list`, { params });
}

/**
 * 获取任务详情
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function getTask(id) {
    return axios.get(`${API_BASE_URL}/agv/task/${id}`);
}

/**
 * 新建任务
 * @param {object} task - 任务对象
 * @returns {Promise}
 */
export function addTask(task) {
    return axios.post(`${API_BASE_URL}/agv/task`, task);
}

/**
 * 更新任务
 * @param {object} task - 任务对象
 * @returns {Promise}
 */
export function updateTask(task) {
    return axios.put(`${API_BASE_URL}/agv/task`, task);
}

/**
 * 删除任务
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function delTask(id) {
    return axios.delete(`${API_BASE_URL}/agv/task/${id}`);
}

/**
 * 启动任务
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function startTask(id) {
    return axios.post(`${API_BASE_URL}/agv/task/start/${id}`);
}

/**
 * 结束任务（完成或中止）
 * @param {number} id - 任务ID
 * @param {boolean} isAbort - 是否中止
 * @returns {Promise}
 */
export function endTask(id, isAbort = false) {
    return axios.post(`${API_BASE_URL}/agv/task/end/${id}?isAbort=${isAbort}`);
}

/**
 * 查询待上传的数据
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function preUploadTask(id) {
    return axios.get(`${API_BASE_URL}/agv/task/preupload/${id}`);
}

/**
 * 上传任务数据
 * @param {number} id - 任务ID
 * @returns {Promise}
 */
export function uploadTask(id) {
    return axios.post(`${API_BASE_URL}/agv/task/upload/${id}`);
}

// ==================== 流媒体相关 ====================

/**
 * 获取视频流地址
 * @param {number} channel - 通道号(1-4)
 * @returns {string}
 */
export function getVideoStreamUrl(channel) {
    return `${WEBRTC_BASE_URL}/index/api/webrtc?app=live&stream=${channel}&type=play`;
}

/**
 * 获取音频流地址
 * @returns {string}
 */
export function getAudioStreamUrl() {
    return `${WEBRTC_BASE_URL}/index/api/webrtc?app=live&stream=5&type=play`;
}


// // ==================== 响应拦截器 ====================

// // 添加响应拦截器
// axios.interceptors.response.use(
//     response => {
//         // 对响应数据做点什么
//         return response.data;
//     },
//     error => {
//         // 对响应错误做点什么
//         console.error('API请求错误:', error);
//         return Promise.reject(error);
//     }
// );

// // 添加请求拦截器
// axios.interceptors.request.use(
//     config => {
//         // 在发送请求之前做些什么
//         console.log('发送API请求:', config.method?.toUpperCase(), config.url);
//         return config;
//     },
//     error => {
//         // 对请求错误做点什么
//         return Promise.reject(error);
//     }
// );