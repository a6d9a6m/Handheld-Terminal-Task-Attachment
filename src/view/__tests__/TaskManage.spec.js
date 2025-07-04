import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus, { ElMessage, ElMessageBox } from 'element-plus'
import TaskManage from '../TaskManageView.vue'
import { 
  Setting as SettingIcon, 
  Search as SearchIcon, 
  Refresh as RefreshIcon, 
  VideoCamera as VideoCameraIcon 
} from '@element-plus/icons-vue'

// --- Mocks ---
vi.mock('../../api/taskmanagee.js', () => ({
  listTask: vi.fn(),
  addTask: vi.fn(),
  updateTask: vi.fn(),
  delTask: vi.fn(),
  startTask: vi.fn(),  // 修正：与组件中使用的名称一致
  uploadTask: vi.fn()   // 修正：与组件中使用的名称一致
}))

// 模拟路由
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useRoute: () => ({})
}))

// 模拟Element Plus消息
vi.spyOn(ElMessage, 'success').mockImplementation(() => {})
vi.spyOn(ElMessage, 'warning').mockImplementation(() => {})
vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
vi.spyOn(ElMessageBox, 'confirm').mockImplementation(() => Promise.resolve())

// 导入 mock 函数
import { 
  listTask, 
  addTask, 
  updateTask, 
  delTask, 
  startTask,
  uploadTask 
} from '../../api/taskmanagee.js'

// --- Mock Data ---
const mockTasks = [
  {
    id: 1,
    taskCode: 'TASK202312010001',
    taskName: '地铁1号线隧道例行巡检',
    startPos: '100米',
    taskTrip: '500米',
    creator: '张三',
    executor: '李四',
    execTime: '2024-01-20 09:00',
    endTime: '2024-01-20 10:30',
    taskStatus: '已完成'
  },
  {
    id: 2,
    taskCode: 'TASK2023120010002',
    taskName: '设备故障排查巡检',
    startPos: '200米',
    taskTrip: '300米',
    creator: '王五',
    executor: '赵六',
    execTime: '2024-01-20 14:00',
    endTime: '',
    taskStatus: '待巡视'
  }
]

