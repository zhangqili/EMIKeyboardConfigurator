<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, computed, h, getCurrentInstance, triggerRef } from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex, NButton, NSplit, NScrollbar} from 'naive-ui'
import * as apis from '../apis/api'
import * as ekc from "emi-keyboard-controller";
import { DynamicKeyToKeyName, keyBindingModifierToString, keyCodeToKeyName, keyCodeToString, KeyConfig, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex, mapDynamicKey, mapBackDynamicKey, LayoutGroup } from "../apis/utils";
import { useMainStore } from "../store/main"
import { storeToRefs } from "pinia";
import { DebugDataItem } from '../apis/utils';
import type { MenuOption, NotificationType } from 'naive-ui'
import { useNotification } from 'naive-ui'
import DynamicKeyPanel from "./DynamicKeyPanel.vue";
import RGBPanel from "./RGBPanel.vue";
import PerformancePanel from "./PerformancePanel.vue";
import KeymapPanel from "./KeymapPanel.vue";
import DebugPanel from "./DebugPanel.vue";
import KeyboardRender from "./KeyboardRender.vue";
import AboutPanel from "./AboutPanel.vue";
import ScriptPanel from "./ScriptPanel.vue";
import MacroPanel from "./MacroPanel.vue";
import cloneDeep from "lodash/cloneDeep";
import { setI18nLanguage } from "../locales/i18n";

interface Window {
  showOpenFilePicker?: any;
  showSaveFilePicker?: any;
}

const { t } = useI18n();
const store = useMainStore();
const {
  lang,
  selected_device,
  advanced_key,
  rgb_config,
  dynamic_key,
  dynamic_key_index,
  advanced_keys,
  rgb_base_config,
  rgb_configs,
  keymap,
  key_binding,
  current_layer,
  tab_selection,
  config_files,
  selected_config_file_index,
  debug_raw_chart_option,
  debug_value_chart_option,
  dynamic_keys,
  keyboard_keys,
  theme_name,
  firmware_version
} = storeToRefs(store);

const message = useMessage();
const notification = useNotification();
const isConnected = ref<boolean>(false);

const latest_version = ref({
  major: 0,
  minor: 1,
  patch: 0,
  info: "beta"
});

const versionStatusType = computed(() => {
  console.log(firmware_version.value)
  const current = firmware_version.value;
  const target = latest_version.value;
  if (current.major !== target.major || current.minor !== target.minor) {
    return 'error';
  }
  if (current.patch !== target.patch || current.info != target.info) {
    return 'warning';
  }
  return 'success';
});

