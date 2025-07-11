import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  getConfig,
  updateConfig,
  listTask,
  getTask,
  addTask,
  updateTask,
  delTask,
  startTask,
  endTask,
  heartbeat,
  agvForward,
  agvStop,
  agvBackward,
  getVideoStreamUrl,
  getAudioStreamUrl
} from '../taskmanagee.js'

// Mock axios with defaults property
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {
      timeout: 5000,
      headers: {
        common: {}
      }
    }
  }
}))

describe('taskmanagee.js - API接口测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('系统配置相关接口', () => {
    describe('getConfig()', () => {
      it('应该调用正确的API获取系统配置', async () => {
        const mockResponse = {
          code: 200,
          data: { host: '192.168.1.100', port: 8080 },
          msg: 'success'
        }
        axios.get.mockResolvedValueOnce(mockResponse)

        const result = await getConfig()

        expect(axios.get).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/config')
        expect(result).toEqual(mockResponse)
      })

      it('应该处理API调用失败的情况', async () => {
        const mockError = new Error('Network Error')
        axios.get.mockRejectedValueOnce(mockError)

        await expect(getConfig()).rejects.toThrow('Network Error')
      })
    })

    describe('updateConfig()', () => {
      it('应该正确发送配置更新请求', async () => {
        const configData = { host: '192.168.1.200', port: 9090 }
        const mockResponse = { code: 200, msg: 'success' }
        axios.put.mockResolvedValueOnce(mockResponse)

        const result = await updateConfig(configData)

        expect(axios.put).toHaveBeenCalledWith(
          'http://192.168.2.57/prod-api/agv/config',
          configData
        )
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('任务管理相关接口', () => {
    describe('listTask()', () => {
      it('应该正确传递查询参数获取任务列表', async () => {
        const params = { page: 1, size: 10, status: 'active' }
        const mockResponse = {
          code: 200,
          data: { records: [], total: 0 },
          msg: 'success'
        }
        axios.get.mockResolvedValueOnce(mockResponse)

        const result = await listTask(params)

        expect(axios.get).toHaveBeenCalledWith(
          'http://192.168.2.57/prod-api/agv/task/list',
          { params }
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('getTask()', () => {
      it('应该使用正确的任务ID获取任务详情', async () => {
        const taskId = 123
        const mockResponse = {
          code: 200,
          data: { id: 123, name: 'Test Task' },
          msg: 'success'
        }
        axios.get.mockResolvedValueOnce(mockResponse)

        const result = await getTask(taskId)

        expect(axios.get).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/task/123')
        expect(result).toEqual(mockResponse)
      })
    })

    describe('addTask()', () => {
      it('应该正确创建新任务', async () => {
        const taskData = { name: 'New Task', type: 'inspection' }
        const mockResponse = { code: 200, data: { id: 456 }, msg: 'success' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await addTask(taskData)

        expect(axios.post).toHaveBeenCalledWith(
          'http://192.168.2.57/prod-api/agv/task',
          taskData
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('updateTask()', () => {
      it('应该正确更新任务信息', async () => {
        const taskData = { id: 123, name: 'Updated Task' }
        const mockResponse = { code: 200, msg: 'success' }
        axios.put.mockResolvedValueOnce(mockResponse)

        const result = await updateTask(taskData)

        expect(axios.put).toHaveBeenCalledWith(
          'http://192.168.2.57/prod-api/agv/task',
          taskData
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('delTask()', () => {
      it('应该正确删除指定任务', async () => {
        const taskId = 123
        const mockResponse = { code: 200, msg: 'success' }
        axios.delete.mockResolvedValueOnce(mockResponse)

        const result = await delTask(taskId)

        expect(axios.delete).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/task/123')
        expect(result).toEqual(mockResponse)
      })
    })

    describe('startTask()', () => {
      it('应该正确启动指定任务', async () => {
        const taskId = 123
        const mockResponse = { code: 200, msg: 'task started' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await startTask(taskId)

        expect(axios.post).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/task/start/123')
        expect(result).toEqual(mockResponse)
      })
    })

    describe('endTask()', () => {
      it('应该正确结束任务（完成）', async () => {
        const taskId = 123
        const mockResponse = { code: 200, msg: 'task completed' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await endTask(taskId)

        expect(axios.post).toHaveBeenCalledWith(
          'http://192.168.2.57/prod-api/agv/task/end/123?isAbort=false'
        )
        expect(result).toEqual(mockResponse)
      })

      it('应该正确中止任务', async () => {
        const taskId = 123
        const mockResponse = { code: 200, msg: 'task aborted' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await endTask(taskId, true)

        expect(axios.post).toHaveBeenCalledWith(
          'http://192.168.2.57/prod-api/agv/task/end/123?isAbort=true'
        )
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('AGV移动控制相关接口', () => {
    describe('heartbeat()', () => {
      it('应该正确获取AGV心跳状态', async () => {
        const mockResponse = {
          code: 200,
          data: { status: 'online', position: 100.5 },
          msg: 'success'
        }
        axios.get.mockResolvedValueOnce(mockResponse)

        const result = await heartbeat()

        expect(axios.get).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/movement/heartbeat')
        expect(result).toEqual(mockResponse)
      })
    })

    describe('AGV移动控制', () => {
      it('agvForward() 应该发送正确的前进指令', async () => {
        const mockResponse = { code: 200, msg: 'moving forward' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await agvForward()

        expect(axios.post).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/movement/forward')
        expect(result).toEqual(mockResponse)
      })

      it('agvStop() 应该发送正确的停止指令', async () => {
        const mockResponse = { code: 200, msg: 'stopped' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await agvStop()

        expect(axios.post).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/movement/stop')
        expect(result).toEqual(mockResponse)
      })

      it('agvBackward() 应该发送正确的后退指令', async () => {
        const mockResponse = { code: 200, msg: 'moving backward' }
        axios.post.mockResolvedValueOnce(mockResponse)

        const result = await agvBackward()

        expect(axios.post).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/movement/backward')
        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('流媒体相关接口', () => {
    describe('getVideoStreamUrl()', () => {
      it('应该返回正确的视频流地址', () => {
        const channel = 1
        const expectedUrl = 'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=1&type=play'

        const result = getVideoStreamUrl(channel)

        expect(result).toBe(expectedUrl)
      })

      it('应该处理不同的通道号', () => {
        expect(getVideoStreamUrl(2)).toBe(
          'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=2&type=play'
        )
        expect(getVideoStreamUrl(3)).toBe(
          'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=3&type=play'
        )
        expect(getVideoStreamUrl(4)).toBe(
          'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=4&type=play'
        )
      })
    })

    describe('getAudioStreamUrl()', () => {
      it('应该返回正确的音频流地址', () => {
        const expectedUrl = 'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=5&type=play'

        const result = getAudioStreamUrl()

        expect(result).toBe(expectedUrl)
      })
    })
  })

  describe('边界条件和错误处理', () => {
    it('应该处理网络超时错误', async () => {
      const timeoutError = new Error('timeout')
      axios.get.mockRejectedValueOnce(timeoutError)

      await expect(heartbeat()).rejects.toThrow('timeout')
    })

    it('应该处理服务器错误响应', async () => {
      const serverError = {
        response: { status: 500, data: { msg: 'Internal Server Error' } }
      }
      axios.post.mockRejectedValueOnce(serverError)

      await expect(agvForward()).rejects.toEqual(serverError)
    })

    it('应该正确处理endTask的默认参数', async () => {
      const taskId = 123
      axios.post.mockResolvedValueOnce({ code: 200 })

      await endTask(taskId) // 不传递 isAbort 参数

      expect(axios.post).toHaveBeenCalledWith(
        'http://192.168.2.57/prod-api/agv/task/end/123?isAbort=false'
      )
    })
  })

  describe('参数验证测试', () => {
    it('getTask() 应该正确处理数字和字符串ID', async () => {
      axios.get.mockResolvedValue({ code: 200 })

      await getTask(123)
      expect(axios.get).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/task/123')

      await getTask('456')
      expect(axios.get).toHaveBeenCalledWith('http://192.168.2.57/prod-api/agv/task/456')
    })

    it('getVideoStreamUrl() 应该正确处理不同类型的通道参数', () => {
      expect(getVideoStreamUrl('1')).toBe(
        'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=1&type=play'
      )
      expect(getVideoStreamUrl(2)).toBe(
        'http://192.168.2.57/webrtc-api/index/api/webrtc?app=live&stream=2&type=play'
      )
    })
  })
}) 