import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { getEasyDevices } from '../camera.js'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
}

beforeEach(() => {
  console.log = vi.fn()
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterEach(() => {
  console.log = originalConsole.log
  console.error = originalConsole.error
  console.warn = originalConsole.warn
})

describe('camera.js - 摄像头API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEasyDevices()', () => {
    it('应该成功获取摄像头设备列表', async () => {
      const mockResponse = {
        data: {
          items: [
            { id: 'camera1', name: '前方摄像头', status: 'online' },
            { id: 'camera2', name: '左侧摄像头', status: 'online' }
          ]
        }
      }

      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await getEasyDevices()

      expect(axios.get).toHaveBeenCalledWith('/easy-api/devices', {
        params: {
          page: 1,
          size: 999,
          status: '',
          id: '',
          name: ''
        },
        headers: {
          'Authorization': 'Basic YWRtaW4xMjM6QWRtaW5AMTIz'
        },
        timeout: 5000
      })

      expect(result).toEqual({
        code: 200,
        data: mockResponse.data,
        msg: 'success'
      })

      expect(console.log).toHaveBeenCalledWith('摄像头API成功响应:', mockResponse.data)
    })

    it('应该处理404错误并返回默认摄像头配置', async () => {
      const mockError = {
        response: {
          status: 404
        },
        message: 'Not Found'
      }

      axios.get.mockRejectedValueOnce(mockError)

      const result = await getEasyDevices()

      expect(console.error).toHaveBeenCalledWith('摄像头API请求失败:', mockError)
      expect(console.warn).toHaveBeenCalledWith('摄像头API端点不存在，使用默认配置')

      expect(result).toEqual({
        code: 200,
        data: {
          items: [
            { id: 'camera1', name: '前方摄像头', status: 'online' },
            { id: 'camera2', name: '左侧摄像头', status: 'online' },
            { id: 'camera3', name: '右侧摄像头', status: 'online' },
            { id: 'camera4', name: '后方摄像头', status: 'online' }
          ]
        },
        msg: 'using default camera config'
      })
    })

    it('应该处理500服务器错误', async () => {
      const mockError = {
        response: {
          status: 500
        },
        message: 'Internal Server Error'
      }

      axios.get.mockRejectedValueOnce(mockError)

      await expect(getEasyDevices()).rejects.toEqual({
        code: 500,
        msg: 'Internal Server Error',
        data: null
      })

      expect(console.error).toHaveBeenCalledWith('摄像头API请求失败:', mockError)
    })

    it('应该处理网络错误（无response属性）', async () => {
      const mockError = {
        message: 'Network Error'
      }

      axios.get.mockRejectedValueOnce(mockError)

      await expect(getEasyDevices()).rejects.toEqual({
        code: 500,
        msg: 'Network Error',
        data: null
      })

      expect(console.error).toHaveBeenCalledWith('摄像头API请求失败:', mockError)
    })

    it('应该处理没有错误消息的情况', async () => {
      const mockError = {
        response: {
          status: 503
        }
      }

      axios.get.mockRejectedValueOnce(mockError)

      await expect(getEasyDevices()).rejects.toEqual({
        code: 503,
        msg: '摄像头服务连接失败',
        data: null
      })

      expect(console.error).toHaveBeenCalledWith('摄像头API请求失败:', mockError)
    })

    it('应该处理完全未知的错误格式', async () => {
      const mockError = {}

      axios.get.mockRejectedValueOnce(mockError)

      await expect(getEasyDevices()).rejects.toEqual({
        code: 500,
        msg: '摄像头服务连接失败',
        data: null
      })

      expect(console.error).toHaveBeenCalledWith('摄像头API请求失败:', mockError)
    })

    it('应该正确验证API请求参数', async () => {
      const mockResponse = { data: { items: [] } }
      axios.get.mockResolvedValueOnce(mockResponse)

      await getEasyDevices()

      const callArgs = axios.get.mock.calls[0]
      expect(callArgs[0]).toBe('/easy-api/devices')
      expect(callArgs[1].params.page).toBe(1)
      expect(callArgs[1].params.size).toBe(999)
      expect(callArgs[1].headers.Authorization).toBe('Basic YWRtaW4xMjM6QWRtaW5AMTIz')
      expect(callArgs[1].timeout).toBe(5000)
    })

    it('应该处理空的摄像头列表响应', async () => {
      const mockResponse = {
        data: {
          items: []
        }
      }

      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await getEasyDevices()

      expect(result).toEqual({
        code: 200,
        data: { items: [] },
        msg: 'success'
      })
    })
  })
}) 