<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, computed, h, triggerRef, watch, provide } from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex, NButton, NSplit, NScrollbar, NGi, NGrid, NDropdown, NSelect, NColorPicker, NInputNumber, NRadioGroup, NRadioButton, NIcon } from 'naive-ui'
import * as apis from '@/apis/api'
import * as ekc from "emi-keyboard-controller";
import { DynamicKeyToKeyName, keyBindingModifierToString, keyCodeToKeyName, keyCodeToString, KeyConfig, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex, mapDynamicKey, mapBackDynamicKey, LayoutGroup, demoScriptSource } from "@/apis/utils";
import { useMainStore } from "@/store/main"
import { storeToRefs } from "pinia";
import { DebugDataItem, mqjsCompile } from '@/apis/utils';
import type { MenuOption } from 'naive-ui'
import DynamicKeyPanel from "@/views/DynamicKeyPanel.vue";
import RGBPanel from "@/views/RGBPanel.vue";
import PerformancePanel from "@/views/PerformancePanel.vue";
import KeymapPanel from "@/views/KeymapPanel.vue";
import DebugPanel from "@/views/DebugPanel.vue";
import AboutPanel from "@/views/AboutPanel.vue";
import ScriptPanel from "@/views/ScriptPanel.vue";
import MacroPanel from "@/views/MacroPanel.vue";
import OscilloscopePanel from "@/views/OscilloscopePanel.vue";
import KeyboardRender from "@/components/KeyboardRender.vue";
import cloneDeep from "lodash/cloneDeep";
import { setI18nLanguage } from "@/locales/i18n";
import SmoothSpan from '@/components/SmoothSpan.vue';
import SettingsPanel from '@/views/SettingsPanel.vue';
import ConsolePanel from '@/views/ConsolePanel.vue';

type SafeController = Omit<ekc.KeyboardController, 'listeners'>;

const props = defineProps<{ 
  deviceName: string;
  controller?: SafeController;
  isDemo?: boolean; 
}>();

const controller = computed(() => props.controller);
const { t } = useI18n();
const store = useMainStore();
const { themeName, lang } = storeToRefs(store);
const message = useMessage();

const isConnected = ref<boolean>(false);
const advancedKey = ref<ekc.IAdvancedKey>(new ekc.AdvancedKey());
const rgbBaseConfig = ref<ekc.IRGBBaseConfig>(new ekc.RGBBaseConfig());
const rgbConfig = ref<ekc.IRGBConfig>(new ekc.RGBConfig());
const dynamicKey = ref<ekc.IDynamicKey>(new ekc.DynamicKey());
const dynamicKeyIndex = ref<number>(-1);
const readmeMarkdown = ref<string>("");
const debugEvent = ref<ekc.KeyboardKeyEvent>({ keycode: 0, event: 3, is_virtual: false, key_id: 0 });
const useKeymap = ref<boolean>(false);
const keyBinding = ref<number>(0);
const firmwareVersion = ref<ekc.FirmwareVersion>({ major: 0, minor: 0, patch: 0, info: "" });
const firmwareFeature = ref(new ekc.Feature());

const scriptSource = ref<string>(demoScriptSource);
const scriptBytecode = ref<Uint8Array>(new Uint8Array());
const selectedProfileIndex = ref<number | undefined>(undefined);
const oscilloscopeSelectedKeys = ref<number[]>([]);
const macros = ref<ekc.IMacroAction[][]>([[]]);
const keyboardConfig = ref<ekc.KeyboardConfig>(new ekc.KeyboardConfig());

const keyboardKeys = ref<KeyConfig[]>([]);
const advancedKeys = ref<ekc.IAdvancedKey[]>([]);
const rgbConfigs = ref<ekc.IRGBConfig[]>([]);
const keymap = ref<number[][]>([new Array<number>()]);
const dynamicKeys = ref<ekc.IDynamicKey[]>([]);
const currentLayerIndex = ref<number>(0);
const tabSelection = ref<string | null>("PerformancePanel");

provide('keyboardContext', {
  keyboardKeys, advancedKeys, rgbConfigs, keymap, dynamicKeys, currentLayerIndex, tabSelection
});

