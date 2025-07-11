import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  getVideoStreamUrl,
  checkVideoStreamAvailable
} from '../webrtc.js'

// Mock axios
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('webrtc.js - 视频流API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getVideoStreamUrl()', () => {
    // 在测试环境中，import.meta.env.MODE === 'test' 总是为真
    // 所以总是返回开发环境URL
    
    it('应该为前方摄像头返回本地开发URL', () => {
      const result = getVideoStreamUrl('camera_front')
      expect(result).toBe('http://localhost:8000/live/front.flv')
    })

    it('应该为左侧摄像头返回本地开发URL', () => {
      const result = getVideoStreamUrl('camera_left')
      expect(result).toBe('http://localhost:8000/live/left.flv')
    })

    it('应该为右侧摄像头返回本地开发URL', () => {
      const result = getVideoStreamUrl('camera_right')
      expect(result).toBe('http://localhost:8000/live/right.flv')
    })

    it('应该为后方摄像头返回本地开发URL', () => {
      const result = getVideoStreamUrl('camera_back')
      expect(result).toBe('http://localhost:8000/live/back.flv')
    })

    it('应该为未知摄像头ID返回默认URL', () => {
      const result = getVideoStreamUrl('unknown_camera')
      expect(result).toBe('http://localhost:8000/live/default.flv')
    })

    it('应该为空ID返回默认URL', () => {
      const result = getVideoStreamUrl('')
      expect(result).toBe('http://localhost:8000/live/default.flv')
    })

    it('应该为null ID返回默认URL', () => {
      const result = getVideoStreamUrl(null)
      expect(result).toBe('http://localhost:8000/live/default.flv')
    })

    it('应该处理protocol参数（虽然在当前环境中被忽略）', () => {
      const result1 = getVideoStreamUrl('camera_front', 'webrtc')
      const result2 = getVideoStreamUrl('camera_front', 'flv')
      
      expect(result1).toBe('http://localhost:8000/live/front.flv')
      expect(result2).toBe('http://localhost:8000/live/front.flv')
    })

    it('应该正确映射摄像头ID到文件名', () => {
      const testCases = [
        ['camera_front', 'front'],
        ['camera_left', 'left'], 
        ['camera_right', 'right'],
        ['camera_back', 'back'],
        ['unknown_id', 'default']
      ]

      testCases.forEach(([cameraId, expectedName]) => {
        const result = getVideoStreamUrl(cameraId)
        expect(result).toBe(`http://localhost:8000/live/${expectedName}.flv`)
      })
    })
  })

  describe('checkVideoStreamAvailable()', () => {
    it('应该检查视频流可用性', async () => {
      const cameraId = 'camera_front'
      const mockResponse = {
        status: 200,
        data: { available: true }
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkVideoStreamAvailable(cameraId)

      expect(axios.get).toHaveBeenCalledWith('/webrtc-api/live/camera_front_01.flv', {
        headers: expect.any(Object)
      })
      expect(result).toEqual(mockResponse)
    })

    it('应该处理不同的摄像头ID', async () => {
      const mockResponse = { status: 200 }
      axios.get.mockResolvedValue(mockResponse)

      await checkVideoStreamAvailable('camera_left')
      await checkVideoStreamAvailable('camera_right')
      await checkVideoStreamAvailable('camera_back')

      expect(axios.get).toHaveBeenCalledWith('/webrtc-api/live/camera_left_01.flv', expect.any(Object))
      expect(axios.get).toHaveBeenCalledWith('/webrtc-api/live/camera_right_01.flv', expect.any(Object))
      expect(axios.get).toHaveBeenCalledWith('/webrtc-api/live/camera_back_01.flv', expect.any(Object))
    })

    it('应该包含Authorization头（Headers对象）', async () => {
      const mockResponse = { status: 200 }
      axios.get.mockResolvedValueOnce(mockResponse)

      await checkVideoStreamAvailable('test_camera')

      const callArgs = axios.get.mock.calls[0]
      expect(callArgs[1]).toHaveProperty('headers')
      expect(callArgs[1].headers).toBeInstanceOf(Headers)
    })

    it('应该处理视频流不可用的情况', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Stream not found' }
        }
      }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(checkVideoStreamAvailable('nonexistent_camera')).rejects.toEqual(mockError)
    })

    it('应该处理服务器错误', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(checkVideoStreamAvailable('camera_front')).rejects.toEqual(mockError)
    })

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network Error')
      axios.get.mockRejectedValueOnce(networkError)

      await expect(checkVideoStreamAvailable('camera_front')).rejects.toThrow('Network Error')
    })

    it('应该处理认证失败', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      }
      axios.get.mockRejectedValueOnce(authError)

      await expect(checkVideoStreamAvailable('camera_front')).rejects.toEqual(authError)
    })

    it('应该处理超时错误', async () => {
      const timeoutError = new Error('timeout')
      axios.get.mockRejectedValueOnce(timeoutError)

      await expect(checkVideoStreamAvailable('camera_front')).rejects.toThrow('timeout')
    })

    it('应该处理空的摄像头ID', async () => {
      const mockResponse = { status: 200 }
      axios.get.mockResolvedValueOnce(mockResponse)

      await checkVideoStreamAvailable('')

      expect(axios.get).toHaveBeenCalledWith('/webrtc-api/live/_01.flv', expect.any(Object))
    })

    it('应该处理特殊字符的摄像头ID', async () => {
      const mockResponse = { status: 200 }
      axios.get.mockResolvedValueOnce(mockResponse)

      await checkVideoStreamAvailable('camera-test_123')

      expect(axios.get).toHaveBeenCalledWith('/webrtc-api/live/camera-test_123_01.flv', expect.any(Object))
    })
  })



  describe('URL格式验证', () => {
    it('应该返回有效的URL格式', () => {
      const result = getVideoStreamUrl('camera_front')
      expect(result).toMatch(/^http:\/\/localhost:8000\/live\/\w+\.flv$/)
    })

    it('应该使用正确的基础URL结构', () => {
      const result = getVideoStreamUrl('test_camera')
      expect(result).toContain('http://localhost:8000/live/')
      expect(result).toContain('.flv')
    })
  })

  describe('API端点验证', () => {
    it('应该调用正确的API端点', async () => {
      const mockResponse = { status: 200 }
      axios.get.mockResolvedValue(mockResponse)

      await checkVideoStreamAvailable('test_camera')

      expect(axios.get).toHaveBeenCalledWith(
        '/webrtc-api/live/test_camera_01.flv',
        expect.objectContaining({
          headers: expect.any(Object)
        })
      )
    })

    it('应该使用正确的base URL路径', async () => {
      const mockResponse = { status: 200 }
      axios.get.mockResolvedValueOnce(mockResponse)

      await checkVideoStreamAvailable('camera1')

      const callArgs = axios.get.mock.calls[0]
      expect(callArgs[0]).toContain('/webrtc-api/live/')
      expect(callArgs[0]).toContain('_01.flv')
    })
  })

  describe('边界条件测试', () => {
    it('应该处理undefined输入', () => {
      const result = getVideoStreamUrl(undefined)
      expect(result).toBe('http://localhost:8000/live/default.flv')
    })

    it('应该处理数字输入', () => {
      const result = getVideoStreamUrl(123)
      expect(result).toBe('http://localhost:8000/live/default.flv')
    })

    it('应该处理空字符串输入', () => {
      const result = getVideoStreamUrl('')
      expect(result).toBe('http://localhost:8000/live/default.flv')
    })
  })
}) 