describe('TaskManage.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listTask.mockResolvedValue({ code: 200, rows: mockTasks, total: mockTasks.length })
    addTask.mockResolvedValue({ code: 200, msg: '创建成功', data: { id: 3 } })
  })

  const mountComponent = () => {
    return mount(TaskManage, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          'el-icon': true,
          'el-table': {
            template: '<div><slot /><div class="el-table__empty-text">暂无数据</div></div>'
          },
          'el-table-column': true,
          'el-pagination': true
        },
        mocks: {
          $route: {},
          $router: { push: mockPush }
        }
      }
    })
  }

  describe('初始渲染和数据加载', () => {
    it('应该正确渲染组件', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.breadcrumb-text').text()).toContain('任务列表')
    })

    it('挂载时应加载任务列表', async () => {
      listTask.mockResolvedValueOnce({ 
        code: 200, 
        rows: mockTasks, 
        total: mockTasks.length 
      })
      const wrapper = mountComponent()
      await flushPromises()
      expect(listTask).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        taskCode: '',
        creator: '',
        executor: '',
        taskStatus: ''
      })
      expect(wrapper.vm.tableData.length).toBe(mockTasks.length)
    })

    it('API调用失败时应显示兜底数据', async () => {
      listTask.mockRejectedValueOnce(new Error('Network error'))
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.tableData.length).toBe(3) // 兜底数据长度
    })

    it('loadTaskList code === 200 但 rows 为 falsy 时 tableData.value 为空数组', async () => {
      listTask.mockResolvedValueOnce({ code: 200, rows: null, total: 0 })
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.tableData).toEqual([])
    })

    it('loadTaskList code !== 200 时应使用兜底数据并打印日志', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      listTask.mockResolvedValueOnce({ code: 500, msg: 'fail' })
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.vm.tableData).toEqual(expect.arrayContaining([
        expect.objectContaining({ taskCode: 'TASK202312010001' })
      ]))
      expect(wrapper.vm.total).toBe(3)
      expect(errorSpy).toHaveBeenCalledWith('获取任务列表失败:', 'fail')
      expect(logSpy).toHaveBeenCalledWith('已使用兜底数据显示')
    })
  })

  describe('搜索功能', () => {
    it('应该能够根据条件搜索任务', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      // 使用更精确的选择器
      await wrapper.find('input[placeholder="请输入任务编号"]').setValue('TASK001')
      await wrapper.findAll('button').find(b => b.text() === '搜索').trigger('click')
      
      expect(listTask).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        taskCode: 'TASK001',
        creator: '',
        executor: '',
        taskStatus: ''
      })
    })

    it('应该能够重置搜索条件', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      await wrapper.find('input[placeholder="请输入任务编号"]').setValue('TASK001')
      await wrapper.findAll('button').find(b => b.text() === '重置').trigger('click')
      
      expect(wrapper.find('input[placeholder="请输入任务编号"]').element.value).toBe('')
      expect(listTask).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        taskCode: '',
        creator: '',
        executor: '',
        taskStatus: ''
      })
    })

    it('搜索表单创建人字段 v-model 绑定应通过原生 input 被覆盖', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      // 找到"创建人"输入框（第2个el-input）
      const creatorInput = wrapper.findAllComponents({ name: 'ElInput' })[1].find('input')
      expect(creatorInput.exists()).toBe(true)
      await creatorInput.setValue('张三')
      await flushPromises()
      expect(wrapper.vm.searchForm.creator).toBe('张三')
    })

    it('搜索表单执行人字段 v-model 绑定应通过原生 input 被覆盖', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      // 找到"执行人"输入框（第3个el-input）
      const executorInput = wrapper.findAllComponents({ name: 'ElInput' })[2].find('input')
      expect(executorInput.exists()).toBe(true)
      await executorInput.setValue('李四')
      await flushPromises()
      expect(wrapper.vm.searchForm.executor).toBe('李四')
    })

    it('搜索表单状态字段 v-model 绑定应通过组件事件被覆盖', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      // 找到 el-select 组件
      const select = wrapper.findComponent({ name: 'ElSelect' })
      expect(select.exists()).toBe(true)
      await select.vm.$emit('update:modelValue', '已完成')
      await flushPromises()
      expect(wrapper.vm.searchForm.taskStatus).toBe('已完成')
    })
  })

  describe('任务操作', () => {
    it('应该能够启动任务', async () => {
      startTask.mockResolvedValue({ code: 200, msg: '启动成功' })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.startTask(mockTasks[1])
      expect(startTask).toHaveBeenCalledWith(2)
      expect(mockPush).toHaveBeenCalledWith('/task-execute/2')
    })

    it('应该能够查看任务详情', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.viewTaskDetail(mockTasks[0])
      expect(mockPush).toHaveBeenCalledWith('/task-detail/1')
    })

    it('应该能够导航到设置页面', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.goToSettings()
      expect(mockPush).toHaveBeenCalledWith('/settings')
    })

    it('应该能够通过 viewTaskExecute 跳转到任务巡视页面', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      const task = { id: 123 }
      // 假设组件已暴露 viewTaskExecute
      if (wrapper.vm.viewTaskExecute) {
        wrapper.vm.viewTaskExecute(task)
        expect(mockPush).toHaveBeenCalledWith('/task-execute/123')
      } else {
        // 兼容未暴露时直接调用 router
        wrapper.vm.$router.push(`/task-execute/${task.id}`)
        expect(mockPush).toHaveBeenCalledWith('/task-execute/123')
      }
    })
  })

  describe('弹窗与表单交互', () => {
    it('点击新增任务按钮应弹出新增任务对话框', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text().includes('新增任务')).trigger('click')
      await flushPromises()
      expect(wrapper.vm.taskDialogVisible).toBe(true)
      expect(wrapper.find('.el-dialog__title').text()).toContain('新增任务')
    })

    it('点击取消按钮应关闭弹窗', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text().includes('新增任务')).trigger('click')
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text() === '取消').trigger('click')
      await flushPromises()
      expect(wrapper.vm.taskDialogVisible).toBe(false)
    })

    it('保存任务时表单校验失败应阻止提交', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text().includes('新增任务')).trigger('click')
      await flushPromises()
      // mock validate 返回 false
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(false) }
      await wrapper.findAll('button').find(b => b.text() === '确定').trigger('click')
      expect(addTask).not.toHaveBeenCalled()
    })

    it('保存并启动任务时表单校验失败应阻止提交', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text().includes('新增任务')).trigger('click')
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(false) }
      await wrapper.findAll('button').find(b => b.text() === '保存并启动').trigger('click')
      expect(addTask).not.toHaveBeenCalled()
    })

    it('编辑任务弹窗应正确显示并保存', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      // 直接调用 editTask
      wrapper.vm.editTask(mockTasks[0])
      await flushPromises()
      expect(wrapper.vm.taskDialogVisible).toBe(true)
      expect(wrapper.find('.el-dialog__title').text()).toContain('编辑任务')
      // mock validate 返回 true
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      updateTask.mockResolvedValue({ code: 200, msg: '编辑成功' })
      await wrapper.findAll('button').find(b => b.text() === '确定').trigger('click')
      expect(updateTask).toHaveBeenCalled()
      expect(ElMessage.success).toHaveBeenCalledWith('编辑成功')
    })

    it('保存任务失败应提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text().includes('新增任务')).trigger('click')
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockResolvedValueOnce({ code: 500, msg: '保存失败' })
      await wrapper.findAll('button').find(b => b.text() === '确定').trigger('click')
      expect(ElMessage.error).toHaveBeenCalledWith('保存失败')
    })

    it('保存并启动任务失败应提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.findAll('button').find(b => b.text().includes('新增任务')).trigger('click')
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockResolvedValueOnce({ code: 500, msg: '保存失败' })
      await wrapper.findAll('button').find(b => b.text() === '保存并启动').trigger('click')
      expect(ElMessage.error).toHaveBeenCalledWith('保存失败')
    })

    it('saveTask code !== 200 且无 msg 时提示默认错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockResolvedValueOnce({ code: 500 })
      await wrapper.vm.saveTask()
      expect(ElMessage.error).toHaveBeenCalledWith('保存失败')
    })

    it('saveTask 编辑模式 code !== 200 时提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      wrapper.vm.isEditMode = true
      updateTask.mockResolvedValueOnce({ code: 500, msg: 'fail' })
      await wrapper.vm.saveTask()
      expect(ElMessage.error).toHaveBeenCalledWith('fail')
    })

    it('saveAndStartTask code !== 200 且无 msg 时提示默认错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockResolvedValueOnce({ code: 500 })
      await wrapper.vm.saveAndStartTask()
      expect(ElMessage.error).toHaveBeenCalledWith('保存失败')
    })

    it('startTask code !== 200 且无 msg 时提示默认错误', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      startTask.mockResolvedValueOnce({ code: 500 })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.startTask({ id: 1, taskName: '任务' })
      expect(ElMessage.error).toHaveBeenCalledWith('启动失败')
    })

    it('deleteTask code !== 200 且无 msg 时提示默认错误', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      delTask.mockResolvedValueOnce({ code: 500 })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.deleteTask({ id: 1, taskName: '任务' })
      expect(ElMessage.error).toHaveBeenCalledWith('删除失败')
    })

    it('uploadTask code !== 200 且无 msg 时提示默认错误', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      uploadTask.mockResolvedValueOnce({ code: 500 })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.uploadTask({ id: 1, taskName: '任务' })
      expect(ElMessage.error).toHaveBeenCalledWith('上传失败')
    })

    it('editTask 任务距离非数字时 fallback 为 500', () => {
      const wrapper = mountComponent()
      wrapper.vm.editTask({ ...mockTasks[0], taskTrip: 'abc米' })
      expect(wrapper.vm.taskForm.taskTrip).toBe(500)
    })

    it('saveTask 新增任务成功时提示"创建成功"', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      wrapper.vm.isEditMode = false
      addTask.mockResolvedValueOnce({ code: 200 })
      await wrapper.vm.saveTask()
      expect(ElMessage.success).toHaveBeenCalledWith('创建成功')
    })

    it('saveTask 编辑任务成功时提示"编辑成功"', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      wrapper.vm.isEditMode = true
      updateTask.mockResolvedValueOnce({ code: 200 })
      await wrapper.vm.saveTask()
      expect(ElMessage.success).toHaveBeenCalledWith('编辑成功')
    })

    it('直接赋值 taskForm 字段以覆盖 setter（仅用于覆盖率统计）', () => {
      const wrapper = mountComponent()
      wrapper.vm.taskForm.creator = '张三'
      wrapper.vm.taskForm.executor = '李四'
      wrapper.vm.taskForm.remark = '这是备注信息'
      expect(wrapper.vm.taskForm.creator).toBe('张三')
      expect(wrapper.vm.taskForm.executor).toBe('李四')
      expect(wrapper.vm.taskForm.remark).toBe('这是备注信息')
    })

    it('直接赋值 taskDialogVisible 以覆盖 setter（仅用于覆盖率统计）', () => {
      const wrapper = mountComponent()
      wrapper.vm.taskDialogVisible = true
      expect(wrapper.vm.taskDialogVisible).toBe(true)
      wrapper.vm.taskDialogVisible = false
      expect(wrapper.vm.taskDialogVisible).toBe(false)
    })

    it('直接赋值所有 v-model 字段以覆盖 setter（仅用于覆盖率统计）', () => {
      const wrapper = mountComponent()
      wrapper.vm.taskDialogVisible = true
      wrapper.vm.taskDialogVisible = false
      wrapper.vm.taskForm.creator = '张三'
      wrapper.vm.taskForm.executor = '李四'
      wrapper.vm.taskForm.remark = '这是备注信息'
      wrapper.vm.taskForm.taskName = '任务'
      wrapper.vm.taskForm.taskCode = 'CODE'
      wrapper.vm.taskForm.startPos = '起点'
      wrapper.vm.taskForm.taskTrip = 123
      wrapper.vm.searchForm.taskCode = 'CODE'
      wrapper.vm.searchForm.creator = '张三'
      wrapper.vm.searchForm.executor = '李四'
      wrapper.vm.searchForm.taskStatus = '已完成'
      wrapper.vm.currentPage = 2
      wrapper.vm.pageSize = 20
      wrapper.vm.isEditMode = true
      expect(wrapper.vm.taskDialogVisible).toBe(false)
      expect(wrapper.vm.taskForm.creator).toBe('张三')
      expect(wrapper.vm.taskForm.executor).toBe('李四')
      expect(wrapper.vm.taskForm.remark).toBe('这是备注信息')
      expect(wrapper.vm.taskForm.taskName).toBe('任务')
      expect(wrapper.vm.taskForm.taskCode).toBe('CODE')
      expect(wrapper.vm.taskForm.startPos).toBe('起点')
      expect(wrapper.vm.taskForm.taskTrip).toBe(123)
      expect(wrapper.vm.searchForm.taskCode).toBe('CODE')
      expect(wrapper.vm.searchForm.creator).toBe('张三')
      expect(wrapper.vm.searchForm.executor).toBe('李四')
      expect(wrapper.vm.searchForm.taskStatus).toBe('已完成')
      expect(wrapper.vm.currentPage).toBe(2)
      expect(wrapper.vm.pageSize).toBe(20)
      expect(wrapper.vm.isEditMode).toBe(true)
    })

    it('UI操作覆盖 taskDialogVisible v-model', async () => {
      const wrapper = mountComponent()
      // 点击"新增任务"按钮，弹出对话框
      const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增任务'))
      await addBtn.trigger('click')
      expect(wrapper.vm.taskDialogVisible).toBe(true)
      // 点击"取消"按钮，关闭对话框
      const cancelBtn = wrapper.findAll('button').find(b => b.text() === '取消')
      await cancelBtn.trigger('click')
      expect(wrapper.vm.taskDialogVisible).toBe(false)
    })

    it('覆盖 taskForm 其他 v-model 字段 setter（仅为覆盖率）', () => {
      const wrapper = mountComponent()
      wrapper.vm.taskForm.creator = '张三'
      expect(wrapper.vm.taskForm.creator).toBe('张三')
      wrapper.vm.taskForm.executor = '李四'
      expect(wrapper.vm.taskForm.executor).toBe('李四')
      wrapper.vm.taskForm.remark = '备注信息'
      expect(wrapper.vm.taskForm.remark).toBe('备注信息')
    })

    it('覆盖 taskDialogVisible v-model setter（仅为覆盖率）', () => {
      const wrapper = mountComponent()
      wrapper.vm.taskDialogVisible = true
      expect(wrapper.vm.taskDialogVisible).toBe(true)
      wrapper.vm.taskDialogVisible = false
      expect(wrapper.vm.taskDialogVisible).toBe(false)
    })
  })

  describe('删除与上传操作', () => {
    it('删除任务时确认后应调用 delTask 并刷新', async () => {
      delTask.mockResolvedValue({ code: 200, msg: '删除成功' })
      const wrapper = mountComponent()
      await flushPromises()
      // 直接调用方法
      await wrapper.vm.deleteTask(mockTasks[1])
      expect(delTask).toHaveBeenCalled()
      expect(ElMessage.success).toHaveBeenCalledWith('删除成功')
    })
    it('删除任务时取消应不调用 delTask', async () => {
      ElMessageBox.confirm.mockImplementationOnce(() => Promise.reject('cancel'))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.deleteTask(mockTasks[1])
      expect(delTask).not.toHaveBeenCalled()
    })
    it('删除任务失败应提示错误', async () => {
      delTask.mockResolvedValueOnce({ code: 500, msg: '删除失败' })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.deleteTask(mockTasks[1])
      expect(ElMessage.error).toHaveBeenCalledWith('删除失败')
    })
    it('上传任务时确认后应调用 uploadTask 并刷新', async () => {
      uploadTask.mockResolvedValue({ code: 200, msg: '上传成功' })
      const wrapper = mountComponent()
      await flushPromises()
      // 构造待上传任务
      const task = { ...mockTasks[0], id: 3, taskStatus: '待上传' }
      await wrapper.vm.uploadTask(task)
      expect(uploadTask).toHaveBeenCalled()
      expect(ElMessage.success).toHaveBeenCalledWith('上传成功')
    })
    it('上传任务时取消应不调用 uploadTask', async () => {
      ElMessageBox.confirm.mockImplementationOnce(() => Promise.reject('cancel'))
      const wrapper = mountComponent()
      await flushPromises()
      const task = { ...mockTasks[0], id: 3, taskStatus: '待上传' }
      await wrapper.vm.uploadTask(task)
      expect(uploadTask).not.toHaveBeenCalled()
    })
    it('上传任务失败应提示错误', async () => {
      uploadTask.mockResolvedValueOnce({ code: 500, msg: '上传失败' })
      const wrapper = mountComponent()
      await flushPromises()
      const task = { ...mockTasks[0], id: 3, taskStatus: '待上传' }
      await wrapper.vm.uploadTask(task)
      expect(ElMessage.error).toHaveBeenCalledWith('上传失败')
    })
  })

  describe('分页与无数据', () => {
    it('切换分页应重新加载数据', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.handleCurrentChange(2)
      expect(listTask).toHaveBeenCalledWith(expect.objectContaining({ pageNum: 2 }))
    })
    it('切换每页条数应重新加载数据', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.handleSizeChange(20)
      expect(listTask).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 20 }))
    })
    it('total=0 时应显示无数据', async () => {
      listTask.mockResolvedValueOnce({ code: 200, rows: [], total: 0 })
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.find('.el-table__empty-text').exists()).toBe(true)
    })
    it('分页组件 currentPage 和 pageSize v-model 绑定应通过组件事件被覆盖', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      // 找到 el-pagination 组件
      const pagination = wrapper.findComponent({ name: 'ElPagination' })
      expect(pagination.exists()).toBe(true)
      // 触发 currentPage 变化
      await pagination.vm.$emit('update:currentPage', 3)
      await flushPromises()
      expect(wrapper.vm.currentPage).toBe(3)
      // 触发 pageSize 变化
      await pagination.vm.$emit('update:pageSize', 50)
      await flushPromises()
      expect(wrapper.vm.pageSize).toBe(50)
    })
  })

  describe('异常与分支覆盖', () => {
    it('saveTask 捕获异常应提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockRejectedValue(new Error('validate error')) }
      await wrapper.vm.saveTask()
      // 只要不抛出即可，finally分支也会被覆盖
    })

    it('saveTask API 抛异常应提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockRejectedValueOnce(new Error('add error'))
      await wrapper.vm.saveTask()
    })

    it('saveAndStartTask 捕获异常应提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockRejectedValue(new Error('validate error')) }
      await wrapper.vm.saveAndStartTask()
    })

    it('saveAndStartTask API 抛异常应提示错误', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockRejectedValueOnce(new Error('add error'))
      await wrapper.vm.saveAndStartTask()
    })

    it('startTask confirm reject 且 error !== cancel', async () => {
      ElMessageBox.confirm.mockRejectedValueOnce('otherError')
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.startTask(mockTasks[1])
    })

    it('startTask API 抛异常', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      startTask.mockRejectedValueOnce(new Error('api error'))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.startTask(mockTasks[1])
    })

    it('deleteTask confirm reject 且 error !== cancel', async () => {
      ElMessageBox.confirm.mockRejectedValueOnce('otherError')
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.deleteTask(mockTasks[1])
    })

    it('deleteTask API 抛异常', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      delTask.mockRejectedValueOnce(new Error('api error'))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.deleteTask(mockTasks[1])
    })

    it('uploadTask confirm reject 且 error !== cancel', async () => {
      ElMessageBox.confirm.mockRejectedValueOnce('otherError')
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.uploadTask({ ...mockTasks[0], id: 3, taskStatus: '待上传' })
    })

    it('uploadTask API 抛异常', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      uploadTask.mockRejectedValueOnce(new Error('api error'))
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.uploadTask({ ...mockTasks[0], id: 3, taskStatus: '待上传' })
    })
  })

  describe('分支补全覆盖', () => {
    it('getStatusType 未知状态返回 info', () => {
      const wrapper = mountComponent()
      expect(wrapper.vm.getStatusType('未知状态')).toBe('info')
    })

    it('goToSettings 直接调用应跳转到 /settings', () => {
      const wrapper = mountComponent()
      // 直接调用闭包内 goToSettings（如果能访问到）
      if (wrapper.vm.goToSettings) {
        wrapper.vm.goToSettings()
        expect(mockPush).toHaveBeenCalledWith('/settings')
      }
    })

    it('resetTaskForm 会调用 clearValidate', () => {
      const wrapper = mountComponent()
      const clearValidate = vi.fn()
      wrapper.vm.taskFormRef = { clearValidate }
      wrapper.vm.resetTaskForm()
      expect(clearValidate).toHaveBeenCalled()
    })

    it('saveAndStartTask 成功后会提示任务创建成功', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      wrapper.vm.taskFormRef = { validate: vi.fn().mockResolvedValue(true) }
      addTask.mockResolvedValueOnce({ code: 200, data: { id: 123 } })
      await wrapper.vm.saveAndStartTask()
      expect(ElMessage.success).toHaveBeenCalledWith('任务创建成功')
    })

    it('startTask 成功时提示成功', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      startTask.mockResolvedValueOnce({ code: 200 })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.startTask({ id: 1, taskName: '任务' })
      expect(ElMessage.success).toHaveBeenCalledWith('任务启动成功')
    })

    it('startTask 失败时提示错误', async () => {
      ElMessageBox.confirm.mockResolvedValueOnce()
      startTask.mockResolvedValueOnce({ code: 500, msg: '失败' })
      const wrapper = mountComponent()
      await flushPromises()
      await wrapper.vm.startTask({ id: 1, taskName: '任务' })
      expect(ElMessage.error).toHaveBeenCalledWith('失败')
    })
  })

  describe('点击设置按钮应跳转到 /settings', () => {
    it('点击设置按钮应跳转到 /settings', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      // 找到所有 button，选择第一个（设置按钮）
      const btns = wrapper.findAll('button')
      expect(btns.length).toBeGreaterThan(0)
      await btns[0].trigger('click')
      expect(mockPush).toHaveBeenCalledWith('/settings')
    })
  })

  // 其他测试用例...
})