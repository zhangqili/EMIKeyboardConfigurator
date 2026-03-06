<script setup lang="ts">
import { ref, onMounted, computed, h } from "vue";
import { NTabs, NTab, useNotification, NButton, NDropdown, NConfigProvider, NGlobalStyle, NLayout, darkTheme, NEmpty } from 'naive-ui';
import { useI18n } from "vue-i18n";
import * as apis from '@/apis/api';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import * as ekc from "emi-keyboard-controller";
import { useMainStore } from "@/store/main"
import { storeToRefs } from "pinia";
import DeviceWorkspace from '@/layouts/DeviceWorkspace.vue';
import { PlusFilled as PlusIcon, CloseOutlined as CloseIcon } from '@vicons/material'

const { t } = useI18n();
const notification = useNotification();
const store = useMainStore();
const { themeName } = storeToRefs(store);

// 供新建标签页时选择的设备列表
const availableDevices = ref<{ label: string; key: string }[]>([]);
const activeTheme = computed(() => (themeName.value === 'dark' ? darkTheme : null));
export type SafeController = Omit<ekc.KeyboardController, 'listeners'>;
// 定义标签页的数据结构
interface WorkspaceTab { 
  id: string; 
  title: string; 
  deviceName: string; 
  controller: SafeController; 
}
let tabIndex = 1;
const tabs = ref<WorkspaceTab[]>([]);
const currentTab = ref<string>('');

function create_controller(device: string): SafeController {
  let ctrl: any;
  switch (device) {
    case "Trinity Pad": ctrl = new ekc.TrinityPadController(); break;
    case "Oholeo Keyboard": ctrl = new ekc.OholeoKeyboardController(); break;
    case "Oholeo Keyboard v2": ctrl = new ekc.OholeoKeyboardV2Controller(); break;
    case "Zellia60 HE": ctrl = new ekc.Zellia60Controller(); break;
    case "Zellia80 HE": ctrl = new ekc.Zellia80Controller(); break;
    case "Zellia Starlight": ctrl = new ekc.ZelliaStarlightController(); break;
    case "Destrez Asural Left": ctrl = new ekc.DestrezAsuralLeftController(); break;
    case "Destrez Asural Right": ctrl = new ekc.DestrezAsuralRightController(); break;
    case "ANSI 104 Sample": ctrl = new ekc.ANSI104SampleController(); break;
    default: ctrl = new ekc.ANSI104SampleController();
  }
  return ctrl as SafeController;
}

function handleAddTab(deviceName: string) {
  const id = `tab-${tabIndex++}`;
  tabs.value.push({ id, title: deviceName, deviceName, controller: create_controller(deviceName) });
  currentTab.value = id;
}

function handleCloseTab(id: string) {
  const index = tabs.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    tabs.value[index].controller.disconnect(); 
    tabs.value.splice(index, 1);
    if (currentTab.value === id && tabs.value.length > 0) {
      currentTab.value = tabs.value[Math.max(0, index - 1)].id;
    }
  }
}

onMounted(async () => {
  const result: string[] = await apis.get_devices();
  availableDevices.value = result.map(label => ({ label, key: label }));

  let detectedCount = 0;
  for (const deviceName of result) {
    const tempController = create_controller(deviceName);
    try {
      const detected = await tempController.detect(true); 
      if (detected && detected.length > 0) {
        for (let i = 0; i < detected.length; i++) {
          handleAddTab(deviceName);
          detectedCount++;
        }
      }
    } catch (e) { console.warn(e); }
  }
  //if (detectedCount === 0 && result.length > 0) handleAddTab(result[0]);
});

const activeTab = computed(() => tabs.value.find(t => t.id === currentTab.value));
</script>
<template>
  <n-config-provider :theme="activeTheme">
    <n-global-style />

    <div class="app-shell">
      
      <div class="tab-bar-layout">
        <n-flex :align="'center'" :wrap="false" style="gap: 6px; height: 40px;">
          
          <n-button
            v-for="tab in tabs"
            :key="tab.id"
            :class="{ 'is-active': currentTab === tab.id }"
            :tertiary="currentTab === tab.id"
            :quaternary="currentTab !== tab.id"
            :focusable="false"
            @click="currentTab = tab.id"
            @mousedown.middle.prevent
            @auxclick.middle.stop="handleCloseTab(tab.id)"
            class="tab-btn"
          >
            <n-flex :align="'center'" style="gap: 8px;">
              <span>{{ tab.title }}</span>
              
              <n-button circle quaternary :size="'tiny'" @click.stop="handleCloseTab(tab.id)">
                <template #icon>
                  <n-icon><CloseIcon /></n-icon>
                </template>
              </n-button>
            </n-flex>
          </n-button>

          <n-dropdown :options="availableDevices" @select="handleAddTab" trigger="click">
            <n-button circle size="large" quaternary :focusable="false" class="add-tab-btn">
              <template #icon>
                <n-icon><PlusIcon /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
          
        </n-flex>
      </div>

      <div class="workspace-viewport">
        <DeviceWorkspace
          v-if="tabs.length > 0 && activeTab"
          :key="activeTab.id"
          :device-name="activeTab.deviceName"
          :controller="activeTab.controller"
        />
        <DeviceWorkspace
          v-else
          device-name=""
          :controller="undefined" 
        />
      </div>
    </div>
  </n-config-provider>
</template>

<style scoped>
.app-shell {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden !important;
  margin: 0;
  padding: 0;
}

/* 标签栏专属背景区 */
.tab-bar-layout {
  flex: 0 0 auto;
  padding: 6px 8px;
  background-color: var(--n-color-embedded); /* 自动适应深浅色 */
  border-bottom: 1px solid var(--n-border-color);
  overflow-x: auto;
}

/* 隐藏横向滚动条，更美观 */
.tab-bar-layout::-webkit-scrollbar {
  display: none;
}

/* 稍微修正按钮内边距 */
.tab-btn {
  padding: 0 8px 0 12px;
}

/* 手搓的关闭按钮，完美还原 Naive UI 的 hover 效果 */
.tab-close-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: var(--n-text-color);
  opacity: 0.5;
  transition: all 0.2s;
}

.tab-close-icon:hover {
  opacity: 1;
  background-color: var(--n-border-color); /* 鼠标悬浮时出现背景块 */
}

.add-tab-btn {
  width: 32px;
  height: 32px;
}

.workspace-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.workspace-viewport > :first-child {
  flex: 1;
  height: 100%;
}
</style>