const isReady = computed(()=>{
  return isConnected.value && (versionStatusType.value == 'warning' || versionStatusType.value == 'success');
})
const displayVersion = computed(() => {
  const v = firmware_version.value;
  const base = `${v.major}.${v.minor}.${v.patch}`;
  const ver = v.info ? `${base}-${v.info}` : base;
  return ((versionStatusType.value == 'warning' || versionStatusType.value == 'error') && isConnected.value) ? ver + t('need_update') : ver;
});
// Split 面板的大小 (字符串形式，如 "400px")
const splitSize = ref("400px");
// 是否处于“自动高度”模式
const isAutoHeight = ref(true);
// 记录内容真实高度
const contentRealHeight = ref(400);
const maxSplitSize = computed(() => {
  return (contentRealHeight.value + splitBuffer) + 'px';
});
const isDragging = ref(false);
const enableTransition = ref(false);
// 获取内部内容容器的引用
const keyboardContentRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const footerRef = ref<HTMLElement | null>(null);
const splitBuffer = 4;
onMounted(() => {
  if (keyboardContentRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        contentRealHeight.value = h;

        // 【关键】内容变化导致的调整，必须是瞬时的，否则会感觉到迟滞
        // 确保此时关闭动画

        if (isAutoHeight.value) {
           splitSize.value = (h + splitBuffer) + 'px'; 
        } 
        else {
           const currentSplitPx = parseFloat(splitSize.value);
           // 如果当前高度已经足够容纳内容（接近自动高度），则吸附过去
           if (currentSplitPx > h + 10) {
             isAutoHeight.value = true;
             splitSize.value = (h + splitBuffer) + 'px';
           }
        }
      }
    });
    resizeObserver.observe(keyboardContentRef.value.firstElementChild as Element || keyboardContentRef.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

// 处理拖拽结束事件：判断是否需要“吸附”
function handleDragEnd() {
  isDragging.value = false;
  const currentPx = parseFloat(splitSize.value);

  if (currentPx >= contentRealHeight.value - 5) {
    isAutoHeight.value = true;
    splitSize.value = maxSplitSize.value;
  } else {
    isAutoHeight.value = false;
  }
}

// 处理拖拽开始：临时关闭自动模式，避免冲突
function handleDragStart() {
  isAutoHeight.value = false;
  isDragging.value = true;
  enableTransition.value = false; // 拖拽时禁用动画
}

// 双击分割条：重置为自动高度
function resetToAuto() {
  isAutoHeight.value = true;
  splitSize.value = (contentRealHeight.value + splitBuffer) + 'px';
}

// 折叠/展开按钮逻辑
function toggleCollapse() {// 1. 开启动画
  enableTransition.value = true;

  nextTick(() => {
      const currentPx = parseFloat(splitSize.value);
      if (currentPx < 50) {
        resetToAuto();
      } else {
        isAutoHeight.value = false;
        splitSize.value = "0px";
      }

      // 2. 动画结束后关闭开关
      setTimeout(() => {
        enableTransition.value = false;
      }, 350);
  });
}

const themeLabelMap = computed(() => ({
  dark: t('light'),
  light: t('dark')
} satisfies Record<string, string>));

const keyboard_layout = ref({
  json: undefined,
  text: JSON.stringify(kle.Serial.deserialize([]), null, 2),
});

var devices = ref<{ label: string; value: number }[]>([]);

var files = ref<{ label: string; value: number }[]>([]);

function renderKeyboardFromJson(json_str: string) {
  var layout = JSON.parse(json_str);
  try {
    const parsedKeyboard = kle.Serial.deserialize(layout);
    updateKeyboard(parsedKeyboard);
  } catch (error) {
    message.error('Failed to parse keyboard layout');
  }
}

function parseLayoutGroup(str: string): LayoutGroup | undefined {
  if (str == "" || str == undefined) {
    return undefined;
  }
  const [groupStr, optStr] = str.split(',');
  return { groupId: parseInt(groupStr), id: parseInt(optStr) };
}

function updateKeyboard(value: kle.Keyboard) {
  value.keys.forEach((key: kle.Key) => {
    for (const prop in key) {
      if (typeof (key as any)[prop] === "number" && !isNaN((key as any)[prop])) {
        (key as any)[prop] = parseFloat((key as any)[prop].toFixed(6));
      }
    }
  });
  keyboard_layout.value.text = JSON.stringify(value, null, 2);
  keyboard_keys.value = value.keys.map((k, i) => {
    return {
      ...k,
      id: (Number.isNaN(parseInt(k.labels[0])) ? i : parseInt(k.labels[0])),
      layoutGroup: parseLayoutGroup(k.labels[8])
    };
  });
}

async function connectCommand() {
  if (isConnected.value) {
    await apis.disconnect_device();
    isConnected.value = false;
  }
  else {
    if (selected_device != undefined) {
      var result = await apis.connect_device();
      isConnected.value = result;
      if (isConnected.value) {
        message.success(t('main_found_device'));
      }
      else {
        message.error(t('main_device_not_found'));
      }
      //await apis.receive_data_in_background();
    }
  }
}

async function saveCommand() {
  if (isConnected.value) {
    apis.set_advanced_keys(advanced_keys.value);
    apis.set_rgb_base_config(rgb_base_config.value);
    if (keymap.value != undefined) {
      apis.set_keymap(keymap.value);
    }
    apis.set_rgb_configs(rgb_configs.value);
    apis.set_dynamic_keys(dynamic_keys.value);
    var result = await apis.save_config();
    console.debug(result);

  }
}

async function flashCommand() {
  if (isConnected.value) {
    var result = await apis.flash_config();
    console.debug(result);

  }
}

async function getController() {
  advanced_keys.value = await apis.get_advanced_keys();
  keymap.value = await apis.get_keymap();
  rgb_base_config.value = await apis.get_rgb_base_config();
  rgb_configs.value = await apis.get_rgb_configs();
  dynamic_keys.value = await apis.get_dynamic_keys();
  firmware_version.value = await apis.get_firmware_version();
  selected_config_file_index.value = await apis.get_config_file_index();
  const cnofig_file_num = await apis.get_config_file_num();
  layout_labels.value = await apis.get_layout_labels();
  files.value.length = 0;
  for (let index = 0; index < cnofig_file_num; index++) {
    files.value.push({
      label: "Config" + index.toString(),
      value: index,
    });
  }
  current_layer.value = 0;
  triggerRef(keymap);
  //console.debug(rgb_configs.value);
}

async function updateData() {
  if (keymap.value != undefined) {
    mapBackDynamicKey(keymap.value, dynamic_keys.value);
  }
  console.log("update data");
  selected_config_file_index.value = await apis.get_config_file_index();
  triggerRef(advanced_keys);
  triggerRef(keymap);
  triggerRef(rgb_base_config);
  triggerRef(rgb_configs);
  triggerRef(dynamic_keys);
  triggerRef(selected_config_file_index);
  triggerRef(firmware_version);
}

async function handleUpdateDeviceValue(_value: string, option: SelectOption) {
  await apis.set_device(option.label as string);
  var layout_json: string = await apis.get_layout_json();
  //console.debug(layout_json);
  getController();
  renderKeyboardFromJson(layout_json);
  apis.addEventListener('updateData', (event: Event) => { updateData(); });
}

async function handleUpdateFileValue(_value: string, option: SelectOption) {
  await apis.set_config_file_index(option.value as number);
}

function applyToAllKeys() {
  advanced_keys.value.forEach((item, index) => {
    applyToSelectedKey(index);
  });
}

function applyToSelectedKey(index: number) {
  //message.info(id.toString());
  let id = index;
  var keys = keyboard_keys.value;
  switch (tab_selection.value) {
    case "PerformancePanel": {
      advanced_keys.value[id] = cloneDeep(advanced_key.value);
      break;
    }
    case "KeymapPanel": {
      if (keymap.value != undefined) {
        keymap.value[current_layer.value][id] = key_binding.value;
      }
      break;
    }
    case "DynamicKeyPanel": {
      if (dynamic_key.value.type != ekc.DynamicKeyType.DynamicKeyNone) {
        switch (dynamic_key.value.type) {
          case ekc.DynamicKeyType.DynamicKeyMutex:
            var dynamic_key_mutex = dynamic_key.value as ekc.DynamicKeyMutex;
            if (keymap.value != undefined) {
              if (dynamic_key_mutex.target_keys_location.length == 0) {
                dynamic_key_mutex.is_key2_primary = false;
                const binding = keymap.value[current_layer.value][id];
                dynamic_key_mutex.target_keys_location[0] = { layer: current_layer.value, id: id };
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamic_key.value = dynamic_key_mutex;

              }
              else if (dynamic_key_mutex.target_keys_location.length == 1) {
                dynamic_key_mutex.is_key2_primary = true;
                const binding = keymap.value[current_layer.value][id];
                dynamic_key_mutex.target_keys_location[1] = { layer: current_layer.value, id: id };
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamic_key.value = dynamic_key_mutex;
              }
              else {
                if (dynamic_key_mutex.is_key2_primary) {
                  const last_binding = dynamic_key.value.get_primary_binding();
                  keymap.value[dynamic_key.value.target_keys_location[1].layer][dynamic_key.value.target_keys_location[1].id] = last_binding;
                  const binding = keymap.value[current_layer.value][id];
                  dynamic_key.value.target_keys_location[1] = { layer: current_layer.value, id: id };
                  keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                  dynamic_key.value.set_primary_binding(binding);
                }
                else {
                  const last_binding = dynamic_key.value.get_primary_binding();
                  keymap.value[dynamic_key.value.target_keys_location[0].layer][dynamic_key.value.target_keys_location[0].id] = last_binding;
                  const binding = keymap.value[current_layer.value][id];
                  dynamic_key.value.target_keys_location[0] = { layer: current_layer.value, id: id };
                  keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                  dynamic_key.value.set_primary_binding(binding);

                }
              }
              triggerRef(dynamic_key);
              mapDynamicKey(keymap.value, dynamic_keys.value);
            }
            break;
          default:
            if (keymap.value != undefined) {
              if (dynamic_key.value.target_keys_location.length == 0) {
                const binding = keymap.value[current_layer.value][id];
                dynamic_key.value.target_keys_location[0] = { layer: current_layer.value, id: id };
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key.value.set_primary_binding(binding);
              }
              else {
                const last_binding = dynamic_key.value.get_primary_binding();
                keymap.value[dynamic_key.value.target_keys_location[0].layer][dynamic_key.value.target_keys_location[0].id] = last_binding;
                const binding = keymap.value[current_layer.value][id];
                dynamic_key.value.target_keys_location[0] = { layer: current_layer.value, id: id };
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key.value.set_primary_binding(binding);
              }
              mapDynamicKey(keymap.value, dynamic_keys.value);
            }
            break;
        }
      }
      break;
    }
    case "RGBPanel": {
      rgb_configs.value[id] = cloneDeep(rgb_config.value);
      break;
    }
    case "DebugPanel": {
      if (!debug_raw_chart_option.value.series.some(item => item.id == id)) {
        debug_raw_chart_option.value.series.push({
          id: id,
          name: 'KEY' + id.toString(),
          type: 'line',
          showSymbol: false,
          data: Array<DebugDataItem>()
        });
        debug_value_chart_option.value.series.push({
          id: id,
          name: 'KEY' + id.toString(),
          type: 'line',
          showSymbol: false,
          data: Array<DebugDataItem>()
        });
      }
      break;
    }
    default: {
      break;
    }
  }
}


interface IConfig {
  device: string;
  advanced_keys: ekc.IAdvancedKey[];
  rgb_base_config: ekc.IRGBBaseConfig;
  keymap: number[][];
  rgb_configs: ekc.IRGBConfig[];
  dynamic_keys: ekc.IDynamicKey[];
}


async function loadDefaultConfig() {
  apis.reset_to_default();
  advanced_keys.value = await apis.get_advanced_keys();
  keymap.value = await apis.get_keymap();
  rgb_configs.value = await apis.get_rgb_configs();
  dynamic_keys.value = await apis.get_dynamic_keys();
}

async function importConfig() {
  if (!(window as any).showOpenFilePicker) {
    return;
  }
  try {
    // 让用户选择 JSON 文件
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }],
      multiple: false,
    });

    const file = await fileHandle.getFile();
    const text = await file.text();
    const configData = JSON.parse(text) as IConfig;
    if (selected_device.value == configData.device) {
      advanced_keys.value.forEach((item, index) => {
        advanced_keys.value[index] = configData.advanced_keys[index];
      });
      if (keymap.value != undefined) {
        keymap.value = keymap.value.map((item, index) => {
          return item.map((item1, index1) => {
            return configData.keymap[index][index1];
          });
        });
      }
      rgb_base_config.value = configData.rgb_base_config;
      rgb_configs.value.forEach((item, index) => {
        rgb_configs.value[index] = configData.rgb_configs[index];
      });
      dynamic_keys.value.forEach((item, index) => {
        dynamic_keys.value[index] = configData.dynamic_keys[index];
      });
      mapDynamicKey(keymap.value, dynamic_keys.value);
    }
    else {
      message.error(t('main_device_mistatch'));
      return;
    }
    message.success(t('main_import_success'));
  } catch (error) {
    message.error(t('main_import_failed'));
    console.error(error);
  }
}

