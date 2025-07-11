import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  checkFs,
  checkDb,
  checkAgv,
  checkCam
} from '../init.js'

// Mock axios
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('init.js - 系统检查API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkFs()', () => {
    it('应该检查文件系统可用性', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'available',
          freeSpace: '50GB',
          totalSpace: '100GB'
        },
        msg: '文件系统正常'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkFs()

      expect(axios.get).toHaveBeenCalledWith('/api/system/check/fs')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理文件系统错误', async () => {
      const mockError = {
        response: {
          status: 503,
          data: { msg: '文件系统不可用' }
        }
      }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(checkFs()).rejects.toEqual(mockError)
    })

    it('应该处理网络超时', async () => {
      const timeoutError = new Error('timeout')
      axios.get.mockRejectedValueOnce(timeoutError)

      await expect(checkFs()).rejects.toThrow('timeout')
    })
  })

  describe('checkDb()', () => {
    it('应该检查数据库连接状态', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'connected',
          host: 'localhost',
          port: 3306,
          database: 'agv_system'
        },
        msg: '数据库连接正常'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkDb()

      expect(axios.get).toHaveBeenCalledWith('/api/system/check/db')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理数据库连接失败', async () => {
      const mockResponse = {
        code: 500,
        data: { 
          status: 'disconnected',
          error: 'Connection refused'
        },
        msg: '数据库连接失败'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkDb()

      expect(result.code).toBe(500)
      expect(result.data.status).toBe('disconnected')
    })

    it('应该处理数据库网络错误', async () => {
      const networkError = new Error('ECONNREFUSED')
      axios.get.mockRejectedValueOnce(networkError)

      await expect(checkDb()).rejects.toThrow('ECONNREFUSED')
    })
  })

  describe('checkAgv()', () => {
    it('应该检查AGV连接状态', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'online',
          position: { x: 100.5, y: 200.3 },
          battery: 85,
          lastHeartbeat: '2024-01-01T12:00:00Z'
        },
        msg: 'AGV在线'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAgv()

      expect(axios.get).toHaveBeenCalledWith('/api/system/check/agv')
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

      const result = await checkAgv()

      expect(result.code).toBe(503)
      expect(result.data.status).toBe('offline')
    })

    it('应该处理AGV通信错误', async () => {
      const communicationError = {
        response: {
          status: 408,
          data: { msg: 'AGV通信超时' }
        }
      }
      axios.get.mockRejectedValueOnce(communicationError)

      await expect(checkAgv()).rejects.toEqual(communicationError)
    })

    it('应该处理AGV数据异常', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'online',
          position: null, // 位置数据异常
          battery: -1,    // 电量数据异常
          error: 'sensor malfunction'
        },
        msg: 'AGV传感器故障'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAgv()

      expect(result.data.error).toBe('sensor malfunction')
      expect(result.data.battery).toBe(-1)
    })
  })

  describe('checkCam()', () => {
    it('应该检查摄像头连接状态', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          cameras: [
            { id: 'cam1', status: 'online', quality: 'HD' },
            { id: 'cam2', status: 'online', quality: 'HD' },
            { id: 'cam3', status: 'online', quality: 'HD' },
            { id: 'cam4', status: 'online', quality: 'HD' }
          ],
          totalCameras: 4,
          onlineCameras: 4
        },
        msg: '所有摄像头在线'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkCam()

      expect(axios.get).toHaveBeenCalledWith('/api/system/check/cam')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理部分摄像头离线', async () => {
      const mockResponse = {
        code: 206,
        data: { 
          cameras: [
            { id: 'cam1', status: 'online', quality: 'HD' },
            { id: 'cam2', status: 'offline', error: 'connection lost' },
            { id: 'cam3', status: 'online', quality: 'HD' },
            { id: 'cam4', status: 'degraded', quality: 'SD' }
          ],
          totalCameras: 4,
          onlineCameras: 2
        },
        msg: '部分摄像头异常'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkCam()

      expect(result.code).toBe(206)
      expect(result.data.onlineCameras).toBe(2)
    })

    it('应该处理所有摄像头离线', async () => {
      const mockResponse = {
        code: 503,
        data: { 
          cameras: [],
          totalCameras: 0,
          onlineCameras: 0,
          error: 'camera service unavailable'
        },
        msg: '摄像头服务不可用'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkCam()

      expect(result.code).toBe(503)
      expect(result.data.onlineCameras).toBe(0)
    })

    it('应该处理摄像头服务器错误', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { msg: '摄像头服务器内部错误' }
        }
      }
      axios.get.mockRejectedValueOnce(serverError)

      await expect(checkCam()).rejects.toEqual(serverError)
    })
  })

  describe('综合测试场景', () => {
    it('应该能同时执行多个系统检查', async () => {
      const mockResponses = {
        fs: { code: 200, data: { status: 'available' } },
        db: { code: 200, data: { status: 'connected' } },
        agv: { code: 200, data: { status: 'online' } },
        cam: { code: 200, data: { onlineCameras: 4 } }
      }

      axios.get
        .mockResolvedValueOnce(mockResponses.fs)
        .mockResolvedValueOnce(mockResponses.db)
        .mockResolvedValueOnce(mockResponses.agv)
        .mockResolvedValueOnce(mockResponses.cam)

      const results = await Promise.all([
        checkFs(),
        checkDb(),
        checkAgv(),
        checkCam()
      ])

      expect(results[0]).toEqual(mockResponses.fs)
      expect(results[1]).toEqual(mockResponses.db)
      expect(results[2]).toEqual(mockResponses.agv)
      expect(results[3]).toEqual(mockResponses.cam)

      expect(axios.get).toHaveBeenCalledTimes(4)
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/fs')
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/db')
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/agv')
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/cam')
    })

    it('应该处理混合的成功和失败情况', async () => {
      const fsSuccess = { code: 200, data: { status: 'available' } }
      const dbError = new Error('Database connection failed')
      const agvSuccess = { code: 200, data: { status: 'online' } }
      const camError = { response: { status: 503 } }

      axios.get
        .mockResolvedValueOnce(fsSuccess)
        .mockRejectedValueOnce(dbError)
        .mockResolvedValueOnce(agvSuccess)
        .mockRejectedValueOnce(camError)

      const results = await Promise.allSettled([
        checkFs(),
        checkDb(),
        checkAgv(),
        checkCam()
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[0].value).toEqual(fsSuccess)
      expect(results[1].status).toBe('rejected')
      expect(results[1].reason).toEqual(dbError)
      expect(results[2].status).toBe('fulfilled')
      expect(results[2].value).toEqual(agvSuccess)
      expect(results[3].status).toBe('rejected')
      expect(results[3].reason).toEqual(camError)
    })
  })

  describe('错误处理和边界条件', () => {
    it('应该处理空响应数据', async () => {
      const emptyResponse = { code: 200, data: null, msg: '' }
      axios.get.mockResolvedValueOnce(emptyResponse)

      const result = await checkFs()

      expect(result.data).toBeNull()
    })

    it('应该处理响应格式异常', async () => {
      const malformedResponse = { unexpectedField: 'value' }
      axios.get.mockResolvedValueOnce(malformedResponse)

      const result = await checkDb()

      expect(result).toEqual(malformedResponse)
    })

    it('应该处理网络断开', async () => {
      const networkError = new Error('ERR_NETWORK')
      axios.get.mockRejectedValueOnce(networkError)

      await expect(checkAgv()).rejects.toThrow('ERR_NETWORK')
    })

    it('应该处理请求取消', async () => {
      const cancelError = { name: 'CanceledError', message: 'Request canceled' }
      axios.get.mockRejectedValueOnce(cancelError)

      await expect(checkCam()).rejects.toEqual(cancelError)
    })
  })
}) 