const latest_version = ref({ major: 0, minor: 1, patch: 0, info: "beta" });

const versionStatusType = computed(() => {
  const current = firmwareVersion.value;
  const target = latest_version.value;
  if (current.major !== target.major || current.minor !== target.minor) return 'error';
  if (current.patch !== target.patch || current.info != target.info) return 'warning';
  return 'success';
});

const isReady = computed(() => isConnected.value && (versionStatusType.value == 'warning' || versionStatusType.value == 'success'));
const emit = defineEmits(['updateStatus']);
const currentStatus = computed(() => isReady.value ? 'ready' : (isConnected.value ? 'connected' : 'disconnected'));
watch(currentStatus, (newVal) => {
  emit('updateStatus', newVal);
}, { immediate: true });

const displayVersion = computed(() => {
  const v = firmwareVersion.value;
  const base = `${v.major}.${v.minor}.${v.patch}`;
  const ver = v.info ? `${base}-${v.info}` : base;
  return ((versionStatusType.value == 'warning' || versionStatusType.value == 'error') && isConnected.value) ? ver + t('need_update') : ver;
});

const splitSize = ref("400px");
const isAutoHeight = ref(true);
const contentRealHeight = ref(400);
const maxSplitSize = computed(() => (contentRealHeight.value + splitBuffer) + 'px');
const isDragging = ref(false);
const enableTransition = ref(false);
const keyboardContentRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const splitBuffer = 4;
const keyboardLogs = ref<string>("");
const clearLogs = () => {
  keyboardLogs.value = "";
};

onMounted(async () => {
  if (controller.value) {
    if (keyboardContentRef.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = entry.contentRect.height;
          contentRealHeight.value = h;
          if (isAutoHeight.value) {
            splitSize.value = (h + splitBuffer) + 'px';
          } else {
            const currentSplitPx = parseFloat(splitSize.value);
            if (currentSplitPx > h + 10) {
              isAutoHeight.value = true;
              splitSize.value = (h + splitBuffer) + 'px';
            }
          }
        }
      });
      resizeObserver.observe(keyboardContentRef.value.firstElementChild as Element || keyboardContentRef.value);
    }
    var layout_json: string = await controller.value.get_layout_json();
    oscilloscopeSelectedKeys.value.length = 0;
    await getController();
    renderKeyboardFromJson(layout_json);
    controller.value.addEventListener('updateData', (event: Event) => { updateData(); });
    controller.value.addEventListener('deviceLog', (event: any) => {
      keyboardLogs.value += `${event.detail}\n`;
      const lines = keyboardLogs.value.split('\n');
      if (lines.length > 5000) {
        keyboardLogs.value = lines.slice(-5000).join('\n');
      }
    });
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

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

function handleDragStart() {
  isAutoHeight.value = false;
  isDragging.value = true;
  enableTransition.value = false;
}

function resetToAuto() {
  isAutoHeight.value = true;
  splitSize.value = (contentRealHeight.value + splitBuffer) + 'px';
}

function toggleCollapse() {
  enableTransition.value = true;
  nextTick(() => {
    const currentPx = parseFloat(splitSize.value);
    if (currentPx < 50) resetToAuto();
    else {
      isAutoHeight.value = false;
      splitSize.value = "0px";
    }
    setTimeout(() => { enableTransition.value = false; }, 350);
  });
}

const themeLabelMap = computed(() => ({ dark: t('light'), light: t('dark') } satisfies Record<string, string>));
const keyboard_layout = ref({ json: undefined, text: JSON.stringify(kle.Serial.deserialize([]), null, 2) });
var files = ref<{ label: string; value: number }[]>([]);

function renderKeyboardFromJson(json_str: string) {
  var layout = JSON.parse(json_str);
  try {
    const parsedKeyboard = kle.Serial.deserialize(layout);
    updateKeyboard(parsedKeyboard);
  } catch (error) { message.error('Failed to parse keyboard layout'); }
}

function parseLayoutGroup(str: string): LayoutGroup | undefined {
  if (!str) return undefined;
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
  keyboardKeys.value = value.keys.map((k, i) => ({
    ...k,
    id: (Number.isNaN(parseInt(k.labels[0])) ? i : parseInt(k.labels[0])),
    layoutGroup: parseLayoutGroup(k.labels[8])
  }));
}