async function exportConfig() {
  const jsonStr = JSON.stringify(
    {
      device: selected_device.value,
      advanced_keys: advanced_keys.value,
      keymap: keymap.value,
      rgb_base_config: rgb_base_config.value,
      rgb_configs: rgb_configs.value,
      dynamic_keys: dynamic_keys.value,
    }, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });

  if ((window as any).showSaveFilePicker) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: "keyboard-config.json",
        types: [
          {
            description: "JSON Files",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      message.success("Config file exported.");
    } catch (error) {
      console.error(error);
    }
  } else {
  }
}

const advanced_options = computed(() => [
  {
    label: t('toolbar_device_flash_configuration'),
    key: 'flash config'
  },
  {
    label: t('toolbar_device_reset'),
    key: 'system reset'
  },
  {
    label: t('toolbar_device_factory_reset'),
    key: 'factory reset'
  }
]);

const language_options = computed(() => [
  {
    label: 'English',
    value: 'en'
  },
  {
    label: '简体中文',
    value: 'zh'
  }
]);

const menuOptions = computed(() => [
  {
    label: t('main_tabs_performance'),
    key: 'PerformancePanel',
  },
  {
    label: t('main_tabs_keymap'),
    key: 'KeymapPanel',
  },
  {
    label: t('main_tabs_rgb'),
    key: 'RGBPanel',
  },
  {
    label: t('main_tabs_dynamic_key'),
    key: 'DynamicKeyPanel',
  },
  {
    label: t('main_tabs_macro'),
    key: 'MacroPanel',
  },
  {
    label: t('main_tabs_script'),
    key: 'ScriptPanel',
  },
  {
    label: t('main_tabs_debug'),
    key: 'DebugPanel',
  },
  {
    label: t('main_tabs_about'),
    key: 'AboutPanel',
  },
]);

