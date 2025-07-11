import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from '../../utils/request'
import {
  listTask,
  getTask,
  addTask,
  updateTask,
  delTask,
  startTask,
  endTask,
  preUploadTask,
  uploadTask
} from '../task.js'

// Mock axios
vi.mock('../../utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('task.js - 任务管理API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTask()', () => {
    it('应该正确传递查询参数获取任务列表', async () => {
      const params = { page: 1, size: 10, status: 'active' }
      const mockResponse = {
        code: 200,
        data: { 
          records: [
            { id: 1, name: 'Task 1', status: 'active' },
            { id: 2, name: 'Task 2', status: 'pending' }
          ],
          total: 2,
          page: 1,
          size: 10
        },
        msg: 'success'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await listTask(params)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/list', { params })
      expect(result).toEqual(mockResponse)
    })

    it('应该处理空参数', async () => {
      const mockResponse = { code: 200, data: { records: [], total: 0 } }
      axios.get.mockResolvedValueOnce(mockResponse)

      await listTask({})

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/list', { params: {} })
    })

    it('应该处理复杂的查询参数', async () => {
      const complexParams = {
        page: 2,
        size: 20,
        status: 'completed',
        priority: 'high',
        assignedTo: 'AGV-001',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        keyword: 'inspection'
      }
      const mockResponse = { code: 200, data: { records: [], total: 0 } }
      axios.get.mockResolvedValueOnce(mockResponse)

      await listTask(complexParams)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/list', { 
        params: complexParams 
      })
    })
  })

  describe('getTask()', () => {
    it('应该使用正确的任务ID获取任务详情', async () => {
      const taskId = 123
      const mockResponse = {
        code: 200,
        data: { 
          id: 123, 
          name: 'Inspection Task',
          description: 'Daily inspection route',
          status: 'active',
          priority: 'medium',
          createdAt: '2024-01-01T00:00:00Z'
        },
        msg: 'success'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await getTask(taskId)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/123')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理字符串类型的ID', async () => {
      const mockResponse = { code: 200, data: { id: 456, name: 'Task' } }
      axios.get.mockResolvedValueOnce(mockResponse)

      await getTask('456')

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/456')
    })

    it('应该处理任务不存在的情况', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { msg: '任务不存在' }
        }
      }
      axios.get.mockRejectedValueOnce(mockError)

      await expect(getTask(999)).rejects.toEqual(mockError)
    })
  })

  describe('addTask()', () => {
    it('应该正确创建新任务', async () => {
      const taskData = { 
        name: 'New Inspection Task',
        description: 'Monthly inspection',
        priority: 'high',
        route: ['point1', 'point2', 'point3'],
        estimatedDuration: 120
      }
      const mockResponse = { 
        code: 200, 
        data: { id: 789, ...taskData }, 
        msg: '任务创建成功' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await addTask(taskData)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/task', taskData)
      expect(result).toEqual(mockResponse)
    })

    it('应该处理完整的任务对象', async () => {
      const fullTaskData = {
        name: 'Complete Inspection Task',
        description: 'Full facility inspection',
        priority: 'high',
        type: 'inspection',
        route: [
          { point: 'A1', action: 'capture' },
          { point: 'B2', action: 'scan' },
          { point: 'C3', action: 'measure' }
        ],
        schedule: {
          startTime: '2024-01-01T09:00:00Z',
          recurring: true,
          interval: 'daily'
        },
        assignedAgv: 'AGV-001',
        estimatedDuration: 180
      }
      const mockResponse = { code: 200, data: { id: 100 } }
      axios.post.mockResolvedValueOnce(mockResponse)

      await addTask(fullTaskData)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/task', fullTaskData)
    })

    it('应该处理任务创建失败', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { msg: '任务参数无效' }
        }
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(addTask({})).rejects.toEqual(mockError)
    })
  })

  describe('updateTask()', () => {
    it('应该正确更新任务信息', async () => {
      const taskData = { 
        id: 123, 
        name: 'Updated Task',
        status: 'paused',
        priority: 'low'
      }
      const mockResponse = { code: 200, msg: '任务更新成功' }
      axios.put.mockResolvedValueOnce(mockResponse)

      const result = await updateTask(taskData)

      expect(axios.put).toHaveBeenCalledWith('/api/agv/task', taskData)
      expect(result).toEqual(mockResponse)
    })

    it('应该处理部分字段更新', async () => {
      const partialTaskData = { 
        id: 456, 
        status: 'completed',
        completedAt: '2024-01-01T15:30:00Z'
      }
      const mockResponse = { code: 200 }
      axios.put.mockResolvedValueOnce(mockResponse)

      await updateTask(partialTaskData)

      expect(axios.put).toHaveBeenCalledWith('/api/agv/task', partialTaskData)
    })

    it('应该处理更新冲突', async () => {
      const mockError = {
        response: {
          status: 409,
          data: { msg: '任务正在执行中，无法修改' }
        }
      }
      axios.put.mockRejectedValueOnce(mockError)

      await expect(updateTask({ id: 1, status: 'cancelled' })).rejects.toEqual(mockError)
    })
  })

  describe('delTask()', () => {
    it('应该正确删除指定任务', async () => {
      const taskId = 123
      const mockResponse = { code: 200, msg: '任务删除成功' }
      axios.delete.mockResolvedValueOnce(mockResponse)

      const result = await delTask(taskId)

      expect(axios.delete).toHaveBeenCalledWith('/api/agv/task/123')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理字符串ID删除', async () => {
      const mockResponse = { code: 200 }
      axios.delete.mockResolvedValueOnce(mockResponse)

      await delTask('789')

      expect(axios.delete).toHaveBeenCalledWith('/api/agv/task/789')
    })

    it('应该处理删除进行中的任务', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { msg: '无法删除正在执行的任务' }
        }
      }
      axios.delete.mockRejectedValueOnce(mockError)

      await expect(delTask(456)).rejects.toEqual(mockError)
    })
  })

  describe('startTask()', () => {
    it('应该正确启动指定任务', async () => {
      const taskId = 123
      const mockResponse = { 
        code: 200, 
        data: {
          taskId: 123,
          startTime: '2024-01-01T12:00:00Z',
          status: 'running'
        },
        msg: '任务启动成功' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await startTask(taskId)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/task/start/123')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理AGV忙碌状态', async () => {
      const mockResponse = {
        code: 409,
        data: { 
          status: 'conflict',
          reason: 'AGV正在执行其他任务',
          currentTaskId: 456
        },
        msg: 'AGV繁忙，无法启动新任务'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await startTask(123)

      expect(result.code).toBe(409)
      expect(result.data.currentTaskId).toBe(456)
    })

    it('应该处理任务启动失败', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { msg: 'AGV系统故障' }
        }
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(startTask(123)).rejects.toEqual(mockError)
    })
  })

  describe('endTask()', () => {
    it('应该正确结束任务（完成）', async () => {
      const taskId = 123
      const mockResponse = { 
        code: 200,
        data: {
          taskId: 123,
          endTime: '2024-01-01T14:00:00Z',
          status: 'completed',
          duration: 7200
        },
        msg: '任务完成' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await endTask(taskId)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/task/end/123', null, { 
        params: { isAbort: false } 
      })
      expect(result).toEqual(mockResponse)
    })

    it('应该正确中止任务', async () => {
      const taskId = 123
      const mockResponse = { 
        code: 200,
        data: {
          taskId: 123,
          endTime: '2024-01-01T13:30:00Z',
          status: 'aborted',
          reason: '用户中止'
        },
        msg: '任务已中止' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await endTask(taskId, true)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/task/end/123', null, { 
        params: { isAbort: true } 
      })
      expect(result).toEqual(mockResponse)
    })

    it('应该处理任务已结束的情况', async () => {
      const mockResponse = {
        code: 400,
        data: { 
          status: 'already_ended',
          currentStatus: 'completed'
        },
        msg: '任务已结束'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await endTask(123)

      expect(result.code).toBe(400)
      expect(result.data.status).toBe('already_ended')
    })
  })

  describe('preUploadTask()', () => {
    it('应该查询待上传的数据', async () => {
      const taskId = 456
      const mockResponse = {
        code: 200,
        data: { 
          taskId: 456,
          dataFiles: [
            { type: 'image', count: 25, size: '150MB' },
            { type: 'sensor', count: 100, size: '50MB' },
            { type: 'log', count: 1, size: '5MB' }
          ],
          totalSize: '205MB',
          estimatedUploadTime: '10min'
        },
        msg: '数据准备完成'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await preUploadTask(taskId)

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/preupload/456')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理无数据的情况', async () => {
      const mockResponse = {
        code: 200,
        data: { 
          taskId: 789,
          dataFiles: [],
          totalSize: '0MB',
          message: '暂无数据需要上传'
        },
        msg: '无待上传数据'
      }
      axios.get.mockResolvedValueOnce(mockResponse)

      const result = await preUploadTask(789)

      expect(result.data.dataFiles).toHaveLength(0)
      expect(result.data.totalSize).toBe('0MB')
    })
  })

  describe('uploadTask()', () => {
    it('应该上传任务数据', async () => {
      const taskId = 456
      const mockResponse = { 
        code: 200,
        data: {
          taskId: 456,
          uploadId: 'upload_123456',
          startTime: '2024-01-01T15:00:00Z',
          status: 'uploading'
        },
        msg: '数据上传已开始' 
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await uploadTask(taskId)

      expect(axios.post).toHaveBeenCalledWith('/api/agv/task/upload/456')
      expect(result).toEqual(mockResponse)
    })

    it('应该处理重复上传', async () => {
      const mockResponse = {
        code: 409,
        data: { 
          status: 'already_uploading',
          uploadId: 'upload_123456',
          progress: '45%'
        },
        msg: '数据正在上传中'
      }
      axios.post.mockResolvedValueOnce(mockResponse)

      const result = await uploadTask(456)

      expect(result.code).toBe(409)
      expect(result.data.status).toBe('already_uploading')
    })

    it('应该处理上传失败', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { msg: '网络连接失败' }
        }
      }
      axios.post.mockRejectedValueOnce(mockError)

      await expect(uploadTask(456)).rejects.toEqual(mockError)
    })
  })

  describe('任务生命周期综合测试', () => {
    it('应该能执行完整的任务生命周期', async () => {
      const taskData = { name: 'Lifecycle Test Task' }
      const createResponse = { code: 200, data: { id: 100 } }
      const startResponse = { code: 200, data: { status: 'running' } }
      const endResponse = { code: 200, data: { status: 'completed' } }
      const preUploadResponse = { code: 200, data: { dataFiles: [] } }
      const uploadResponse = { code: 200, data: { uploadId: 'upload_1' } }

      axios.post
        .mockResolvedValueOnce(createResponse)
        .mockResolvedValueOnce(startResponse)
        .mockResolvedValueOnce(endResponse)
        .mockResolvedValueOnce(uploadResponse)
      
      axios.get.mockResolvedValueOnce(preUploadResponse)

      // 创建 -> 启动 -> 结束 -> 检查数据 -> 上传
      const created = await addTask(taskData)
      const started = await startTask(created.data.id)
      const ended = await endTask(created.data.id)
      const preUpload = await preUploadTask(created.data.id)
      const uploaded = await uploadTask(created.data.id)

      expect(created.data.id).toBe(100)
      expect(started.data.status).toBe('running')
      expect(ended.data.status).toBe('completed')
      expect(preUpload.data.dataFiles).toHaveLength(0)
      expect(uploaded.data.uploadId).toBe('upload_1')
    })
  })

  describe('错误处理和边界条件', () => {
    it('应该处理空响应数据', async () => {
      const emptyResponse = { code: 200, data: null }
      axios.get.mockResolvedValueOnce(emptyResponse)

      const result = await listTask({})

      expect(result.data).toBeNull()
    })

    it('应该处理响应格式异常', async () => {
      const malformedResponse = { unexpectedField: 'value' }
      axios.post.mockResolvedValueOnce(malformedResponse)

      const result = await addTask({})

      expect(result).toEqual(malformedResponse)
    })

    it('应该处理网络超时', async () => {
      const timeoutError = new Error('timeout')
      axios.get.mockRejectedValueOnce(timeoutError)

      await expect(getTask(1)).rejects.toThrow('timeout')
    })

    it('应该处理服务器错误', async () => {
      const serverError = {
        response: { status: 500, data: { msg: 'Internal Server Error' } }
      }
      axios.put.mockRejectedValueOnce(serverError)

      await expect(updateTask({ id: 1 })).rejects.toEqual(serverError)
    })
  })

  describe('参数验证测试', () => {
    it('所有函数应该正确处理不同类型的ID参数', async () => {
      const mockResponse = { code: 200 }
      axios.get.mockResolvedValue(mockResponse)
      axios.post.mockResolvedValue(mockResponse)
      axios.delete.mockResolvedValue(mockResponse)

      // 测试数字ID
      await getTask(123)
      await delTask(123)
      await startTask(123)
      await endTask(123)
      await preUploadTask(123)
      await uploadTask(123)

      // 测试字符串ID
      await getTask('456')
      await delTask('456')
      await startTask('456')
      await endTask('456')
      await preUploadTask('456')
      await uploadTask('456')

      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/123')
      expect(axios.get).toHaveBeenCalledWith('/api/agv/task/456')
      expect(axios.delete).toHaveBeenCalledWith('/api/agv/task/123')
      expect(axios.delete).toHaveBeenCalledWith('/api/agv/task/456')
    })
  })
}) 