watch(() => props.deviceName, async (newName) => {
  if (!newName || !controller.value) return;
  if (isConnected.value) {
    await controller.value.disconnect();
    isConnected.value = false;
  }
  var layout_json: string = await controller.value.get_layout_json();
  oscilloscopeSelectedKeys.value.length = 0;
  await getController();
  renderKeyboardFromJson(layout_json);
  controller.value.addEventListener('updateData', (event: Event) => { updateData(); });
}, { immediate: true });

async function connect_device() {
    if (!controller.value) return false;
    var d = await controller.value.detect();
    if (d.length > 0) return await controller.value.connect(d[0]);
    else return false;
}

async function connectCommand() {
  if (!controller.value) return;
  if (isConnected.value) {
    await controller.value.disconnect();
    isConnected.value = false;
  } else {
    var result = await connect_device();
    isConnected.value = result;
    if (isConnected.value) message.success(t('main_found_device'));
    else message.error(t('main_device_not_found'));
  }
}

async function applyCommand() {
  if (!controller.value) return;
  if (isConnected.value) {
    const argsString = "--no-column -m32";
    const { bytecode } = await mqjsCompile(scriptSource.value, argsString);
    scriptBytecode.value = bytecode;
    triggerRef(scriptBytecode);
    await controller.value.set_config(keyboardConfig.value);
    await controller.value.set_advanced_keys(advancedKeys.value);
    await controller.value.set_rgb_base_config(rgbBaseConfig.value);
    if (keymap.value != undefined) await controller.value.set_keymap(keymap.value);
    await controller.value.set_rgb_configs(rgbConfigs.value);
    await controller.value.set_dynamic_keys(dynamicKeys.value);
    await controller.value.set_macros(macros.value);
    await controller.value.set_script_source(scriptSource.value);
    await controller.value.set_script_bytecode(scriptBytecode.value);
    await controller.value.save();
  }
}

async function getController() {
  if (!controller.value) return;
  keyboardConfig.value = await controller.value.get_config();
  advancedKeys.value = await controller.value.get_advanced_keys();
  keymap.value = await controller.value.get_keymap();
  rgbBaseConfig.value = await controller.value.get_rgb_base_config();
  rgbConfigs.value = await controller.value.get_rgb_configs();
  dynamicKeys.value = await controller.value.get_dynamic_keys();
  firmwareVersion.value = await controller.value.get_firmware_version();
  macros.value = await controller.value.get_macros();
  selectedProfileIndex.value = await controller.value.get_profile_index();
  const cnofig_file_num = await controller.value.get_profile_num();
  layout_labels.value = await controller.value.get_layout_labels();
  readmeMarkdown.value = await controller.value.get_readme_markdown();
  firmwareFeature.value = await controller.value.get_feature();

  files.value.length = 0;
  for (let index = 0; index < cnofig_file_num; index++) {
    files.value.push({ label: t("main_tabs_profile") + ' ' + index.toString(), value: index });
  }
  currentLayerIndex.value = 0;
  triggerRef(keymap);

  controller.value.addEventListener('deviceDisconnected', async () => {
    isConnected.value = false;
    message.error(t('device_disconnected') || '设备已断开连接');
  });
}

async function updateData() {
  if (!controller.value) return;
  if (keymap.value != undefined) mapBackDynamicKey(keymap.value, dynamicKeys.value);
  selectedProfileIndex.value = await controller.value.get_profile_index();
  macros.value = await controller.value.get_macros();
  scriptSource.value = await controller.value.get_script_source();
  triggerRef(advancedKeys); triggerRef(keymap); triggerRef(rgbBaseConfig);
  triggerRef(rgbConfigs); triggerRef(dynamicKeys); triggerRef(selectedProfileIndex);
  triggerRef(macros); triggerRef(firmwareVersion);
}

async function handleUpdateFileValue(_value: string, option: SelectOption) {
  if (!controller.value) return;
  await controller.value.set_profile_index(option.value as number);
}

