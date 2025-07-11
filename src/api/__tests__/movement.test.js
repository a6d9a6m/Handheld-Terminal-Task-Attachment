import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  heartbeat,
  agvForward,
  agvStop,
  agvBackward
} from '../movement.js'

// Mock axios
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

describe('movement.js - AGV移动控制API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('heartbeat()', () => {
    it('应该正确获取AGV心跳状态', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'online',
          position: { x: 100.5, y: 200.3, theta: 1.57 },
          battery: 85,
          speed: 0,
          lastUpdate: '2024-01-01T12:00:00Z'
        },
        msg: 'AGV在线'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await heartbeat()

      expect(axios.get).toHaveBeenCalledWith('/api/agv/movement/heartbeat')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理AGV离线状态', async () => {
      const mockResponse = {
        code: 503,
        data: { 
          status: 'offline',
          lastSeen: '2024-01-01T10:00:00Z'
        },
        msg: 'AGV离线'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await heartbeat()

      expect(result.code).toBe(503)
      expect(result.data.status).toBe('offline')
    })

    it('应该处理心跳检测错误', async () => {
      const mockError = {
        response: {
          status: 408,
          data: { msg: 'AGV心跳超时' }
        }
      }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(heartbeat()).rejects.toEqual(mockError)
    })

    it('应该处理网络连接错误', async () => {
      const networkError = new Error('ECONNREFUSED')
      axios.get.mockRejectedValueOnce(networkError)

      await expect(heartbeat()).rejects.toThrow('ECONNREFUSED')
    })
  })

  describe('agvForward()', () => {
    it('应该发送正确的前进指令', async () => {
      const mockResponse = { 
        code: 200, 
        data: { 
          command: 'forward',
          speed: 1.0,
          timestamp: '2024-01-01T12:00:00Z'
        },
        msg: '前进指令已执行' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvForward()

      expect(axios.post).toHaveBeenCalledWith('/api/agv/movement/forward')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理AGV繁忙状态', async () => {
      const mockResponse = {
        code: 409,
        data: { 
          status: 'busy',
          currentCommand: 'turning'
        },
        msg: 'AGV正在执行其他指令'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvForward()

      expect(result.code).toBe(409)
      expect(result.data.status).toBe('busy')
    })

    it('应该处理前进指令失败', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { msg: 'AGV驱动系统故障' }
        }
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(agvForward()).rejects.toEqual(mockError)
    })

    it('应该处理AGV离线时的前进指令', async () => {
      const mockResponse = {
        code: 503,
        data: { status: 'offline' },
        msg: 'AGV离线，无法执行指令'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvForward()

      expect(result.code).toBe(503)
      expect(result.data.status).toBe('offline')
    })
  })

  describe('agvStop()', () => {
    it('应该发送正确的停止指令', async () => {
      const mockResponse = { 
        code: 200, 
        data: { 
          command: 'stop',
          previousSpeed: 1.5,
          timestamp: '2024-01-01T12:00:00Z'
        },
        msg: '停止指令已执行' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvStop()

      expect(axios.post).toHaveBeenCalledWith('/api/agv/movement/stop')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理紧急停止', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          command: 'emergency_stop',
          reason: 'obstacle_detected',
          timestamp: '2024-01-01T12:00:00Z'
        },
        msg: '紧急停止已执行'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvStop()

      expect(result.data.command).toBe('emergency_stop')
      expect(result.data.reason).toBe('obstacle_detected')
    })

    it('应该处理已经停止的AGV', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'already_stopped',
          speed: 0
        },
        msg: 'AGV已经处于停止状态'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvStop()

      expect(result.data.status).toBe('already_stopped')
      expect(result.data.speed).toBe(0)
    })

    it('应该处理停止指令失败', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { msg: '制动系统故障' }
        }
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(agvStop()).rejects.toEqual(mockError)
    })
  })

  describe('agvBackward()', () => {
    it('应该发送正确的后退指令', async () => {
      const mockResponse = { 
        code: 200, 
        data: { 
          command: 'backward',
          speed: -1.0,
          timestamp: '2024-01-01T12:00:00Z'
        },
        msg: '后退指令已执行' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvBackward()

      expect(axios.post).toHaveBeenCalledWith('/api/agv/movement/backward')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理后退障碍检测', async () => {
      const mockResponse = {
        code: 400,
        data: { 
          status: 'blocked',
          obstacle: 'wall_detected',
          distance: 0.5
        },
        msg: '后方检测到障碍物'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvBackward()

      expect(result.code).toBe(400)
      expect(result.data.status).toBe('blocked')
      expect(result.data.obstacle).toBe('wall_detected')
    })

    it('应该处理后退空间不足', async () => {
      const mockResponse = {
        code: 400,
        data: { 
          status: 'insufficient_space',
          availableSpace: 0.2,
          requiredSpace: 0.5
        },
        msg: '后退空间不足'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await agvBackward()

      expect(result.data.status).toBe('insufficient_space')
      expect(result.data.availableSpace).toBe(0.2)
    })

    it('应该处理后退指令失败', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { msg: '后退驱动系统故障' }
        }
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(agvBackward()).rejects.toEqual(mockError)
    })
  })

  describe('综合移动控制测试', () => {
    it('应该能执行完整的移动序列', async () => {
      const heartbeatResponse = { code: 200, data: { status: 'online' } }
      const forwardResponse = { code: 200, data: { command: 'forward' } }
      const stopResponse = { code: 200, data: { command: 'stop' } }
      const backwardResponse = { code: 200, data: { command: 'backward' } }

      axios.get.mockResolvedValueOnce(heartbeatResponse)
      axios.post
        .mockResolvedValueOnce(forwardResponse)
        .mockResolvedValueOnce(stopResponse)
        .mockResolvedValueOnce(backwardResponse)

      // 执行移动序列：检查状态 -> 前进 -> 停止 -> 后退
      const status = await heartbeat()
      const forward = await agvForward()
      const stop = await agvStop()
      const backward = await agvBackward()

      expect(status.data.status).toBe('online')
      expect(forward.data.command).toBe('forward')
      expect(stop.data.command).toBe('stop')
      expect(backward.data.command).toBe('backward')

      expect(axios.get).toHaveBeenCalledTimes(1)
      expect(axios.post).toHaveBeenCalledTimes(3)
    })

    it('应该处理移动过程中的错误恢复', async () => {
      const heartbeatSuccess = { code: 200, data: { status: 'online' } }
      const forwardError = { response: { status: 500 } }
      const stopSuccess = { code: 200, data: { command: 'emergency_stop' } }

      axios.get.mockResolvedValueOnce(heartbeatSuccess)
      axios.post
        .mockRejectedValueOnce(forwardError)
        .mockResolvedValueOnce(stopSuccess)

      const status = await heartbeat()
      expect(status.data.status).toBe('online')

      await expect(agvForward()).rejects.toEqual(forwardError)

      // 发生错误后执行紧急停止
      const emergencyStop = await agvStop()
      expect(emergencyStop.data.command).toBe('emergency_stop')
    })
  })

  describe('边界条件和错误处理', () => {
    it('应该处理空响应数据', async () => {
      const emptyResponse = { code: 200, data: null }
      axios.get.mockResolvedValueOnce(emptyResponse)

      const result = await heartbeat()

      expect(result.data).toBeNull()
    })

    it('应该处理响应格式异常', async () => {
      const malformedResponse = { unexpectedField: 'value' }
      axios.post.mockResolvedValueOnce(malformedResponse)

      const result = await agvForward()

      expect(result).toEqual(malformedResponse)
    })

    it('应该处理并发指令冲突', async () => {
      const conflictError = {
        response: {
          status: 409,
          data: { msg: '指令冲突，请等待当前指令完成' }
        }
      }

      axios.post.mockRejectedValueOnce(conflictError)

      await expect(agvForward()).rejects.toEqual(conflictError)
    })

    it('应该处理超时错误', async () => {
      const timeoutError = new Error('timeout')
      axios.post.mockRejectedValueOnce(timeoutError)

      await expect(agvStop()).rejects.toThrow('timeout')
    })
  })

  describe('API端点验证', () => {
    it('应该调用正确的API端点', async () => {
      const mockResponse = { code: 200 }
      axios.get.mockResolvedValue(mockResponse)
      axios.post.mockResolvedValue(mockResponse)

      await heartbeat()
      await agvForward()
      await agvStop()
      await agvBackward()

      expect(axios.get).toHaveBeenCalledWith('/api/agv/movement/heartbeat')
      expect(axios.post).toHaveBeenCalledWith('/api/agv/movement/forward')
      expect(axios.post).toHaveBeenCalledWith('/api/agv/movement/stop')
      expect(axios.post).toHaveBeenCalledWith('/api/agv/movement/backward')
    })
  })
}) 