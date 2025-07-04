import { createRouter, createWebHistory } from 'vue-router';
import SettingsView from '../view/SettingsView.vue';
import TaskDetailView from '../view/TaskDetailView.vue';
import TaskExecuteView from '../view/TaskExecuteView.vue';
import InitView from '../view/InitView.vue';
import TaskManageView from '../view/TaskManageView.vue';

// 1. 定义路由规则
const routes = [
    {
        path: '/',
        name: 'Init',
        component: InitView
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView
    },
    {
        path: '/task-detail/:id',
        name: 'TaskDetail',
        component: TaskDetailView,
        props: true
    },
    {
        path: '/task-execute/:id',
        name: 'TaskExecute',
        component: TaskExecuteView,
        props: true
    },
    {
        path: '/task-manage',
        name: 'TaskManage',
        component: TaskManageView
    },
    {
      path: '/:pathMatch(.*)*', // 404 页面
      name: 'NotFound',
      component: () => import('../view/NotFound.vue'),
      meta: { hidden: true }
    }
];

// 2. 创建路由实例
const router = createRouter({
    history: createWebHistory(), // 使用 HTML5 History 模式
    routes,
});

// 3. 导出路由实例，以便在 main.js 中使用
export default router;