function applyToAllKeys() {
  advancedKeys.value.forEach((item, index) => { applyToSelectedKey(index); });
}

function applyToSelectedKey(index: number) {
  let id = index;
  switch (tabSelection.value) {
    case "PerformancePanel":
      advancedKeys.value[id] = cloneDeep(advancedKey.value);
      break;
    case "KeymapPanel":
      if (keymap.value != undefined) keymap.value[currentLayerIndex.value][id] = keyBinding.value;
      break;
    case "RGBPanel": {
      rgbConfigs.value[id] = cloneDeep(rgbConfig.value);
      break;
    }
    case "DynamicKeyPanel":
      if (dynamicKey.value.type != ekc.DynamicKeyType.DynamicKeyNone) {
        switch (dynamicKey.value.type) {
          case ekc.DynamicKeyType.DynamicKeyMutex:
            var dynamic_key_mutex = dynamicKey.value as ekc.DynamicKeyMutex;
            if (keymap.value != undefined) {
              if (dynamic_key_mutex.target_keys_location.length == 0) {
                dynamic_key_mutex.is_key2_primary = false;
                const binding = keymap.value[currentLayerIndex.value][id];
                dynamic_key_mutex.target_keys_location[0] = { layer: currentLayerIndex.value, id: id };
                keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamicKey.value = dynamic_key_mutex;
              } else if (dynamic_key_mutex.target_keys_location.length == 1) {
                dynamic_key_mutex.is_key2_primary = true;
                const binding = keymap.value[currentLayerIndex.value][id];
                dynamic_key_mutex.target_keys_location[1] = { layer: currentLayerIndex.value, id: id };
                keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamicKey.value = dynamic_key_mutex;
              } else {
                if (dynamic_key_mutex.is_key2_primary) {
                  const last_binding = dynamicKey.value.get_primary_binding();
                  keymap.value[dynamicKey.value.target_keys_location[1].layer][dynamicKey.value.target_keys_location[1].id] = last_binding;
                  const binding = keymap.value[currentLayerIndex.value][id];
                  dynamicKey.value.target_keys_location[1] = { layer: currentLayerIndex.value, id: id };
                  keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                  dynamicKey.value.set_primary_binding(binding);
                } else {
                  const last_binding = dynamicKey.value.get_primary_binding();
                  keymap.value[dynamicKey.value.target_keys_location[0].layer][dynamicKey.value.target_keys_location[0].id] = last_binding;
                  const binding = keymap.value[currentLayerIndex.value][id];
                  dynamicKey.value.target_keys_location[0] = { layer: currentLayerIndex.value, id: id };
                  keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                  dynamicKey.value.set_primary_binding(binding);
                }
              }
              dynamicKeys.value[dynamicKeyIndex.value] = dynamicKey.value;
              triggerRef(dynamicKey); mapDynamicKey(keymap.value, dynamicKeys.value);
            }
            break;
          default:
            if (keymap.value != undefined) {
              if (dynamicKey.value.target_keys_location.length == 0) {
                const binding = keymap.value[currentLayerIndex.value][id];
                dynamicKey.value.target_keys_location[0] = { layer: currentLayerIndex.value, id: id };
                keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                dynamicKey.value.set_primary_binding(binding);
              } else {
                const last_binding = dynamicKey.value.get_primary_binding();
                keymap.value[dynamicKey.value.target_keys_location[0].layer][dynamicKey.value.target_keys_location[0].id] = last_binding;
                const binding = keymap.value[currentLayerIndex.value][id];
                dynamicKey.value.target_keys_location[0] = { layer: currentLayerIndex.value, id: id };
                keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                dynamicKey.value.set_primary_binding(binding);
              }
              dynamicKeys.value[dynamicKeyIndex.value] = dynamicKey.value;
              mapDynamicKey(keymap.value, dynamicKeys.value);
            }
            break;
        }
      }
      break;
    case "DebugPanel":
      if (controller.value) {
        debugEvent.value.key_id = id;
        controller.value.emit(debugEvent.value, useKeymap.value);
      }
      break;
    case "OscilloscopePanel":
      const currentKeys = [...oscilloscopeSelectedKeys.value];
      if (!currentKeys.includes(id)) {
        currentKeys.push(id);
        if (currentKeys.length > 4) currentKeys.shift(); 
        oscilloscopeSelectedKeys.value = currentKeys;
      }
      break;
    default: break;
  }
}

