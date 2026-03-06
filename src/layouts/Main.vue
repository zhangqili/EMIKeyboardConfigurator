<script setup lang="ts">
import { ref, onMounted, computed, h, watch } from "vue";
import { NTabs, NTab, useNotification, NButton, NDropdown, NConfigProvider, NGlobalStyle, NLayout, darkTheme, NEmpty, NIcon, NFlex } from 'naive-ui';
import { useI18n } from "vue-i18n";
import * as apis from '@/apis/api';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import * as ekc from "emi-keyboard-controller";
import { useMainStore } from "@/store/main"
import { storeToRefs } from "pinia";
import DeviceWorkspace from '@/layouts/DeviceWorkspace.vue';
import * as kle from "@ijprest/kle-serial";
import { PlusFilled as PlusIcon, CloseOutlined as CloseIcon } from '@vicons/material'

const { t } = useI18n();
const notification = useNotification();
const store = useMainStore();
const { themeName } = storeToRefs(store);

const availableDevices = ref<{ label: string; key: string; icon?: any }[]>([]);
const activeTheme = computed(() => (themeName.value === 'dark' ? darkTheme : null));
export type SafeController = Omit<ekc.KeyboardController, 'listeners'>;

interface WorkspaceTab { 
  id: string; 
  title: string; 
  deviceName: string; 
  controller: SafeController; 
}
let tabIndex = 1;
const tabs = ref<WorkspaceTab[]>([]);
const currentTab = ref<string>('');

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) { 
    if (r) setInterval(() => r.update(), 60 * 60 * 1000); // 每小时检查一次更新
  },
  onRegisterError(error: any) { 
    console.error('Service Worker 注册失败', error); 
  }
});

watch(needRefresh, (val) => {
  if (val) {
    const n = notification.info({
      title: t('main_update_title') || '发现新版本',
      content: t('main_update_content') || '配置器已有新版本可用，是否立即更新并重启？',
      action: () => h(NFlex, { justify: 'end', style: 'gap: 8px' }, [
        h(NButton, { type: 'primary', onClick: () => updateServiceWorker() }, { default: () => t('update') || '立即更新' })
      ]),
      duration: 0
    });
  }
});

function generateMiniLayoutSVGSync(jsonStr: string) {
  if (!jsonStr || jsonStr === "[]") return undefined;
  try {
    const layout = JSON.parse(jsonStr);
    const keyboard = kle.Serial.deserialize(layout);
    let maxX = 0;
    let maxY = 0;
    const rects: any[] = [];

    keyboard.keys.forEach(key => {
      maxX = Math.max(maxX, key.x + (key.width || 1));
      maxY = Math.max(maxY, key.y + (key.height || 1));
      rects.push(h('rect', {
        x: key.x + 0.05, y: key.y + 0.05, width: (key.width || 1) - 0.1, height: (key.height || 1) - 0.1,
        rx: 0.15, ry: 0.15, fill: 'currentColor',
      }));
    });

    const pad = 0.2;
    return () => h(NIcon, { size: 24 }, {
      default: () => h('svg', {
        viewBox: `-${pad} -${pad} ${maxX + pad * 2} ${maxY + pad * 2}`,
        xmlns: 'http://www.w3.org/2000/svg',
        style: 'opacity: 0.7;'
      }, rects)
    });
  } catch (e) { return undefined; }
}

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

const lastPhysicalCounts = ref<Record<string, number>>({});
let hotplugTimer: ReturnType<typeof setTimeout> | null = null;

async function checkHotplug() {
  if (!('hid' in navigator)) return;
  
  for (const deviceObj of availableDevices.value) {
    const deviceName = deviceObj.key;
    const tempController = create_controller(deviceName);
    try {
      const detected = await tempController.detect(true); 
      const currentCount = detected ? detected.length : 0;
      const previousCount = lastPhysicalCounts.value[deviceName] || 0;
      
      if (currentCount > previousCount) {
        const added = currentCount - previousCount;
        for (let i = 0; i < added; i++) { handleAddTab(deviceName); }
      } else if (currentCount < previousCount) {
        const removed = previousCount - currentCount;
        const existingTabs = tabs.value.filter(t => t.deviceName === deviceName);
        for (let i = 0; i < removed; i++) {
          if (existingTabs.length > i) {
            handleCloseTab(existingTabs[existingTabs.length - 1 - i].id);
          }
        }
      }
      lastPhysicalCounts.value[deviceName] = currentCount;
    } catch (e) {
      console.warn(`检测 ${deviceName} 状态时出错:`, e);
    }
  }
}

function triggerHotplugCheck() {
  if (hotplugTimer) clearTimeout(hotplugTimer);
  hotplugTimer = setTimeout(() => { checkHotplug(); }, 500);
}