function handleAdvancedMenu(key: string | number) {
  if (isConnected.value) {
    switch (key) {
      case advanced_options.value[0].key: {
        apis.flash_config();
        break;
      }
      case advanced_options.value[1].key: {
        apis.system_reset();
        break;
      }
      case advanced_options.value[2].key: {
        apis.factory_reset();
        break;
      }
      default: {
        break;
      }
    }
  }
}

if (navigator.language === "zh-CN") {
  lang.value = "zh";
  handleLanguageMenu("zh");
}

function handleLanguageMenu(key: string) {
  setI18nLanguage(key);
}

onMounted(async () => {
  //initializeKeyboard();
  if (navigator.userAgent.toLowerCase().includes("linux") && localStorage.getItem('dontShowLinuxDetect') != 'true') {
    const linux_detect_notification = notification.warning(
      {
        title: t('main_linux_detect_title'),
        content: t('main_linux_detect_content'),
        duration: 5000,
        keepAliveOnHover: true,
        action: () =>
          [
            /*           h(
                        NButton,
                        {
                          text: true,
                          type: 'primary',
                        },
                        {
                          default: () => "Read more"
                        }
                      ), */
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
            ),
          ]
      }
    );
  }
  if (!('hid' in navigator) && localStorage.getItem('dontShowWebHIDDetect') != 'true') {
    const webhid_detect_notification = notification.warning(
      {
        title: t('main_webhid_detect_title'),
        content: t('main_webhid_detect_content'),
        duration: 5000,
        keepAliveOnHover: true,
        action: () =>
          [
            /*           h(
                        NButton,
                        {
                          text: true,
                          type: 'primary',
                        },
                        {
                          default: () => "Read more"
                        }
                      ), */
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
            ),
          ]
      }
    );

  }
  const result: string[] = await apis.get_devices();
  devices.value = result.map((label: string, index: number) => ({
    label,
    value: index,
  }));
});