interface IConfig { device: string; advancedKeys: ekc.IAdvancedKey[]; rgbBaseConfig: ekc.IRGBBaseConfig; keymap: number[][]; rgbConfigs: ekc.IRGBConfig[]; dynamicKeys: ekc.IDynamicKey[]; }

async function loadDefaultConfig() {
  if (!controller.value) return;
  controller.value.reset_to_default();
  advancedKeys.value = await controller.value.get_advanced_keys();
  keymap.value = await controller.value.get_keymap();
  rgbConfigs.value = await controller.value.get_rgb_configs();
  dynamicKeys.value = await controller.value.get_dynamic_keys();
}

async function importConfig() {
  if (!(window as any).showOpenFilePicker) return;
  try {
    const [fileHandle] = await (window as any).showOpenFilePicker({ types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }], multiple: false });
    const file = await fileHandle.getFile();
    const configData = JSON.parse(await file.text()) as IConfig;
    
    if (props.deviceName == configData.device) {
      advancedKeys.value.forEach((item, index) => { advancedKeys.value[index] = configData.advancedKeys[index]; });
      if (keymap.value != undefined) {
        keymap.value = keymap.value.map((item, index) => item.map((item1, index1) => configData.keymap[index][index1]));
      }
      rgbBaseConfig.value = configData.rgbBaseConfig;
      rgbConfigs.value.forEach((item, index) => { rgbConfigs.value[index] = configData.rgbConfigs[index]; });
      dynamicKeys.value.forEach((item, index) => { dynamicKeys.value[index] = configData.dynamicKeys[index]; });
      mapDynamicKey(keymap.value, dynamicKeys.value);
    } else {
      message.error(t('main_device_mistatch')); return;
    }
    message.success(t('main_import_success'));
  } catch (error) { message.error(t('main_import_failed')); console.error(error); }
}

async function exportConfig() {
  const jsonStr = JSON.stringify({
    device: props.deviceName,
    advancedKeys: advancedKeys.value, keymap: keymap.value, rgbBaseConfig: rgbBaseConfig.value,
    rgbConfigs: rgbConfigs.value, dynamicKeys: dynamicKeys.value,
  }, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });

  if ((window as any).showSaveFilePicker) {
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: "keyboard-config.json", types: [{ description: "JSON Files", accept: { "application/json": [".json"] } }] });
      const writable = await handle.createWritable();
      await writable.write(blob); await writable.close();
      message.success("Profile exported.");
    } catch (error) { console.error(error); }
  }
}

const advanced_options = computed(() => [
  { label: t('toolbar_device_flash_configuration'), key: 'flash config' },
  { label: t('toolbar_device_reset'), key: 'system reset' },
  { label: t('toolbar_device_factory_reset'), key: 'factory reset' }
]);
const language_options = computed(() => [{ label: 'English', value: 'en' }, { label: '简体中文', value: 'zh' }]);

const menuOptions = computed(() => {
  const opts: MenuOption[] = [];
  const f = firmwareFeature.value || new ekc.Feature();
  if (f.advanced_key_flag) opts.push({ label: t('main_tabs_performance'), key: 'PerformancePanel' });
  opts.push({ label: t('main_tabs_keymap'), key: 'KeymapPanel' });
  if ((rgbBaseConfig.value || rgbConfigs.value.length > 0)&&f.rgb_flag == true) opts.push({ label: t('main_tabs_rgb'), key: 'RGBPanel' });
  if (dynamicKeys.value.length != 0) opts.push({ label: t('main_tabs_dynamic_key'), key: 'DynamicKeyPanel' });
  if (macros.value.length != 0 && macros.value[0]?.length > 0) opts.push({ label: t('main_tabs_macro'), key: 'MacroPanel' });
  if (f.script_level != ekc.ScriptLevel.Disable) opts.push({ label: t('main_tabs_script'), key: 'ScriptPanel' });
  if (f.advanced_key_flag) {
    opts.push({ label: t('main_tabs_debug'), key: 'DebugPanel' });
    opts.push({ label: t('main_tabs_oscilloscope'), key: 'OscilloscopePanel' });
  }
  opts.push({ label: t('main_tabs_console'), key: 'ConsolePanel' });
  opts.push({ label: t('main_tabs_settings'), key: 'SettingsPanel' });
  opts.push({ label: t('main_tabs_about'), key: 'AboutPanel' });
  return opts;
});

