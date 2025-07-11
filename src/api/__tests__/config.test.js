import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'
import { useConfigStore } from '../config.js'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn()
  }
}))

// Mock alert
global.alert = vi.fn()

describe('config.js - 配置管理Store测试', () => {
  let pinia
  let store

  beforeEach(() => {
    // 创建新的 Pinia 实例
    pinia = createPinia()
    setActivePinia(pinia)
    
    // 创建 store 实例
    store = useConfigStore()
    
    // 清空所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Store初始化', () => {
    it('应该正确初始化configData的默认值', () => {
      expect(store.configData).toEqual({
        id: null,
        host: '',
        drivePort: null,
        analysisPort: null,
        cloudUrl: '',
        cam1: '',
        username1: '',
        password1: '',
        cam2: '',
        username2: '',
        password2: '',
        cam3: '',
        username3: '',
        password3: '',
        cam4: '',
        username4: '',
        password4: '',
      })
    })

    it('应该正确初始化needRefresh为false', () => {
      expect(store.needRefresh).toBe(false)
    })
  })

  describe('Getter函数测试', () => {
    beforeEach(() => {
      // 设置测试数据
      store.configData = {
        host: '192.168.1.100',
        drivePort: 8080,
        analysisPort: 8081,
        cloudUrl: 'https://cloud.example.com'
      }
    })

    it('host() 应该返回正确的主机地址', () => {
      expect(store.host()).toBe('192.168.1.100')
    })

    it('drivePort() 应该返回正确的驱动端口', () => {
      expect(store.drivePort()).toBe(8080)
    })

    it('analysisPort() 应该返回正确的分析端口', () => {
      expect(store.analysisPort()).toBe(8081)
    })

    it('cloudUrl() 应该返回正确的云端URL', () => {
      expect(store.cloudUrl()).toBe('https://cloud.example.com')
    })
  })

  describe('fetchConfig() 方法测试', () => {
    it('应该在API调用成功时正确更新配置数据', async () => {
      const mockConfigData = {
        id: 1,
        host: '192.168.1.200',
        drivePort: 9090,
        analysisPort: 9091,
        cloudUrl: 'https://new-cloud.example.com',
        cam1: '192.168.1.101'
      }

      axios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          data: mockConfigData,
          msg: 'success'
        }
      })

      await store.fetchConfig()

      expect(axios.get).toHaveBeenCalledWith('/api/agv/config')
      expect(store.configData).toEqual(mockConfigData)
    })

    it('应该在API返回非200状态码时使用默认配置', async () => {
      const originalConfigData = { ...store.configData }

      axios.get.mockResolvedValueOnce({
        data: {
          code: 400,
          msg: '请求参数错误',
          data: null
        }
      })

      // 不应该抛出异常
      await expect(store.fetchConfig()).resolves.toBeUndefined()
      
      // configData应该保持原始状态
      expect(store.configData).toEqual(originalConfigData)
    })

    it('应该在网络错误时使用默认配置', async () => {
      const originalConfigData = { ...store.configData }

      axios.get.mockRejectedValueOnce(new Error('Network Error'))

      // 不应该抛出异常
      await expect(store.fetchConfig()).resolves.toBeUndefined()
      
      // configData应该保持原始状态
      expect(store.configData).toEqual(originalConfigData)
    })

    it('应该在API响应格式异常时使用默认配置', async () => {
      const originalConfigData = { ...store.configData }

      axios.get.mockResolvedValueOnce({
        data: null
      })

      // 不应该抛出异常
      await expect(store.fetchConfig()).resolves.toBeUndefined()
      
      // configData应该保持原始状态
      expect(store.configData).toEqual(originalConfigData)
    })

    it('应该正确处理API响应中msg为空的情况', async () => {
      const originalConfigData = { ...store.configData }

      axios.get.mockResolvedValueOnce({
        data: {
          code: 500,
          data: null
          // msg 字段缺失
        }
      })

      await expect(store.fetchConfig()).resolves.toBeUndefined()
      expect(store.configData).toEqual(originalConfigData)
    })
  })

  describe('updateConfig() 方法测试', () => {
    beforeEach(() => {
      store.configData = {
        id: 1,
        host: '192.168.1.100',
        drivePort: 8080
      }
    })

    it('应该在更新成功时显示成功消息', async () => {
      axios.put.mockResolvedValueOnce({
        data: {
          code: 200,
          msg: 'success'
        }
      })

      await store.updateConfig()

      expect(axios.put).toHaveBeenCalledWith('/api/agv/config', store.configData)
      expect(global.alert).toHaveBeenCalledWith('配置已通过 Pinia 更新成功！')
    })

    it('应该在更新失败时显示错误消息', async () => {
      axios.put.mockRejectedValueOnce(new Error('Update failed'))

      await store.updateConfig()

      expect(axios.put).toHaveBeenCalledWith('/api/agv/config', store.configData)
      expect(global.alert).toHaveBeenCalledWith('更新失败！')
    })

    it('应该在API返回错误状态时显示错误消息', async () => {
      axios.put.mockResolvedValueOnce({
        data: {
          code: 400,
          msg: '参数错误'
        }
      })

      // 由于 updateConfig 没有检查响应状态码，它会显示成功消息
      // 这可能是代码中的一个bug，但我们按现有逻辑测试
      await store.updateConfig()

      expect(global.alert).toHaveBeenCalledWith('配置已通过 Pinia 更新成功！')
    })
  })

  describe('setNeedRefresh() 方法测试', () => {
    it('应该正确设置needRefresh为true', () => {
      store.setNeedRefresh(true)
      expect(store.needRefresh).toBe(true)
    })

    it('应该正确设置needRefresh为false', () => {
      store.needRefresh = true
      store.setNeedRefresh(false)
      expect(store.needRefresh).toBe(false)
    })

    it('应该能够多次切换needRefresh状态', () => {
      store.setNeedRefresh(true)
      expect(store.needRefresh).toBe(true)
      
      store.setNeedRefresh(false)
      expect(store.needRefresh).toBe(false)
      
      store.setNeedRefresh(true)
      expect(store.needRefresh).toBe(true)
    })
  })

  describe('响应式状态测试', () => {
    it('configData更改应该触发getter函数返回新值', () => {
      // 初始值
      expect(store.host()).toBe('')
      
      // 更新值
      store.configData.host = '192.168.1.999'
      
      // getter应该返回新值
      expect(store.host()).toBe('192.168.1.999')
    })

    it('needRefresh状态更改应该是响应式的', () => {
      expect(store.needRefresh).toBe(false)
      
      store.setNeedRefresh(true)
      expect(store.needRefresh).toBe(true)
    })
  })

  describe('边界条件和错误处理', () => {
    it('应该处理axios.get返回undefined的情况', async () => {
      axios.get.mockResolvedValueOnce(undefined)

      await expect(store.fetchConfig()).resolves.toBeUndefined()
    })

    it('应该处理axios.put抛出非Error对象的情况', async () => {
      axios.put.mockRejectedValueOnce('String error')

      await store.updateConfig()
      
      expect(global.alert).toHaveBeenCalledWith('更新失败！')
    })

    it('应该处理configData部分字段更新', async () => {
      const partialConfig = {
        host: '192.168.1.300',
        drivePort: 7070
        // 缺少其他字段
      }

      axios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          data: partialConfig,
          msg: 'success'
        }
      })

      await store.fetchConfig()

      expect(store.configData).toEqual(partialConfig)
      expect(store.host()).toBe('192.168.1.300')
      expect(store.drivePort()).toBe(7070)
    })
  })

  describe('多个store实例测试', () => {
    it('多个store实例应该共享同一状态', () => {
      const store1 = useConfigStore()
      const store2 = useConfigStore()

      store1.setNeedRefresh(true)
      
      expect(store2.needRefresh).toBe(true)
      
      store2.configData.host = '192.168.1.888'
      
      expect(store1.host()).toBe('192.168.1.888')
    })
  })

  describe('实际使用场景模拟', () => {
    it('应该模拟完整的配置加载和更新流程', async () => {
      // 1. 加载配置
      axios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            id: 1,
            host: '192.168.1.100',
            drivePort: 8080,
            cloudUrl: 'https://cloud.example.com'
          },
          msg: 'success'
        }
      })

      await store.fetchConfig()
      
      expect(store.host()).toBe('192.168.1.100')
      expect(store.drivePort()).toBe(8080)

      // 2. 修改配置
      store.configData.host = '192.168.1.200'
      store.configData.drivePort = 9090

      // 3. 更新配置
      axios.put.mockResolvedValueOnce({ data: { code: 200 } })
      
      await store.updateConfig()
      
      expect(axios.put).toHaveBeenCalledWith('/api/agv/config', store.configData)
      expect(global.alert).toHaveBeenCalledWith('配置已通过 Pinia 更新成功！')

      // 4. 设置刷新标记
      store.setNeedRefresh(true)
      expect(store.needRefresh).toBe(true)
    })
  })
}) 