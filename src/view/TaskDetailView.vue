<!-- XXX：接口不确定 list or live？ -->
<template>
  <div class="layout">
    <el-container class="fullscreen">
      <el-header class="breadcrumb-bar">
        <el-breadcrumb separator="/" class="breadcrumb-text">
          <el-breadcrumb-item :to="{ path: '/' }">地铁隧道巡检系统</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/task-manage' }">任务列表</el-breadcrumb-item>
          <el-breadcrumb-item>任务详情</el-breadcrumb-item>
        </el-breadcrumb>
        <el-button type="primary" :icon="ArrowLeft" @click="goBack"
          >返回</el-button
        >
      </el-header>

      <el-main class="main-content">
        <div class="viewer-section">
          <div class="image-viewer">
            <el-image
              v-if="currentFlaw"
              :key="currentFlaw.id"
              :src="image_base_url + currentFlaw.flawImageUrl"
              :preview-src-list="[image_base_url + currentFlaw.flawImageUrl]"
              fit="contain"
              hide-on-click-modal
              style="width: 100%; height: 100%"
            >
              <template #error>
                <div class="image-placeholder">
                  <span>{{ currentFlaw.flawName }} (图片加载失败)</span>
                </div>
              </template>
            </el-image>
            <div v-else class="image-placeholder">
              <span>请选择一个故障</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-wrapper">
              <span class="progress-label start">0m</span>
              <span class="progress-label end">{{ taskTotalDistance }}m</span>

              <div class="progress-line">
                <div class="progress-fill"></div>

                <div
                  v-for="flaw in flaws"
                  :key="flaw.id"
                  class="flaw-marker"
                  :class="getFlawStatusClass(flaw)"
                  :style="{
                    left: (flaw.flawDistance / taskTotalDistance) * 100 + '%',
                  }"
                  :title="flaw.flawName"
                  @click="openDetailDialog(flaw)"
                >
                  📍
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar">
          <div class="info-card">
            <h3>任务信息</h3>
            <div class="info-item">
              <span>📄 任务编号:</span> {{ taskInfo.id }}
            </div>
            <div class="info-item">
              <span>⏰ 巡视完成时间:</span> {{ taskInfo.endTime }}
            </div>
            <div class="info-item">
              <span>📍 巡视距离:</span> {{ taskInfo.taskTrip }}
            </div>
            <div class="info-item">
              <span>⚠️ 故障总数:</span> {{ flaws.length }}
            </div>
            <div class="info-item">
              <span>✅ 已确认:</span> {{ confirmedCount }}
            </div>
            <div class="info-item">
              <span>❓ 疑似故障:</span> {{ unconfirmedCount }}
            </div>
          </div>
          <div class="info-card table-card">
            <h3>故障历史</h3>
            <el-table
              :data="flaws"
              height="100%"
              style="width: 100%"
              highlight-current-row
              :row-class-name="getRowClassName"
              @row-click="openDetailDialog"
            >
              <el-table-column label="名称" width="120">
                <template #default="scope">
                  <a
                    class="quick-view-link"
                    @click.stop="quickViewImage(scope.row)"
                  >
                    {{ scope.row.flawName }}
                  </a>
                </template>
              </el-table-column>
              <el-table-column prop="flawType" label="类型" width="120" />
              <el-table-column prop="flawDistance" label="位置(m)" />
            </el-table>
          </div>
        </div>
      </el-main>
    </el-container>

    <el-dialog
      v-model="dialogVisible"
      title="故障详情确认"
      width="1150px"
      top="5vh"
    >
      <div v-if="editFault" class="dialog-content">
        <div class="dialog-image-container">
          <el-image
            :src="image_base_url + editFault.flawImageUrl"
            :preview-src-list="[image_base_url + editFault.flawImageUrl]"
            fit="contain"
            style="width: 100%; height: 100%"
          />
        </div>
        <div class="dialog-form-container">
          <el-form :model="editFault" label-position="top">
            <el-descriptions :column="1" title="故障信息" border>
              <el-descriptions-item label="缺陷名称">{{
                editFault.flawName
              }}</el-descriptions-item>
              <el-descriptions-item label="缺陷类型">{{
                editFault.flawType
              }}</el-descriptions-item>
              <el-descriptions-item label="精准位置"
                >{{ editFault.flawDistance }} 米</el-descriptions-item
              >
              <el-descriptions-item label="缺陷描述">{{
                editFault.flawDesc || '无'
              }}</el-descriptions-item>
            </el-descriptions>
            <el-form-item label="状态确认" style="margin-top: 20px">
              <el-radio-group v-model="editFault.confirmed">
                <el-radio :value="true">🔴 已确认属实</el-radio>
                <el-radio :value="null">🟠 疑似缺陷</el-radio>
                <el-radio :value="false">⚪️ 确认为误报</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="补充说明">
              <el-input
                v-model="editFault.remark"
                type="textarea"
                :rows="6"
                placeholder="请输入处理建议或现场情况说明"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button
            type="primary"
            @click="saveFaultDetails"
            :loading="isSaving"
          >
            {{ isSaving ? '保存中...' : '确认并保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  ElMessage,
} from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { getTask } from '../api/task.js';
import { listFlaw, updateFlaw, liveInfo } from '../api/flaw.js';
import { useRoute, useRouter } from 'vue-router';

const image_base_url = "http://192.168.2.57/prod-api/file";
const route = useRoute();
const router = useRouter();

const isSaving = ref(false);
const dialogVisible = ref(false);
const taskTotalDistance = ref(0);

const taskInfo = ref({
  id: null,
  taskCode: '',
  taskName: '',
  startPos: '',
  taskTrip: '',
  creator: '',
  executor: '',
  execTime: '',
  endTime: '',
  createTime: '',
  taskStatus: '',
  round: 0,
  uploaded: false,
  remark: '',
  cloudTaskId: null,
  deleteFlag: false,
});

const flaws = ref([]);
const currentFlaw = ref(null);
const editFault = ref(null);

const confirmedCount = computed(() =>
  flaws.value.filter(f => f.confirmed === true).length
);
const suspectedCount = computed(() =>
  flaws.value.filter(f => f.confirmed === null).length
);
const unconfirmedCount = computed(() =>
  flaws.value.filter(f => f.confirmed === false).length
);

const getFlawStatusClass = (flaw) => {
  if (flaw.confirmed === true) return 'confirmed';
  if (flaw.confirmed === false) return 'false';
  return 'unconfirmed';
};

const getRowClassName = ({ row }) => {
  return getFlawStatusClass(row);
};

const quickViewImage = (flaw) => {
  currentFlaw.value = flaw;
  ElMessage.success(`快速预览: ${flaw.flawName}`);
};

const openDetailDialog = (flaw) => {
  currentFlaw.value = flaw;
  editFault.value = JSON.parse(JSON.stringify(flaw));
  dialogVisible.value = true;
};

const saveFaultDetails = async () => {
  if (!editFault.value) return;
  isSaving.value = true;
  try {
    const res = await updateFlaw(editFault.value);
    if (res.code === 200) {
      // 更新 flaws 列表对应项
      const idx = flaws.value.findIndex(f => f.id === editFault.value.id);
      if (idx !== -1) flaws.value[idx] = JSON.parse(JSON.stringify(editFault.value));
      ElMessage.success('故障状态已更新！');
      dialogVisible.value = false;
    } else {
      ElMessage.warning(`保存失败: ${res.msg}`);
    }
  } catch (error) {
    ElMessage.error('保存出错');
    console.error('updateFlaw error:', error);
  } finally {
    isSaving.value = false;
  }
};

const goBack = () => {
  router.back();
};

onMounted(async () => {
  const taskId = route.params['id'];
  if (!taskId) {
    ElMessage.error('任务ID不存在');
    return;
  }

  try {
    const taskRes = await getTask(taskId);
    if (taskRes.code === 200) {
      Object.assign(taskInfo.value, taskRes.data);
      taskTotalDistance.value = parseFloat(taskInfo.value.taskTrip); // 任务距离，单位米，假设格式是 "500米"
    } else {
      ElMessage.warning(`任务数据异常: ${taskRes.msg}`);
    }
  } catch (error) {
    ElMessage.error('加载任务失败');
    console.error('getTask error:', error);
  }

  try {
    const flawRes = await liveInfo(taskId);
    console.log(flawRes)
    if (flawRes.code === 200) {
      flaws.value = flawRes.data;
      currentFlaw.value = flaws.value[0] || null;
    } else {
      ElMessage.warning(`加载缺陷列表异常: ${flawRes.msg}`);
    }
  } catch (error) {
    ElMessage.error('加载缺陷列表失败');
    console.error('liveInfo error:', error);
  }
});
</script>


<style scoped>
.layout,
.fullscreen {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  box-sizing: border-box;
}
.layout {
  background: #fff;
  color: #333;
}
.fullscreen {
  display: flex;
  flex-direction: column;
}
.breadcrumb-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
  height: 60px;
  flex-shrink: 0;
}
.main-content {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  padding: 20px;
  min-height: 0;
  gap: 20px;
  box-sizing: border-box;
}
.viewer-section {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.image-viewer {
  flex: 1;
  background: #000;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 0;
}
.image-placeholder {
  color: #909399;
  font-size: 1.2rem;
  text-align: center;
  padding: 20px;
}
.progress-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 40px; /* 左右留出一些空间给标签 */
}
.progress-bar-wrapper {
  width: 100%;
  position: relative;
  padding-top: 20px; /* 为顶部标签留出空间 */
}
.progress-label {
  position: absolute;
  top: 0;
  font-size: 12px;
  color: #606266;
}
.progress-label.start {
  left: 0;
}
.progress-label.end {
  right: 0;
}
.progress-line {
  height: 8px;
  background-color: #e4e7ed; /* 轨道的灰色背景 */
  border-radius: 4px;
  position: relative;
}
.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%; /* 因为是已完成任务的复盘，所以默认100% */
  background-color: var(--el-color-primary); /* 使用Element Plus的主题蓝 */
  border-radius: 4px;
}