watch(menuOptions, (newOpts) => {
  const currentTabExists = newOpts.some(opt => opt.key === tabSelection.value);
  if (!currentTabExists && newOpts.length > 0) tabSelection.value = newOpts[0].key as string;
});

function handleAdvancedMenu(key: string | number) {
  if (!controller.value) return;
  if (isConnected.value) {
    switch (key) {
      case advanced_options.value[0].key: controller.value.flash(); break;
      case advanced_options.value[1].key: controller.value.system_reset(); break;
      case advanced_options.value[2].key: controller.value.factory_reset(); break;
    }
  }
}

function handleLanguageMenu(key: string) { setI18nLanguage(key); }

const layers = computed(() => {
  if (keymap.value != undefined) return keymap.value.map((item, index) => ({ value: index, label: 'layer ' + index.toString() }));
});

const currentPanel = computed(() => {
  switch (tabSelection.value) {
    case 'PerformancePanel': return PerformancePanel;
    case 'KeymapPanel': return KeymapPanel;
    case 'RGBPanel': return RGBPanel;
    case 'DynamicKeyPanel': return DynamicKeyPanel;
    case 'DebugPanel': return DebugPanel;
    case 'SettingsPanel': return SettingsPanel;
    case 'OscilloscopePanel': return OscilloscopePanel;
    case 'MacroPanel': return MacroPanel;
    case 'ScriptPanel': return ScriptPanel;
    case 'ConsolePanel': return ConsolePanel;
    case 'AboutPanel': return AboutPanel;
    default: return null;
  }
});

function handleThemeUpdate() { themeName.value = themeName.value === 'dark' ? 'light' : 'dark'; }

let layout_labels = ref<Array<Array<string>> | undefined>([[]]);

const displayLayerPage = computed({
  get: () => currentLayerIndex.value + 1,
  set: (val: number) => { 
    currentLayerIndex.value = val - 1; 
  }
});

const totalLayers = computed(() => {
  return keymap.value ? keymap.value.length : 1;
});
</script>

