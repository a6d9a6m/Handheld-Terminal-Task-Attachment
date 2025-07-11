import axios from 'axios'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// 在模块导入之前就mock axios
vi.mock('axios')

const mockAxiosInstance = {
  interceptors: {
    response: {
      use: vi.fn()
    }
  }
}

// mock axios.create返回mockAxiosInstance
axios.create = vi.fn(() => mockAxiosInstance)

describe('request.js - HTTP请求工具测试', () => {
  let mockResponseInterceptor
  let onFulfilled
  let onRejected

  beforeEach(() => {
    // 清除所有mock的调用历史
    vi.clearAllMocks()
    
    // 设置axios.create的返回值
    axios.create.mockReturnValue(mockAxiosInstance)
    
    // 模拟interceptors.response.use的调用，并捕获传入的函数
    mockAxiosInstance.interceptors.response.use.mockImplementation((fulfilled, rejected) => {
      onFulfilled = fulfilled
      onRejected = rejected
      return mockAxiosInstance
    })
    
    // 重新导入模块以触发初始化
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('axios实例创建', () => {
    it('应该创建带有正确配置的axios实例', async () => {
      // 导入模块触发初始化
      await import('../request.js')
      
      expect(axios.create).toHaveBeenCalledWith({
        timeout: 5000
      })
    })

    it('应该注册响应拦截器', async () => {
      // 导入模块触发初始化
      await import('../request.js')
      
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  describe('响应拦截器 - 成功响应处理', () => {
    beforeEach(async () => {
      // 导入模块以获取拦截器函数
      await import('../request.js')
    })

    it('应该在响应code为200时返回响应数据', () => {
      const mockResponse = {
        data: {
          code: 200,
          data: { id: 1, name: 'test' },
          msg: 'success'
        }
      }

      const result = onFulfilled(mockResponse)
      
      expect(result).toEqual(mockResponse.data)
    })

    it('应该在响应code不为200时抛出错误', async () => {
      const mockResponse = {
        data: {
          code: 400,
          msg: 'Bad Request'
        }
      }

      await expect(onFulfilled(mockResponse)).rejects.toEqual('Bad Request')
    })

    it('应该在响应code不为200且无msg时使用默认错误信息', async () => {
      const mockResponse = {
        data: {
          code: 500
        }
      }

      await expect(onFulfilled(mockResponse)).rejects.toEqual('Error')
    })
  })

  describe('响应拦截器 - 错误响应处理', () => {
    beforeEach(async () => {
      // 导入模块以获取拦截器函数
      await import('../request.js')
    })

    it('应该直接返回被拒绝的Promise', async () => {
      const mockError = new Error('Network Error')
      
      await expect(onRejected(mockError)).rejects.toEqual(mockError)
    })

    it('应该处理axios错误对象', async () => {
      const mockAxiosError = {
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      }
      
      await expect(onRejected(mockAxiosError)).rejects.toEqual(mockAxiosError)
    })
  })

  describe('实际使用场景模拟', () => {
    beforeEach(async () => {
      // 导入模块以获取拦截器函数
      await import('../request.js')
    })

    it('应该正确处理API成功响应', () => {
      const mockSuccessResponse = {
        data: {
          code: 200,
          data: { list: [{ id: 1, task: 'test task' }] },
          msg: 'success'
        }
      }

      // 模拟实际的响应处理流程
      const processedResponse = onFulfilled(mockSuccessResponse)
      
      expect(processedResponse).toEqual({
        code: 200,
        data: { list: [{ id: 1, task: 'test task' }] },
        msg: 'success'
      })
    })

    it('应该正确处理API错误响应', async () => {
      const mockErrorResponse = {
        data: {
          code: 401,
          msg: '用户未认证'
        }
      }

      await expect(onFulfilled(mockErrorResponse)).rejects.toEqual('用户未认证')
    })
  })

  describe('边界条件测试', () => {
    beforeEach(async () => {
      // 导入模块以获取拦截器函数
      await import('../request.js')
    })

    it('应该处理响应数据为空的情况', () => {
      const mockResponse = {
        data: {
          code: 200,
          data: null
        }
      }

      const result = onFulfilled(mockResponse)
      
      expect(result).toEqual({
        code: 200,
        data: null
      })
    })

    it('应该处理响应结构异常的情况', () => {
      const mockResponse = {
        data: null
      }

      // 当响应数据结构异常时，会抛出TypeError
      expect(() => {
        onFulfilled(mockResponse)
      }).toThrow(TypeError)
    })

    it('应该处理响应code为字符串的情况', async () => {
      const mockResponse = {
        data: {
          code: '200', // 字符串类型的code
          data: { id: 1 }
        }
      }

      // code为字符串'200'，不等于数字200，应该抛出错误
      await expect(onFulfilled(mockResponse)).rejects.toEqual('Error')
    })
  })
}) 