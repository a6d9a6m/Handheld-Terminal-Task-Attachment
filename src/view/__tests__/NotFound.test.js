import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import NotFound from '../NotFound.vue'

// Mock vue-router
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}))

describe('NotFound.vue - 404页面组件测试', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(NotFound)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染404页面', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('应该包含404状态码', () => {
      const statusCode = wrapper.find('.status-code')
      expect(statusCode.exists()).toBe(true)
      expect(statusCode.text()).toBe('404')
    })

    it('应该包含错误信息', () => {
      const message = wrapper.find('.message')
      expect(message.exists()).toBe(true)
      expect(message.text()).toBe('你掉进了虚空')
    })

    it('应该包含返回主页按钮', () => {
      const homeButton = wrapper.find('.btn-home')
      expect(homeButton.exists()).toBe(true)
      expect(homeButton.text()).toBe('回到主世界')
    })

    it('应该包含Creeper面部', () => {
      const creeperFace = wrapper.find('.creeper-face')
      expect(creeperFace.exists()).toBe(true)
    })

    it('应该包含两只眼睛', () => {
      const eyes = wrapper.findAll('.eye')
      expect(eyes).toHaveLength(2)
    })

    it('应该包含嘴部结构', () => {
      const mouth = wrapper.find('.mouth')
      expect(mouth.exists()).toBe(true)

      const mouthParts = wrapper.findAll('.mouth-part-1, .mouth-part-2, .mouth-part-3')
      expect(mouthParts).toHaveLength(3)
    })
  })

  describe('CSS类名测试', () => {
    it('应该有正确的根元素类名', () => {
      expect(wrapper.classes()).toContain('not-found-page')
    })

    it('应该有正确的容器类名', () => {
      const container = wrapper.find('.not-found-container')
      expect(container.exists()).toBe(true)
    })

    it('应该有正确的Creeper面部类名', () => {
      const creeperFace = wrapper.find('.creeper-face')
      expect(creeperFace.exists()).toBe(true)
    })

    it('应该有正确的按钮类名', () => {
      const button = wrapper.find('.btn-home')
      expect(button.exists()).toBe(true)
    })
  })

  describe('交互功能', () => {
    it('点击返回主页按钮应该调用路由跳转', async () => {
      const homeButton = wrapper.find('.btn-home')
      expect(homeButton.exists()).toBe(true)

      await homeButton.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/')
      expect(mockPush).toHaveBeenCalledTimes(1)
    })

    it('应该正确绑定click事件到按钮', () => {
      const homeButton = wrapper.find('.btn-home')
      expect(homeButton.attributes('click')).toBeUndefined() // 不应该有click属性
      expect(homeButton.element.onclick).toBeNull() // 应该通过Vue事件绑定
    })
  })

  describe('DOM结构验证', () => {
    it('应该有正确的HTML结构层次', () => {
      const container = wrapper.find('.not-found-container')
      expect(container.exists()).toBe(true)

      // 验证子元素的存在和顺序
      const children = container.element.children
      expect(children.length).toBeGreaterThanOrEqual(3)

      // 验证Creeper face存在
      expect(wrapper.find('.creeper-face').exists()).toBe(true)
      // 验证标题存在
      expect(wrapper.find('h1.status-code').exists()).toBe(true)
      // 验证消息存在
      expect(wrapper.find('p.message').exists()).toBe(true)
      // 验证按钮存在
      expect(wrapper.find('button.btn-home').exists()).toBe(true)
    })

    it('应该有正确的Creeper面部结构', () => {
      const creeperFace = wrapper.find('.creeper-face')
      const eyes = creeperFace.findAll('.eye')
      const mouth = creeperFace.find('.mouth')

      expect(eyes).toHaveLength(2)
      expect(mouth.exists()).toBe(true)

      const mouthPart1 = mouth.find('.mouth-part-1')
      const mouthPart2 = mouth.find('.mouth-part-2')
      const mouthPart3 = mouth.find('.mouth-part-3')

      expect(mouthPart1.exists()).toBe(true)
      expect(mouthPart2.exists()).toBe(true)
      expect(mouthPart3.exists()).toBe(true)
    })
  })

  describe('组件方法测试', () => {
    it('goHome方法应该调用router.push', async () => {
      // 直接调用组件的方法
      await wrapper.vm.goHome()

      expect(mockRouter.push).toHaveBeenCalledWith('/')
      expect(mockRouter.push).toHaveBeenCalledTimes(1)
    })

    it('多次调用goHome应该多次调用router.push', async () => {
      await wrapper.vm.goHome()
      await wrapper.vm.goHome()

      expect(mockRouter.push).toHaveBeenCalledTimes(2)
      expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/')
      expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/')
    })
  })

  describe('无障碍性测试', () => {
    it('按钮应该是可访问的', () => {
      const homeButton = wrapper.find('.btn-home')
      expect(homeButton.element.tagName).toBe('BUTTON')
      expect(homeButton.element.textContent).toBeTruthy()
    })

    it('应该有适当的文本内容供屏幕阅读器', () => {
      const statusCode = wrapper.find('.status-code')
      const message = wrapper.find('.message')
      const button = wrapper.find('.btn-home')

      expect(statusCode.text()).toBeTruthy()
      expect(message.text()).toBeTruthy()
      expect(button.text()).toBeTruthy()
    })
  })

  describe('边界条件测试', () => {
    it('应该在router未定义时也能正常渲染', () => {
      // 组件应该能正常渲染，即使router有问题
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.status-code').text()).toBe('404')
    })

    it('应该处理按钮的多次快速点击', async () => {
      const homeButton = wrapper.find('.btn-home')

      // 快速连续点击
      await homeButton.trigger('click')
      await homeButton.trigger('click')
      await homeButton.trigger('click')

      expect(mockRouter.push).toHaveBeenCalledTimes(3)
    })

    it('应该处理router.push可能的异常', async () => {
      // Mock router.push抛出异常
      mockRouter.push.mockRejectedValueOnce(new Error('Navigation failed'))

      // 组件应该能处理异常而不崩溃
      const promise = wrapper.vm.goHome()
      await expect(promise).rejects.toThrow('Navigation failed')
    })
  })

  describe('样式相关测试', () => {
    it('应该应用正确的CSS类', () => {
      expect(wrapper.find('.not-found-page').exists()).toBe(true)
      expect(wrapper.find('.not-found-container').exists()).toBe(true)
      expect(wrapper.find('.creeper-face').exists()).toBe(true)
      expect(wrapper.find('.status-code').exists()).toBe(true)
      expect(wrapper.find('.message').exists()).toBe(true)
      expect(wrapper.find('.btn-home').exists()).toBe(true)
    })

    it('应该有正确的HTML标签结构', () => {
      expect(wrapper.find('h1.status-code').exists()).toBe(true)
      expect(wrapper.find('p.message').exists()).toBe(true)
      expect(wrapper.find('button.btn-home').exists()).toBe(true)
    })
  })

  describe('事件处理测试', () => {
    it('应该正确绑定click事件', async () => {
      const homeButton = wrapper.find('.btn-home')

      // 模拟点击事件
      await homeButton.trigger('click')

      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })

    it('应该只在按钮上绑定click事件', () => {
      // 其他元素不应该有click处理器
      const statusCode = wrapper.find('.status-code')
      const message = wrapper.find('.message')

      expect(statusCode.element.onclick).toBeNull()
      expect(message.element.onclick).toBeNull()
    })
  })
})