<template>
  <n-layout style="display: flex; flex-direction: column;  height: 100%; width: 100%;">
    <n-layout-header class="header" bordered>
      <n-flex justify="space-between" :align="'center'" style="width: 100%;">
  
        <n-flex :align="'center'" :wrap="false">

          <n-button 
            @click="connectCommand" 
            :disabled="(!isConnected && !controller) || isDemo" 
            :type="isConnected ? 'error' : 'primary'" 
            :secondary="isConnected"
            style="transition: all 0.3s;"
          >
            <SmoothSpan :text="isDemo ? t('demo_mode', '演示模式') : (isConnected ? t('toolbar_disconnect') : t('toolbar_connect'))" />
          </n-button>
        
          <n-button @click="applyCommand" :disabled="!isReady">
            {{ t('toolbar_apply') }}
          </n-button>
          <n-button @click="controller?.flash();" :disabled="!isReady">
            {{ t('toolbar_device_flash_configuration') }}
          </n-button>        
          <n-button tertiary :focusable="false" :type="versionStatusType">
            {{ displayVersion }}
          </n-button>
        </n-flex>
      
        <n-flex :align="'center'">
          <n-button @click="handleThemeUpdate">
            {{ themeLabelMap[themeName as 'light' | 'dark'] }}
          </n-button>
          <n-select 
            @update:value="handleLanguageMenu" 
            style="width: 110px;" 
            v-model:value="lang" 
            :options="language_options" 
          />
        </n-flex>

      </n-flex>
    </n-layout-header>

    <n-layout v-if="controller" has-sider class="main-body">
      <n-layout-sider bordered :width="200" style="flex-shrink: 0;" content-style="display: flex; flex-direction: column; height: 100%;">
        <div style="flex-shrink: 0; padding: 8px;">
          <n-select v-if="files.length != 0" style="font-size: 14px; margin-bottom: 8px;" size="large" :placeholder="t('main_tabs_profile')"
            @update:value="handleUpdateFileValue" v-model:value="selectedProfileIndex" v-model:options="files" />

          <n-grid :cols="3" :x-gap="4" style="">
            <n-gi><n-button size="tiny" block @click="loadDefaultConfig">{{ t('default') }}</n-button></n-gi>
            <n-gi><n-button size="tiny" block @click="importConfig">{{ t('import') }}</n-button></n-gi>
            <n-gi><n-button size="tiny" block @click="exportConfig">{{ t('export') }}</n-button></n-gi>
          </n-grid>
        </div>

        <n-scrollbar style="flex: 1; min-height: 0; margin-top: -6px;" content-style="padding-bottom: 12px">
          <div class="menu-list-container">
            <TransitionGroup name="menu-list">
              <n-button v-for="option in menuOptions" :key="option.key" class="menu-item-btn"
                :type="tabSelection === option.key ? 'primary' : 'default'" :secondary="tabSelection === option.key"
                :quaternary="tabSelection !== option.key" @click="tabSelection = option.key as string" size="large">
                <div class="menu-label">{{ option.label }}</div>
              </n-button>
            </TransitionGroup>
          </div>
        </n-scrollbar>
      </n-layout-sider>

      <n-layout-content content-style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <n-split direction="vertical" v-model:size="splitSize" :min="0" :max="maxSplitSize" :pane1-style="{
          overflow: 'hidden',
          transition: (!isDragging && enableTransition) ? 'flex-basis 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }" @drag-start="handleDragStart" @drag-end="handleDragEnd" :resize-trigger-size="36">
          <template #1>
            <div style="height: 100%; position: relative; display: flex; flex-direction: column;">
              <div v-show="isDragging" style="position: absolute; inset: 0; z-index: 100; cursor: ns-resize;"></div>
              <n-scrollbar style="flex: 1; min-height: 0;" :style="{ pointerEvents: isDragging ? 'none' : 'auto' }" trigger="hover">
                <div ref="keyboardContentRef" style="padding-bottom: 4px;">
                  <KeyboardRender v-model:keys="keyboardKeys" :layout_labels="layout_labels" @select="applyToSelectedKey" />
                </div>
              </n-scrollbar>
            </div>
          </template>

          <template #resize-trigger>
            <div class="custom-resize-trigger" :class="{ 'dark': themeName === 'dark' }">
              <div style="position: absolute; inset: 0; z-index: 0; pointer-events: auto;" @dblclick="resetToAuto"></div>

              <div class="trigger-left" style="z-index: 1;">
                <Transition name="fade">
                  <div v-if="tabSelection == 'PerformancePanel' || tabSelection == 'KeymapPanel' || tabSelection == 'RGBPanel'" @mousedown.stop style="pointer-events: auto;">
                    <n-button size="tiny" secondary @click="applyToAllKeys">{{ t('apply_to_all') }}</n-button>
                  </div>
                </Transition>
              </div>

              <div class="trigger-center" style="z-index: 1;">
                <Transition name="fade" mode="out-in">
                  <div v-if="tabSelection == 'KeymapPanel' || tabSelection == 'DynamicKeyPanel'" key="layer-selector" @mousedown.stop style="display: flex; align-items: center; justify-content: center; pointer-events: auto;">
                    <!-- <n-radio-group v-if="layers && layers.length > 0" :key="(props.deviceName) + '-' + layers.length" v-model:value="currentLayerIndex" size="small">
                      <n-radio-button v-for="item in layers" :key="item.value" :value="item.value" :label="item.label" />
                    </n-radio-group> -->
                    <n-pagination  v-model:page="displayLayerPage" :page-count="totalLayers" 
                      size="large"></n-pagination>
                  </div>
                  <div v-else key="handle-bar" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                    <div class="handle-bar" :class="{ 'active': isAutoHeight }"></div>
                  </div>
                </Transition>
              </div>

              <div class="trigger-right" style="z-index: 1;">
                <div class="toggle-btn" @click="toggleCollapse" @mousedown.stop style="pointer-events: auto;">
                  <n-icon size="16">
                    <svg v-if="parseFloat(splitSize) < 50" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6l1.41-1.41z" /></svg>
                    <svg v-else viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6l-6 6l1.41 1.41z" /></svg>
                  </n-icon>
                </div>
              </div>
            </div>
          </template>

          <template #2>
            <div style="height: 100%; overflow-y: auto; display: flex; flex-direction: column;">
              <Transition name="fade" mode="out-in">
                <component :is="currentPanel" 
                v-model:advancedKey="advancedKey"
                v-model:rgbBaseConfig="rgbBaseConfig"
                v-model:rgbConfig="rgbConfig"
                v-model:dynamicKey="dynamicKey"
                v-model:dynamicKeyIndex="dynamicKeyIndex"
                v-model:debugEvent="debugEvent"
                v-model:useKeymap="useKeymap"
                v-model:keyBinding="keyBinding"
                v-model:scriptSource="scriptSource"
                v-model:scriptBytecode="scriptBytecode"
                v-model:oscilloscopeSelectedKeys="oscilloscopeSelectedKeys"
                v-model:macros="macros"
                v-model:keyboardConfig="keyboardConfig"
                :controller="controller"
                :readme-markdown="readmeMarkdown"
                :logs="keyboardLogs"
                @clear="clearLogs"/>
              </Transition>
            </div>
          </template>
        </n-split>
      </n-layout-content>
    </n-layout>
    <div v-else class="empty-state-placeholder">
      <n-empty>
        <template #extra>
        </template>
      </n-empty>
    </div>
  </n-layout>