const layers = computed(() => {
  if (keymap.value != undefined) {
    return keymap.value.map((item, index) => ({
      value: index,
      label: 'layer ' + index.toString(),
    }));
  }
}
);
const currentPanel = computed(() => {
  switch (tab_selection.value) {
    case 'PerformancePanel': return PerformancePanel;
    case 'KeymapPanel': return KeymapPanel;
    case 'RGBPanel': return RGBPanel;
    case 'DynamicKeyPanel': return DynamicKeyPanel;
    case 'DebugPanel': return DebugPanel;
    case 'MacroPanel': return MacroPanel;
    case 'ScriptPanel': return ScriptPanel;
    case 'AboutPanel': return AboutPanel;
    default: return null;
  }
});


function handleThemeUpdate() {
  if (theme_name.value === 'dark') {
    theme_name.value = 'light'
  }
  else {
    theme_name.value = 'dark'
  }
}

let layout_labels = ref<Array<Array<string>> | undefined>([[]]);

</script>

<template>
  <div class="root_container">
    <n-layout has-sider>
      <n-layout-header class="header" bordered>
        <n-grid :x-gap="12" :y-gap="12" :cols="5">
          <n-gi :span="4">
            <n-flex>
              <n-select @update:value="handleUpdateDeviceValue" style="max-width: 200px;" :disabled="isReady"
                v-model:value="selected_device" v-model:options="devices" filterable
                :placeholder="t('toolbar_select_device')" />
              <n-button @click="connectCommand" :disabled="selected_device == undefined">{{ isConnected ?
                t('toolbar_disconnect') :
                t('toolbar_connect') }}</n-button>
              <n-button @click="saveCommand" :disabled="!isReady">{{ t('toolbar_save') }}</n-button>
              <n-dropdown :disabled="!isReady" @select="handleAdvancedMenu" trigger="hover" placement="bottom-start"
                :options="advanced_options">
                <n-button :disabled="!isReady">{{ t('toolbar_advance') }}</n-button>
              </n-dropdown>
              <n-button tertiary :type="versionStatusType">
                {{ displayVersion }}
              </n-button>
            </n-flex>
          </n-gi>
          <n-gi :span="1">
            <n-flex justify="end">
              <n-button @click="handleThemeUpdate">
                {{ themeLabelMap[theme_name as 'light' | 'dark'] }}
              </n-button>
              <n-select @update:value="handleLanguageMenu" style="max-width: 100px;" v-model:value="lang"
                :options="language_options" />
            </n-flex>
          </n-gi>
        </n-grid>
      </n-layout-header>
      <div class="container">
        <n-layout-sider :width="200" style="flex-shrink: 0;">
          <div style="margin-left: 8px; margin-top: 8px; margin-right: 8px;">
            <n-select style="font-size: 14px;" size="large" :placeholder="t('main_tabs_config_file')"
              @update:value="handleUpdateFileValue" v-model:value="selected_config_file_index"
              v-model:options="files"></n-select>
          </div>
          <n-space vertical>
            <n-grid :cols="3" style=" margin-top: 8px; margin-bottom: -8px;" justify="space-between">
              <n-gi>
                <div style="margin-left: 8px;margin-right: 4px;">
                  <n-button size="tiny" block @click="loadDefaultConfig">{{ t('default') }}</n-button>
                </div>
              </n-gi>
              <n-gi>
                <div style="margin-left: 4px;margin-right: 4px;">
                  <n-button size="tiny" block @click="importConfig">{{ t('import') }}</n-button>
                </div>
              </n-gi>
              <n-gi>
                <div style="margin-left: 4px;margin-right: 8px;">
                  <n-button size="tiny" block @click="exportConfig">{{ t('export') }}</n-button>
                </div>
              </n-gi>
            </n-grid>
            <n-menu :indent="20" :options="menuOptions" v-model:value="tab_selection">
            </n-menu>
          </n-space>
        </n-layout-sider>
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">

        <n-split 
            direction="vertical" 
            v-model:size="splitSize" 
            :min="0" 
            :max="maxSplitSize"
            
            :pane1-style="{ 
              overflow: 'hidden',
              /* 【核心修改】只有在 !isDragging 且 enableTransition 为 true 时才应用动画 */
              transition: (!isDragging && enableTransition) ? 'flex-basis 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' 
            }"
            
            @drag-start="handleDragStart" 
            @drag-end="handleDragEnd" 
            :resize-trigger-size="36"
          >
