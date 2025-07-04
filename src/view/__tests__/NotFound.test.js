import { mount } from '@vue/test-utils';
import NotFound from '../NotFound.vue';
import { vi } from 'vitest';

// mock vue-router
const pushMock = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('NotFound.vue 页面测试', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('应正确渲染404页面内容', () => {
    const wrapper = mount(NotFound);
    expect(wrapper.text()).toContain('404');
    expect(wrapper.text()).toContain('你掉进了虚空');
    expect(wrapper.find('.btn-home').exists()).toBe(true);
  });

  it('点击"回到主世界"按钮应跳转首页', async () => {
    const wrapper = mount(NotFound);
    const btn = wrapper.find('.btn-home');
    await btn.trigger('click');
    expect(pushMock).toHaveBeenCalledWith('/');
  });
}); 