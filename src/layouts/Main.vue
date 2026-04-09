<script setup lang="ts">
import { ref, onMounted, computed, h, watch, onBeforeUnmount } from "vue";
import { NTabs, NTab, useNotification, NButton, NDropdown, NConfigProvider, NGlobalStyle, NLayout, darkTheme, NEmpty, NIcon, NFlex, NSpace } from 'naive-ui';
import { useI18n } from "vue-i18n";
import * as apis from '@/apis/api';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import * as ekc from "emi-keyboard-controller";
import { useMainStore } from "@/store/main"
import { storeToRefs } from "pinia";
import DeviceWorkspace from '@/layouts/DeviceWorkspace.vue';
import * as kle from "@ijprest/kle-serial";
import { PlusFilled as PlusIcon, CloseOutlined as CloseIcon } from '@vicons/material'
import WorkspaceTabComponent from '@/components/WorkspaceTab.vue';
import TabBar from '@/components/TabBar.vue'
import { setI18nLanguage } from "@/locales/i18n";
const channel = new BroadcastChannel('app_duplicate_check_channel');
export type SafeController = Omit<ekc.KeyboardController, 'listeners'>;

const { t } = useI18n();
const notification = useNotification();
const store = useMainStore();
const { themeName, lang } = storeToRefs(store);

const availableDevices = ref<{ label: string; key: string; icon?: any }[]>([]);
const activeTheme = computed(() => (themeName.value === 'dark' ? darkTheme : null));

if (navigator.language === "zh-CN") { lang.value = "zh"; setI18nLanguage('zh'); }

interface WorkspaceTab {
  id: string;
  title: string;
  deviceName: string;
  controller: SafeController;
  status?: 'disconnected' | 'connected' | 'ready';
}
let tabIndex = 1;
const tabs = ref<WorkspaceTab[]>([]);
const currentTab = ref<string>('');

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
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
      title: t('main_new_version_title'),
      content: t('main_new_version_content'),
      action: () => [h(NButton, {
        text: true, type: 'primary',
        onClick: () => updateServiceWorker() 
      }, { default: () => t('main_refresh_now') })],
      duration: 0
    });
  }
});

watch(offlineReady, (val) => {
  if (val) {
    notification.success({
      title: t('main_offline_ready_title'),
      content: t('main_offline_ready_content'),
      duration: 5000,
      keepAliveOnHover: true
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
    case "Oholeo Keyboard V2": ctrl = new ekc.OholeoKeyboardV2Controller(); break;
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
  tabs.value.push({ id, title: deviceName, deviceName, controller: create_controller(deviceName), status: 'disconnected' });
  currentTab.value = id;
}

function handleReorder(fromIndex: number, toIndex: number) {
  const draggedTab = tabs.value[fromIndex];
  tabs.value.splice(fromIndex, 1);
  tabs.value.splice(toIndex, 0, draggedTab);
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
      title: t('main_linux_detect_title'),
      content: t('main_linux_detect_content'), duration: 5000, keepAliveOnHover: true,
      action: () =>  
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            localStorage.setItem('dontShowLinuxDetect', 'true'); 
            linux_detect_notification.destroy();
          }
        },
        {
          default: () => t('dont_show_again')
        }
      )
    });
  }

  if (!('hid' in navigator) && localStorage.getItem('dontShowWebHIDDetect') != 'true') {
    const webhid_detect_notification = notification.warning({
      title: t('main_webhid_detect_title'),
      content: t('main_webhid_detect_content'), duration: 5000,
      keepAliveOnHover: true,
      action: () => 
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            localStorage.setItem('dontShowWebHIDDetect', 'true');
            webhid_detect_notification.destroy();
          }
        },
        {
          default: () => t('dont_show_again')
        }
      )
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
  channel.onmessage = (event) => {
    if (event.data === 'ping') {
      channel.postMessage('pong');
    } else if (event.data === 'pong') {
      const other_detect_notification = notification.warning({
        title: t('main_other_detect_title'),
        content: t('main_other_detect_content'),
      });
    }
  };

  channel.postMessage('ping');
});

onBeforeUnmount(() => {
  channel.close();
});

const activeTab = computed(() => tabs.value.find(t => t.id === currentTab.value));
</script>

<template>
  <n-config-provider :theme="activeTheme">
    <n-global-style />

    <div class="app-shell">
      <TabBar :tabs="tabs" v-model:currentTab="currentTab" :availableDevices="availableDevices" @close="handleCloseTab"
        @add="handleAddTab" @reorder="handleReorder" />

      <div class="workspace-viewport">
        <DeviceWorkspace v-for="tab in tabs" :key="tab.id" v-show="currentTab === tab.id" :device-name="tab.deviceName"
          :controller="tab.controller" @update-status="(s: any) => tab.status = s" />
        <DeviceWorkspace v-if="tabs.length === 0" device-name="" :controller="undefined" />
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

.workspace-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.workspace-viewport> :first-child {
  flex: 1;
  height: 100%;
}
</style>