<template #1>
      <div style="height: 100%; position: relative; display: flex; flex-direction: column;">
        
        <div v-show="isDragging" style="position: absolute; inset: 0; z-index: 100; cursor: ns-resize;"></div>

        <n-scrollbar 
          style="flex: 1; min-height: 0;"
          :style="{ pointerEvents: isDragging ? 'none' : 'auto' }"
          trigger="hover"
        >
          <div ref="keyboardContentRef" style="padding-bottom: 4px;">
             <KeyboardRender v-model:keys="keyboard_keys" :layout_labels="layout_labels" @select="applyToSelectedKey" />
          </div>
        </n-scrollbar>

      </div>
    </template>

    <template #resize-trigger><div 
        class="custom-resize-trigger" 
        :class="{ 'dark': theme_name === 'dark' }" 
      ><div 
                  style="position: absolute; inset: 0; z-index: 0; pointer-events: auto;"
                  @dblclick="resetToAuto"
                ></div>

                <div class="trigger-left" style="z-index: 1;">
                  <Transition name="fade">
                    <div 
                      v-if="tab_selection == 'PerformancePanel'||tab_selection == 'KeymapPanel'||tab_selection == 'RGBPanel'"
                      @mousedown.stop
                      style="pointer-events: auto;"
                    >
                      <n-button size="tiny" secondary @click="applyToAllKeys">
                        {{ t('apply_to_all') }}
                      </n-button>
                    </div>
                  </Transition>
                </div>

                <div class="trigger-center" style="z-index: 1;">
                  <Transition name="fade" mode="out-in">
                    <div 
                      v-if="tab_selection == 'KeymapPanel' || tab_selection == 'DynamicKeyPanel'"
                      key="layer-selector" 
                      @mousedown.stop
                      style="display: flex; align-items: center; justify-content: center; pointer-events: auto;"
                    >
                      <n-radio-group 
                        v-if="layers && layers.length > 0"
                        :key="selected_device + '-' + layers.length"
                        v-model:value="current_layer" 
                        size="tiny" 
                      > 
                        <n-radio-button v-for="item in layers" :key="item.value" :value="item.value" :label="item.label" />
                      </n-radio-group>
                    </div>
                    
                    <div 
                      v-else 
                      key="handle-bar"
                      style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"
                    >
                       <div class="handle-bar" :class="{ 'active': isAutoHeight }"></div>
                    </div>
                  </Transition>
                </div>

                <div class="trigger-right" style="z-index: 1;">
                   <div class="toggle-btn" @click="toggleCollapse" @mousedown.stop style="pointer-events: auto;">
                    <n-icon size="16">
                      <svg v-if="parseFloat(splitSize) < 50" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6l1.41-1.41z"/></svg>
                      <svg v-else viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6l-6 6l1.41 1.41z"/></svg>
                    </n-icon>
                  </div>
                </div>
              </div>
            </template>

            <template #2>
              <div style="height: 100%; overflow-y: auto; display: flex; flex-direction: column;">
                <Transition name="fade" mode="out-in">
                  <component :is="currentPanel" />
                </Transition>
              </div>
            </template>

          </n-split>
        </div>
      </div>
    </n-layout>
  </div>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  height: 80px;
  padding: 24px;
  z-index: 2;
}