</template>

<style scoped>
.header {
  flex: 0 0 64px; /* 固定高度 64px */
  padding: 16px 24px;
}
.main-body {
  flex: 1; /* 撑满剩下的所有纵向空间，这解决了菜单栏填充问题 */
  min-height: 0; /* 配合 flex:1 锁死高度溢出，这解决了原生滚动条问题 */
  background: transparent;
}
:deep(.n-layout-scroll-container) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden !important; 
}
.empty-state-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
:deep(.n-layout) { display: flex !important; flex-direction: column !important; height: 100%; }
.keyboard_render { flex-shrink: 0; }
.v-enter-active, .v-leave-active { transition: opacity 0.5s ease; }
.v-enter-from, .v-leave-to { opacity: 0; }
.list-move, .list-enter-active, .list-leave-active { transition: all 0.5s ease; }
.list-enter-from, .list-leave-to { opacity: 0; }
.list-leave-active { position: absolute; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.nav-end { display: flex; align-items: center; }
.custom-resize-trigger { height: 36px; background-color: #f5f5f5; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; position: relative; transition: background-color 0.2s; cursor: ns-resize; }
.custom-resize-trigger.dark { background-color: #26262a; border-color: #333; }
.trigger-left { flex: 1; display: flex; justify-content: flex-start; align-items: center; pointer-events: none; }
.trigger-center { flex: 2; display: flex; justify-content: center; align-items: center; height: 100%; }
.trigger-right { flex: 1; display: flex; justify-content: flex-end; align-items: center; pointer-events: none; }
.handle-bar { width: 40px; height: 4px; background-color: #ccc; border-radius: 2px; transition: all 0.3s; }
.handle-bar.active { background-color: #18a058; }
.toggle-btn { cursor: pointer; display: flex; align-items: center; color: #666; padding: 4px; border-radius: 4px; }
.toggle-btn:hover { background-color: rgba(0, 0, 0, 0.05); }
.menu-list-container { display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; position: relative; }
.menu-item-btn { width: 100%; justify-content: flex-start; text-align: left; transition: all 0.5s; }
.menu-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-list-move { transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1) !important; z-index: 1; position: relative; }
.menu-list-enter-active, .menu-list-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.menu-list-enter-from, .menu-list-leave-to { opacity: 0; }
.menu-list-leave-active { position: absolute; left: 8px; right: 8px; z-index: 0; }
</style>