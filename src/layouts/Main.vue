<script setup lang="ts">
import { ref, onMounted, computed, h, watch, onBeforeUnmount} from "vue";
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
import WorkspaceTabComponent from '@/components/WorkspaceTab.vue';
import TabBar from '@/components/TabBar.vue'
import { setI18nLanguage } from "@/locales/i18n";
//const channel = new BroadcastChannel('app_duplicate_check_channel');
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
  // 新增：标识是否为演示模式
  isDemo?: boolean;
  // 新增：记录该标签页绑定的物理设备索引
  physicalIndex?: number;
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
    case "Open28S": ctrl = new ekc.Open28SController(); break;
    case "ANSI 104 Sample": ctrl = new ekc.ANSI104SampleController(); break;
    default: ctrl = new ekc.ANSI104SampleController();
  }
  return ctrl as SafeController;
}

// 重构：支持指定演示模式和物理设备索引，并完美隔离物理连接
function handleAddTab(deviceName: string, isDemo: boolean = false, physicalIndex: number = 0) {
  const id = `tab-${tabIndex++}`;
  const ctrl = create_controller(deviceName);

  if (isDemo) {
    // 演示模式：完全阻断设备探测与连接
    ctrl.detect = async () => [];
    ctrl.connect = async () => false;
  } else {
    // 物理模式：拦截 detect 方法
    const originalDetect = ctrl.detect.bind(ctrl);
    ctrl.detect = async (silent?: boolean) => {
      // 1. 强制使用静默模式 (传入 true，等同于 navigator.hid.getDevices()) 
      // 获取当前所有已授权并在电脑上插着的该型号设备
      const devs: any[] = await originalDetect(true); 
      
      // 2. 如果成功拿到，并且数量能覆盖当前标签页的物理索引
      if (devs && devs.length > physicalIndex) {
        // 直接返回与此标签页对应的这唯一一个设备！
        // 因为返回的数组里只有 1 个设备，DeviceWorkspace.vue 中的 connect(d[0]) 就会直接秒连，彻底不再弹窗！
        return [devs[physicalIndex]];
      }
      
      // 3. 只有在静默获取不到（比如设备还没授权）时，才按原样执行可能会弹窗的操作
      const fallbackDevs = await originalDetect(silent);
      if (fallbackDevs && fallbackDevs.length > 0) {
        return fallbackDevs;
      }

      return [];
    };
  }

  // UI区分显示：演示模式增加后缀
  const displayTitle = isDemo ? `${deviceName} ${'('+t('demo')+')'}` : deviceName;

  tabs.value.push({ 
    id, 
    title: displayTitle, 
    deviceName, 
    controller: ctrl, 
    status: 'disconnected',
    isDemo,
    physicalIndex
  });
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
        for (let i = 0; i < added; i++) { 
          // 热插拔：传入 isDemo=false，并赋予其专门的 physicalIndex
          handleAddTab(deviceName, false, previousCount + i); 
        }
      } else if (currentCount < previousCount) {
        const removed = previousCount - currentCount;
        // 移除设备时，只处理真实的物理标签页，忽略演示标签页
        const existingTabs = tabs.value.filter(t => t.deviceName === deviceName && !t.isDemo);
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
/*
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
*/
});

onBeforeUnmount(() => {
  //channel.close();
});

const activeTab = computed(() => tabs.value.find(t => t.id === currentTab.value));
</script>

<template>
  <n-config-provider :theme="activeTheme">
    <n-global-style />

    <div class="app-shell">
      <TabBar :tabs="tabs" v-model:currentTab="currentTab" :availableDevices="availableDevices" @close="handleCloseTab"
        @add="(name) => handleAddTab(name, true)" @reorder="handleReorder" />

      <div class="workspace-viewport">
        <DeviceWorkspace v-for="tab in tabs" :key="tab.id" v-show="currentTab === tab.id" :device-name="tab.deviceName"
          :controller="tab.controller" :is-demo="tab.isDemo" @update-status="(s: any) => tab.status = s" />
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