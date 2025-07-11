import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  listFlaw,
  getFlaw,
  addFlaw,
  updateFlaw,
  delFlaw,
  liveInfo,
  checkAllConfirmed
} from '../flaw.js'

// Mock axios
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('flaw.js - 缺陷管理API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listFlaw()', () => {
    it('应该正确传递查询参数获取缺陷列表', async () => {
      const params = { page: 1, size: 10, status: 'active' }
      const mockResponse = {
        code: 200,
        data: { records: [], total: 0 },
        msg: 'success'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await listFlaw(params)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/list', { params })
      expect(result).toEqual(mockResponse)
    })

    it('应该处理空参数', async () => {
      const mockResponse = { code: 200, data: [] }
      axios.get.mockResolvedValueOnce(mockResponse)

      await listFlaw({})

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/list', { params: {} })
    })
  })

  describe('getFlaw()', () => {
    it('应该使用正确的缺陷ID获取缺陷详情', async () => {
      const flawId = 123
      const mockResponse = {
        code: 200,
        data: { id: 123, description: 'Test Flaw' },
        msg: 'success'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await getFlaw(flawId)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/123')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理字符串类型的ID', async () => {
      const mockResponse = { code: 200, data: {} }
      axios.get.mockResolvedValueOnce(mockResponse)

      await getFlaw('456')

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/456')
    })
  })

  describe('addFlaw()', () => {
    it('应该正确创建新缺陷', async () => {
      const flawData = { 
        description: 'New Flaw', 
        severity: 'high',
        taskId: 1
      }
      const mockResponse = { 
        code: 200, 
        data: { id: 789 }, 
        msg: 'success' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await addFlaw(flawData)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/flaw', flawData)
      expect(result).toEqual(mockResponse)
    })

    it('应该处理完整的缺陷对象', async () => {
      const flawData = {
        id: null,
        taskId: 1,
        description: 'Detailed flaw description',
        severity: 'medium',
        position: { x: 100, y: 200 },
        timestamp: '2024-01-01T00:00:00Z',
        status: 'pending'
      }
      const mockResponse = { code: 200, data: { id: 999 } }
      axios.post.mockResolvedValueOnce(mockResponse)

      await addFlaw(flawData)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/flaw', flawData)
    })
  })

  describe('updateFlaw()', () => {
    it('应该正确更新缺陷信息', async () => {
      const flawData = { 
        id: 123, 
        description: 'Updated Flaw',
        status: 'resolved'
      }
      const mockResponse = { code: 200, msg: 'success' }
      axios.put.mockResolvedValueOnce(mockResponse)

      const result = await updateFlaw(flawData)

      expect(axios.put).toHaveBeenCalledWith('/api/agv/flaw', flawData)
      expect(result).toEqual(mockResponse)
    })

    it('应该处理部分字段更新', async () => {
      const partialFlawData = { 
        id: 123, 
        status: 'confirmed'
      }
      const mockResponse = { code: 200 }
      axios.put.mockResolvedValueOnce(mockResponse)

      await updateFlaw(partialFlawData)

      expect(axios.put).toHaveBeenCalledWith('/api/agv/flaw', partialFlawData)
    })
  })

  describe('delFlaw()', () => {
    it('应该正确删除指定缺陷', async () => {
      const flawId = 123
      const mockResponse = { code: 200, msg: 'success' }
      axios.delete.mockResolvedValueOnce(mockResponse)

      const result = await delFlaw(flawId)

      expect(axios.delete).toHaveBeenCalledWith('/api/agv/flaw/123')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理字符串ID删除', async () => {
      const mockResponse = { code: 200 }
      axios.delete.mockResolvedValueOnce(mockResponse)

      await delFlaw('789')

      expect(axios.delete).toHaveBeenCalledWith('/api/agv/flaw/789')
    })
  })

  describe('liveInfo()', () => {
    it('应该获取任务实时缺陷信息', async () => {
      const taskId = 456
      const mockResponse = {
        code: 200,
        data: { 
          taskId: 456,
          flaws: [],
          lastUpdate: '2024-01-01T12:00:00Z'
        },
        msg: 'success'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await liveInfo(taskId)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/live/456')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理字符串类型的任务ID', async () => {
      const mockResponse = { code: 200, data: {} }
      axios.get.mockResolvedValueOnce(mockResponse)

      await liveInfo('789')

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/live/789')
    })
  })

  describe('checkAllConfirmed()', () => {
    it('应该检查任务缺陷是否已全部确认', async () => {
      const taskId = 789
      const mockResponse = {
        code: 200,
        data: { 
          allConfirmed: true,
          totalFlaws: 5,
          confirmedFlaws: 5
        },
        msg: 'success'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAllConfirmed(taskId)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/check/789')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理部分确认的情况', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          allConfirmed: false,
          totalFlaws: 3,
          confirmedFlaws: 1
        }
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await checkAllConfirmed(100)

      expect(result.data.allConfirmed).toBe(false)
    })
  })

  describe('错误处理测试', () => {
    it('应该传递网络错误', async () => {
      const mockError = new Error('Network Error')
      axios.get.mockRejectedValueOnce(mockError)

      await expect(listFlaw({})).rejects.toThrow('Network Error')
    })

    it('应该传递服务器错误', async () => {
      const serverError = {
        response: { status: 500, data: { msg: 'Internal Server Error' } }
      }
      axios.post.mockRejectedValueOnce(serverError)

      await expect(addFlaw({})).rejects.toEqual(serverError)
    })

    it('应该传递404错误', async () => {
      const notFoundError = {
        response: { status: 404, data: { msg: 'Flaw not found' } }
      }
      axios.get.mockRejectedValueOnce(notFoundError)

      await expect(getFlaw(999)).rejects.toEqual(notFoundError)
    })
  })

  describe('参数验证测试', () => {
    it('listFlaw应该接受各种查询参数', async () => {
      const complexParams = {
        page: 2,
        size: 20,
        status: 'resolved',
        severity: 'high',
        taskId: 1,
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        keyword: 'search term'
      }
      const mockResponse = { code: 200, data: [] }
      axios.get.mockResolvedValueOnce(mockResponse)

      await listFlaw(complexParams)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/list', { 
        params: complexParams 
      })
    })

    it('所有函数应该正确处理不同类型的ID参数', async () => {
      const mockResponse = { code: 200 }
      axios.get.mockResolvedValue(mockResponse)
      axios.delete.mockResolvedValue(mockResponse)

      // 测试数字ID
      await getFlaw(123)
      await delFlaw(123)
      await liveInfo(123)
      await checkAllConfirmed(123)

      // 测试字符串ID
      await getFlaw('456')
      await delFlaw('456') 
      await liveInfo('456')
      await checkAllConfirmed('456')

      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/123')
      expect(axios.get).toHaveBeenCalledWith('/api/agv/flaw/456')
      expect(axios.delete).toHaveBeenCalledWith('/api/agv/flaw/123')
      expect(axios.delete).toHaveBeenCalledWith('/api/agv/flaw/456')
    })
  })
}) 