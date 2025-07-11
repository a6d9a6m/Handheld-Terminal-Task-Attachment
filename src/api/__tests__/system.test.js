import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  checkFs,
  checkDb,
  checkAgv,
  checkCam
} from '../system.js'

// Mock axios
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('system.js - 系统检查API测试', () => {
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
          totalSpace: '100GB',
          usage: '50%'
        },
        msg: '文件系统正常'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkFs()

      expect(axios.get).toHaveBeenCalledWith('/api/system/check/fs')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理文件系统空间不足', async () => {
      const mockResponse = {
        code: 400,
        data: { 
          status: 'low_space',
          freeSpace: '1GB',
          totalSpace: '100GB',
          usage: '99%',
          threshold: '95%'
        },
        msg: '文件系统空间不足'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkFs()

      expect(result.code).toBe(400)
      expect(result.data.status).toBe('low_space')
      expect(result.data.usage).toBe('99%')
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

    it('应该处理文件系统权限错误', async () => {
      const mockResponse = {
        code: 403,
        data: { 
          status: 'permission_denied',
          error: 'Insufficient permissions to access filesystem'
        },
        msg: '文件系统权限不足'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkFs()

      expect(result.code).toBe(403)
      expect(result.data.status).toBe('permission_denied')
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
          database: 'agv_system',
          connectionPool: {
            active: 5,
            idle: 10,
            max: 20
          },
          ping: '2ms'
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
          error: 'Connection refused',
          host: 'localhost',
          port: 3306,
          lastAttempt: '2024-01-01T12:00:00Z'
        },
        msg: '数据库连接失败'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkDb()

      expect(result.code).toBe(500)
      expect(result.data.status).toBe('disconnected')
      expect(result.data.error).toBe('Connection refused')
    })

    it('应该处理数据库超时', async () => {
      const mockResponse = {
        code: 408,
        data: { 
          status: 'timeout',
          timeout: '30s',
          host: 'localhost'
        },
        msg: '数据库连接超时'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkDb()

      expect(result.code).toBe(408)
      expect(result.data.status).toBe('timeout')
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
          position: { x: 100.5, y: 200.3, theta: 1.57 },
          battery: 85,
          speed: 0,
          lastHeartbeat: '2024-01-01T12:00:00Z',
          sensors: {
            lidar: 'online',
            camera: 'online',
            ultrasonic: 'online'
          }
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
          lastSeen: '2024-01-01T10:00:00Z',
          offlineDuration: '2h',
          reason: 'communication_lost'
        },
        msg: 'AGV离线'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAgv()

      expect(result.code).toBe(503)
      expect(result.data.status).toBe('offline')
      expect(result.data.reason).toBe('communication_lost')
    })

    it('应该处理AGV电量低警告', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          status: 'online',
          position: { x: 50.0, y: 75.5, theta: 0 },
          battery: 15,
          batteryStatus: 'low',
          estimatedRuntime: '30min',
          chargingRequired: true
        },
        msg: 'AGV电量低，需要充电'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAgv()

      expect(result.data.battery).toBe(15)
      expect(result.data.batteryStatus).toBe('low')
      expect(result.data.chargingRequired).toBe(true)
    })

    it('应该处理AGV传感器故障', async () => {
      const mockResponse = {
        code: 206,
        data: { 
          status: 'degraded',
          position: { x: 100.5, y: 200.3, theta: 1.57 },
          battery: 75,
          sensors: {
            lidar: 'offline',
            camera: 'online',
            ultrasonic: 'error'
          },
          warnings: ['激光雷达离线', '超声波传感器错误']
        },
        msg: 'AGV部分传感器故障'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAgv()

      expect(result.code).toBe(206)
      expect(result.data.status).toBe('degraded')
      expect(result.data.sensors.lidar).toBe('offline')
      expect(result.data.warnings).toHaveLength(2)
    })
  })

  describe('checkCam()', () => {
    it('应该检查摄像头连接状态', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          cameras: [
            { id: 'cam1', name: '前方摄像头', status: 'online', quality: 'HD', fps: 30 },
            { id: 'cam2', name: '左侧摄像头', status: 'online', quality: 'HD', fps: 30 },
            { id: 'cam3', name: '右侧摄像头', status: 'online', quality: 'HD', fps: 30 },
            { id: 'cam4', name: '后方摄像头', status: 'online', quality: 'HD', fps: 30 }
          ],
          totalCameras: 4,
          onlineCameras: 4,
          offlineCameras: 0,
          systemLoad: '25%'
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
            { id: 'cam1', name: '前方摄像头', status: 'online', quality: 'HD', fps: 30 },
            { id: 'cam2', name: '左侧摄像头', status: 'offline', error: 'connection_lost' },
            { id: 'cam3', name: '右侧摄像头', status: 'online', quality: 'HD', fps: 30 },
            { id: 'cam4', name: '后方摄像头', status: 'degraded', quality: 'SD', fps: 15 }
          ],
          totalCameras: 4,
          onlineCameras: 2,
          offlineCameras: 1,
          degradedCameras: 1
        },
        msg: '部分摄像头异常'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkCam()

      expect(result.code).toBe(206)
      expect(result.data.onlineCameras).toBe(2)
      expect(result.data.offlineCameras).toBe(1)
      expect(result.data.degradedCameras).toBe(1)
    })

    it('应该处理所有摄像头离线', async () => {
      const mockResponse = {
        code: 503,
        data: { 
          cameras: [],
          totalCameras: 0,
          onlineCameras: 0,
          offlineCameras: 4,
          error: 'camera_service_unavailable',
          lastOnline: '2024-01-01T10:00:00Z'
        },
        msg: '摄像头服务不可用'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkCam()

      expect(result.code).toBe(503)
      expect(result.data.onlineCameras).toBe(0)
      expect(result.data.error).toBe('camera_service_unavailable')
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

  describe('系统健康检查综合测试', () => {
    it('应该能同时检查所有系统组件', async () => {
      const mockResponses = {
        fs: { code: 200, data: { status: 'available', usage: '50%' } },
        db: { code: 200, data: { status: 'connected', ping: '2ms' } },
        agv: { code: 200, data: { status: 'online', battery: 85 } },
        cam: { code: 200, data: { onlineCameras: 4, totalCameras: 4 } }
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
    })

    it('应该处理系统部分故障的情况', async () => {
      const fsSuccess = { code: 200, data: { status: 'available' } }
      const dbError = new Error('Database connection failed')
      const agvDegraded = { code: 206, data: { status: 'degraded', battery: 20 } }
      const camPartial = { code: 206, data: { onlineCameras: 2, totalCameras: 4 } }

      axios.get
        .mockResolvedValueOnce(fsSuccess)
        .mockRejectedValueOnce(dbError)
        .mockResolvedValueOnce(agvDegraded)
        .mockResolvedValueOnce(camPartial)

      const results = await Promise.allSettled([
        checkFs(),
        checkDb(),
        checkAgv(),
        checkCam()
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')
      expect(results[3].status).toBe('fulfilled')

      expect(results[0].value.data.status).toBe('available')
      expect(results[2].value.data.status).toBe('degraded')
      expect(results[3].value.data.onlineCameras).toBe(2)
    })

    it('应该计算系统整体健康状态', async () => {
      const systemHealth = {
        fs: { code: 200, score: 100 },
        db: { code: 200, score: 100 },
        agv: { code: 206, score: 75 }, // 降级状态
        cam: { code: 206, score: 50 }  // 部分摄像头离线
      }

      axios.get
        .mockResolvedValueOnce(systemHealth.fs)
        .mockResolvedValueOnce(systemHealth.db)
        .mockResolvedValueOnce(systemHealth.agv)
        .mockResolvedValueOnce(systemHealth.cam)

      const results = await Promise.all([
        checkFs(),
        checkDb(),
        checkAgv(),
        checkCam()
      ])

      // 模拟计算整体健康分数
      const scores = results.map(r => r.score || (r.code === 200 ? 100 : r.code === 206 ? 50 : 0))
      const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

      expect(overallScore).toBe(81.25) // (100 + 100 + 75 + 50) / 4
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

    it('应该处理请求超时', async () => {
      const timeoutError = new Error('timeout')
      axios.get.mockRejectedValueOnce(timeoutError)

      await expect(checkCam()).rejects.toThrow('timeout')
    })

    it('应该处理未知的HTTP状态码', async () => {
      const unknownStatusResponse = {
        code: 418, // I'm a teapot
        data: { status: 'unknown' },
        msg: '未知状态'
      }
      axios.get.mockResolvedValueOnce(unknownStatusResponse)

      const result = await checkFs()

      expect(result.code).toBe(418)
      expect(result.data.status).toBe('unknown')
    })
  })

  describe('API端点验证', () => {
    it('应该调用正确的API端点', async () => {
      const mockResponse = { code: 200 }
      axios.get.mockResolvedValue(mockResponse)

      await checkFs()
      await checkDb()
      await checkAgv()
      await checkCam()

      expect(axios.get).toHaveBeenCalledWith('/api/system/check/fs')
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/db')
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/agv')
      expect(axios.get).toHaveBeenCalledWith('/api/system/check/cam')
      expect(axios.get).toHaveBeenCalledTimes(4)
    })
  })
}) 