onMounted(async () => {
  if (navigator.userAgent.toLowerCase().includes("linux") && localStorage.getItem('dontShowLinuxDetect') != 'true') {
    const linux_detect_notification = notification.warning({
      title: t('main_linux_detect_title'), content: t('main_linux_detect_content'), duration: 5000, keepAliveOnHover: true,
      action: () => [h(NButton, { text: true, type: 'primary', onClick: () => { localStorage.setItem('dontShowLinuxDetect', 'true'); linux_detect_notification.destroy(); } }, { default: () => t('dont_show_again') })]
    });
  }

  if (!('hid' in navigator) && localStorage.getItem('dontShowWebHIDDetect') != 'true') {
    const webhid_detect_notification = notification.warning({
      title: t('main_webhid_detect_title'), content: t('main_webhid_detect_content'), duration: 5000, keepAliveOnHover: true,
      action: () => [h(NButton, { text: true, type: 'primary', onClick: () => { localStorage.setItem('dontShowWebHIDDetect', 'true'); webhid_detect_notification.destroy(); } }, { default: () => t('dont_show_again') })]
    });
  }

  const result: string[] = await apis.get_devices();
  const devicesWithIcons = [];
  for (const label of result) {
    const tempController = create_controller(label);
    try {
      const jsonStr = await tempController.get_layout_json();
      devicesWithIcons.push({ 
        label, 
        key: label, 
        icon: generateMiniLayoutSVGSync(jsonStr) 
      });
    } catch (e) {
      devicesWithIcons.push({ label, key: label });
    }
  }
  availableDevices.value = devicesWithIcons;

  await checkHotplug();

  if ('hid' in navigator) {
    (navigator as any).hid.addEventListener('connect', triggerHotplugCheck);
    (navigator as any).hid.addEventListener('disconnect', triggerHotplugCheck);
  }
});

const activeTab = computed(() => tabs.value.find(t => t.id === currentTab.value));
</script>

<template>
  <n-config-provider :theme="activeTheme">
    <n-global-style />

    <div class="app-shell">
      
      <div class="tab-bar-layout">
        <n-flex :align="'center'" :wrap="false" style="gap: 6px; height: 40px;">
          <TransitionGroup name="tab-list" tag="div" class="tab-list-container">
          
            <n-button
              v-for="tab in tabs"
              size="large"
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
              <n-flex :align="'center'" :wrap="false" style="gap: 8px;">
                <component 
                   v-if="availableDevices.find(d => d.key === tab.deviceName)?.icon" 
                   :is="availableDevices.find(d => d.key === tab.deviceName)?.icon" 
                 />
                <span>{{ tab.title }}</span>

                <n-button circle quaternary :size="'tiny'" @click.stop="handleCloseTab(tab.id)">
                  <template #icon>
                    <n-icon><CloseIcon /></n-icon>
                  </template>
                </n-button>
              </n-flex>
            </n-button>
          
            <div key="add-button" class="add-btn-wrapper">
              <n-dropdown  trigger="hover" size="large" :options="availableDevices" @select="handleAddTab" placement="bottom-start">
                <n-button circle size="large" quaternary :focusable="false" class="add-tab-btn">
                  <template #icon>
                    <n-icon><PlusIcon /></n-icon>
                  </template>
                </n-button>
              </n-dropdown>
            </div>

          </TransitionGroup>
          
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

.tab-bar-layout {
  flex: 0 0 auto;
  padding: 6px 8px;
  background-color: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-border-color);
  overflow-x: auto;
}

/* 隐藏横向滚动条，更美观 */
.tab-bar-layout::-webkit-scrollbar {
  display: none;
}

/* 替代原本的 n-flex，避免 gap 属性干扰动画 */
.tab-list-container {
  display: flex;
  align-items: center;
  height: 40px;
}

/* 按钮基础样式：把间距全写在自身 margin 里，方便动画压缩 */
.tab-btn {
  padding: 0 8px 0 12px;
  margin-right: 6px;
  max-width: 250px;
  overflow: hidden;
  flex-shrink: 0;
  white-space: nowrap;
}

.add-btn-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

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
  background-color: var(--n-border-color);
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

.tab-list-move,
.tab-list-enter-active,
.tab-list-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

/* 进入和离开时：不仅透明度归零，把所有撑开体积的属性全压没！ */
.tab-list-enter-from,
.tab-list-leave-to {
  opacity: 0;
  max-width: 0px !important;
  min-width: 0px !important;
  padding-left: 0px !important;
  padding-right: 0px !important;
  margin-right: 0px !important;
  border-width: 0px !important;
  transform: scale(0.9); /* 配合轻微缩小，效果更 Q 弹 */
}
</style>