.right {
  background-color: lightgreen;
  flex-grow: 1;
  /* 让右侧占据剩余空间 */
}

.tab {
  position: sticky;
  top: 0px;
}

.container {
  display: flex;
  position: fixed;
  top: 80px;
  bottom: 0px;
  width: 100vw;
  height: 100vh-80px;
  /*
    position: fixed;
    top: 80px;
    bottom: 0px;
    width: 100vw;
    height: 100vh-80px;
    */
}

.root_container {
  display: flex;
  position: absolute;
  top: 0px;
  bottom: 0px;
  width: 100vw;
  height: 100vh;
}

.keyboard_render {
  flex-shrink: 0;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
}

.list-leave-active {
  position: absolute;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.nav-end {
  display: flex;
  align-items: center;
}
.custom-resize-trigger {
  /* 增加高度以容纳按钮，32px-36px 是比较舒适的工具栏高度 */
  height: 36px; 
  background-color: #f5f5f5;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  
  /* Flex 布局 */
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左右两端对齐，中间居中 */
  padding: 0 12px; /* 左右内边距 */
  
  position: relative;
  transition: background-color 0.2s;
  
  /* 鼠标样式：在空白处是调整大小，在按钮上是默认 */
  cursor: ns-resize;
}

/* 深色模式适配 */
.custom-resize-trigger.dark {
  background-color: #26262a;
  border-color: #333;
}
.trigger-left {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center; /* 确保垂直居中 */
  pointer-events: none; /* 【关键】让空白区域允许鼠标穿透，从而触发拖拽 */
}

.trigger-center {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.trigger-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center; /* 确保垂直居中 */
  pointer-events: none; /* 【关键】让空白区域允许鼠标穿透 */
}

.handle-bar {
  width: 40px;
  height: 4px;
  background-color: #ccc;
  border-radius: 2px;
  transition: all 0.3s;
}

.handle-bar.active {
  background-color: #18a058;
}

.toggle-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #666;
  padding: 4px;
  border-radius: 4px;
}
.toggle-btn:hover {
  background-color: rgba(0,0,0,0.05);
}
</style>