/* 故障标记的位置 */
.flaw-marker {
  z-index: 10;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-size: 12px;
  color: #fff;
  position: absolute;
  top: -6px;
  transform: translateX(-50%);
  cursor: pointer;
}
.flaw-marker.confirmed {
  background: var(--el-color-danger);
}
.flaw-marker.unconfirmed {
  background: var(--el-color-warning);
}
.flaw-marker.false {
  background: var(--el-color-info);
}
.sidebar {
  width: 400px;
  background: #fff;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  flex-shrink: 0;
}
.info-card {
  border: 1px solid #eee;
  border-radius: 4px;
  background: #fdfdfd;
}
.info-card h3 {
  font-size: 16px;
  margin: 0;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}
.info-card .info-item {
  margin-bottom: 12px;
  font-size: 14px;
  padding: 0 20px;
}
.info-card .info-item:first-of-type {
  padding-top: 20px;
}
.info-card .info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 20px;
}
.info-card .info-item span {
  display: inline-block;
  min-width: 120px;
  color: #666;
}
.table-card {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}
.table-card h3 {
  flex-shrink: 0;
}
:deep(.table-card .el-card__body) {
  padding: 0 !important;
  flex-grow: 1;
  min-height: 0;
}
:deep(.el-table .el-table__row.confirmed) {
  background-color: var(--el-color-danger-light-9);
}
:deep(.el-table .el-table__row.unconfirmed) {
  background-color: var(--el-color-warning-light-9);
}
:deep(.el-table .el-table__row.false) {
  background-color: var(--el-color-info-light-9);
}
:deep(.el-table__body tr.confirmed:hover > td),
:deep(.el-table__body tr.unconfirmed:hover > td),
:deep(.el-table__body tr.false:hover > td) {
  background-color: var(--el-table-row-hover-bg-color);
}

/* --- 对话框内部样式 --- */
.dialog-content {
  display: flex;
  gap: 20px;
  height: 65vh; /* 确保对话框内容有足够高度 */
}
.dialog-image-container {
  width: 65%;
  background-color: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-form-container {
  width: 35%;
  display: flex;
  flex-direction: column;
}
.dialog-image-placeholder {
  color: #909399;
  font-size: 1rem;
}
:deep(.el-descriptions__title) {
  font-size: 16px;
}
.el-form-item {
  margin-bottom: 18px;
}

/* 新增一个用于快速预览的链接样式 */
.quick-view-link {
  color: var(--el-color-primary);
  text-decoration: none;
  cursor: pointer;
}
.quick-view-link:hover {
  text-decoration: underline;
}

/* 对话框内单选按钮样式优化 */
.el-radio-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.breadcrumb-text {
  font-size: 14px;
}
.el-breadcrumb__inner {
  color: #409eff;
  cursor: pointer;
}
</style>