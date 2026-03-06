<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, computed, h, getCurrentInstance, triggerRef, watch, provide } from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex, NButton, NSplit, NScrollbar, NTabs, NTab, NGi, NGrid, NDropdown, NSelect, NColorPicker, NInputNumber, NRadioGroup, NRadioButton, NIcon } from 'naive-ui'
import * as apis from '@/apis/api'
import * as ekc from "emi-keyboard-controller";
import { DynamicKeyToKeyName, keyBindingModifierToString, keyCodeToKeyName, keyCodeToString, KeyConfig, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex, mapDynamicKey, mapBackDynamicKey, LayoutGroup, demoScriptSource } from "@/apis/utils";
import { useMainStore } from "@/store/main"
import { storeToRefs } from "pinia";
import { DebugDataItem, mqjsCompile } from '@/apis/utils';
import type { MenuOption, NotificationType } from 'naive-ui'
import { useNotification } from 'naive-ui'
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
import { useRegisterSW } from 'virtual:pwa-register/vue';

interface Window {
  showOpenFilePicker?: any;
  showSaveFilePicker?: any;
}

const { t } = useI18n();
const store = useMainStore();
const {
  themeName
} = storeToRefs(store);

const message = useMessage();
const notification = useNotification();

const lang = ref<string>("");
const selectedDevice = ref<number | undefined>(undefined);
const isConnected = ref<boolean>(false);
const advancedKey = ref<ekc.IAdvancedKey>(new ekc.AdvancedKey());
const rgbBaseConfig = ref<ekc.IRGBBaseConfig>(new ekc.RGBBaseConfig());
const rgbConfig = ref<ekc.IRGBConfig>(new ekc.RGBConfig());
const dynamicKey = ref<ekc.IDynamicKey>(new ekc.DynamicKey());
const dynamicKeyIndex = ref<number>(-1);
const readmeMarkdown = ref<string>("");
const debugEvent = ref<ekc.KeyboardKeyEvent>({
    keycode: 0,
    event: 3,
    is_virtual: false,
    key_id: 0,});
const useKeymap = ref<boolean>(false);
const keyBinding = ref<number>(0);
const firmwareVersion = ref<ekc.FirmwareVersion>({ major: 0, minor: 0, patch: 0, info: "" });
const firmwareFeature = ref(new ekc.Feature());

const scriptSource = ref<string>(demoScriptSource);
const scriptBytecode = ref<Uint8Array>(new Uint8Array());

const selectedProfileIndex = ref<number | undefined>(undefined);
const oscilloscopeSelectedKeys = ref<number[]>([]);
const macros = ref<ekc.IMacroAction[][]>([[]]);

const keyboardKeys = ref<KeyConfig[]>([]);
const advancedKeys = ref<ekc.IAdvancedKey[]>([]);
const rgbConfigs = ref<ekc.IRGBConfig[]>([]);
const keymap = ref<number[][]>([new Array<number>()]);
const dynamicKeys = ref<ekc.IDynamicKey[]>([]);
const currentLayerIndex = ref<number>(0);
const tabSelection = ref<string | null>("PerformancePanel");

const controller = ref<ekc.KeyboardController>(new ekc.OholeoKeyboardV2Controller());

provide('keyboardContext', {
  keyboardKeys,
  advancedKeys,
  rgbConfigs,
  keymap,
  dynamicKeys,
  currentLayerIndex,
  tabSelection
});

const latest_version = ref({
  major: 0,
  minor: 1,
  patch: 0,
  info: "beta"
});

const versionStatusType = computed(() => {
  const current = firmwareVersion.value;
  const target = latest_version.value;
  if (current.major !== target.major || current.minor !== target.minor) {
    return 'error';
  }
  if (current.patch !== target.patch || current.info != target.info) {
    return 'warning';
  }
  return 'success';
});

const isReady = computed(() => {
  return isConnected.value && (versionStatusType.value == 'warning' || versionStatusType.value == 'success');
})
const displayVersion = computed(() => {
  const v = firmwareVersion.value;
  const base = `${v.major}.${v.minor}.${v.patch}`;
  const ver = v.info ? `${base}-${v.info}` : base;
  return ((versionStatusType.value == 'warning' || versionStatusType.value == 'error') && isConnected.value) ? ver + t('need_update') : ver;
});

const splitSize = ref("400px");

const isAutoHeight = ref(true);

const contentRealHeight = ref(400);
const maxSplitSize = computed(() => {
  return (contentRealHeight.value + splitBuffer) + 'px';
});
const isDragging = ref(false);
const enableTransition = ref(false);
const keyboardContentRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const footerRef = ref<HTMLElement | null>(null);
const splitBuffer = 4;

onMounted(async () => {
  if (keyboardContentRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        contentRealHeight.value = h;
        if (isAutoHeight.value) {
          splitSize.value = (h + splitBuffer) + 'px';
        }
        else {
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

  // 🚨 修正：加载设备列表后自动选中第一个
  const result: string[] = await apis.get_devices();
  devices.value = result.map((label: string, index: number) => ({
    label,
    value: index,
  }));

  if (devices.value.length > 0) {
    handleTabChange(devices.value[0].value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

const {
  needRefresh,
  updateServiceWorker,
} = useRegisterSW({
  onRegistered(r) {
    if (r) {
      setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error: any) {
    console.error('Service Worker 注册失败', error);
  }
});

watch(needRefresh, (isNeed) => {
  if (isNeed) {
    const n = notification.info({
      title: t('main_new_version_title'),
      content: t('main_new_version_content'),
      duration: 0,
      keepAliveOnHover: true,
      action: () =>
        h(
          NButton,
          {
            type: 'primary',
            onClick: () => {
              n.destroy();
              updateServiceWorker(true);
            }
          },
          { default: () => t('main_refresh_now') }
        )
    });
  }
}, { immediate: true });

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
    if (currentPx < 50) {
      resetToAuto();
    } else {
      isAutoHeight.value = false;
      splitSize.value = "0px";
    }
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
  keyboardKeys.value = value.keys.map((k, i) => {
    return {
      ...k,
      id: (Number.isNaN(parseInt(k.labels[0])) ? i : parseInt(k.labels[0])),
      layoutGroup: parseLayoutGroup(k.labels[8])
    };
  });
}

async function connect_device(){
    var d = await controller.value.detect();
    if (d.length > 0) {
        return await controller.value.connect(d[0]);
    }
    else{
        return false;
    }
}

async function connectCommand() {
  if (isConnected.value) {
    await controller.value.disconnect();
    isConnected.value = false;
  }
  else {
    if (selectedDevice != undefined) {
      var result = await connect_device();
      isConnected.value = result;
      if (isConnected.value) {
        message.success(t('main_found_device'));
      }
      else {
        message.error(t('main_device_not_found'));
      }
    }
  }
}

async function applyCommand() {
  if (isConnected.value) {
    const argsString = "--no-column -m32";
    const { bytecode, stdout, stderr }  = await mqjsCompile(scriptSource.value, argsString);
    scriptBytecode.value = bytecode;
    triggerRef(scriptBytecode);
    await controller.value.set_advanced_keys(advancedKeys.value);
    await controller.value.set_rgb_base_config(rgbBaseConfig.value);
    if (keymap.value != undefined) {
      await controller.value.set_keymap(keymap.value);
    }
    await controller.value.set_rgb_configs(rgbConfigs.value);
    await controller.value.set_dynamic_keys(dynamicKeys.value);
    await controller.value.set_macros(macros.value);
    await controller.value.set_script_source(scriptSource.value);
    await controller.value.set_script_bytecode(scriptBytecode.value);
    var result = await controller.value.save_config();
  }
}

async function flashCommand() {
  if (isConnected.value) {
    var result = await controller.value.flash_config();
  }
}

async function getController() {
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
    files.value.push({
      label: t("main_tabs_profile") + ' ' + index.toString(),
      value: index,
    });
  }
  currentLayerIndex.value = 0;
  triggerRef(keymap);

  controller.value.addEventListener('deviceDisconnected', async () => {
    isConnected.value = false;
    message.error(t('device_disconnected') || '设备已断开连接');
  });
}

async function updateData() {
  if (keymap.value != undefined) {
    mapBackDynamicKey(keymap.value, dynamicKeys.value);
  }
  selectedProfileIndex.value = await controller.value.get_profile_index();
  macros.value = await controller.value.get_macros();
  scriptSource.value = await controller.value.get_script_source();
  
  triggerRef(advancedKeys);
  triggerRef(keymap);
  triggerRef(rgbBaseConfig);
  triggerRef(rgbConfigs);
  triggerRef(dynamicKeys);
  triggerRef(selectedProfileIndex);
  triggerRef(macros);
  triggerRef(firmwareVersion);
}

function create_controller(device: string): ekc.KeyboardController {
    switch (device) {
        case "Trinity Pad": return new ekc.TrinityPadController();
        case "Oholeo Keyboard": return new ekc.OholeoKeyboardController();
        case "Oholeo Keyboard v2": return new ekc.OholeoKeyboardV2Controller();
        case "Zellia60 HE": return new ekc.Zellia60Controller();
        case "Zellia80 HE": return new ekc.Zellia80Controller();
        case "Zellia Starlight": return new ekc.ZelliaStarlightController();
        case "Destrez Asural Left": return new ekc.DestrezAsuralLeftController();
        case "Destrez Asural Right": return new ekc.DestrezAsuralRightController();
        case "ANSI 104 Sample": return new ekc.ANSI104SampleController();
        default: return new ekc.ANSI104SampleController();
    }
}


async function handleTabChange(value: string | number) {
  selectedDevice.value = value as number; 
  const selectedOption = devices.value.find(d => d.value === value);
  if (selectedOption) {
    if (isConnected.value) {
      await controller.value.disconnect();
      isConnected.value = false;
    }
    controller.value = create_controller(selectedOption.label as string);
    
    var layout_json: string = await controller.value.get_layout_json();
    oscilloscopeSelectedKeys.value.length = 0;
    getController();
    renderKeyboardFromJson(layout_json);
    controller.value.addEventListener('updateData', (event: Event) => { updateData(); });
  }
}

async function handleUpdateFileValue(_value: string, option: SelectOption) {
  await controller.value.set_profile_index(option.value as number);
}

function applyToAllKeys() {
  advancedKeys.value.forEach((item, index) => {
    applyToSelectedKey(index);
  });
}

function applyToSelectedKey(index: number) {
  let id = index;
  var keys = keyboardKeys.value;
  switch (tabSelection.value) {
    case "PerformancePanel": {
      advancedKeys.value[id] = cloneDeep(advancedKey.value);
      break;
    }
    case "KeymapPanel": {
      if (keymap.value != undefined) {
        keymap.value[currentLayerIndex.value][id] = keyBinding.value;
      }
      break;
    }
    case "DynamicKeyPanel": {
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
              }
              else if (dynamic_key_mutex.target_keys_location.length == 1) {
                dynamic_key_mutex.is_key2_primary = true;
                const binding = keymap.value[currentLayerIndex.value][id];
                dynamic_key_mutex.target_keys_location[1] = { layer: currentLayerIndex.value, id: id };
                keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamicKey.value = dynamic_key_mutex;
              }
              else {
                if (dynamic_key_mutex.is_key2_primary) {
                  const last_binding = dynamicKey.value.get_primary_binding();
                  keymap.value[dynamicKey.value.target_keys_location[1].layer][dynamicKey.value.target_keys_location[1].id] = last_binding;
                  const binding = keymap.value[currentLayerIndex.value][id];
                  dynamicKey.value.target_keys_location[1] = { layer: currentLayerIndex.value, id: id };
                  keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                  dynamicKey.value.set_primary_binding(binding);
                }
                else {
                  const last_binding = dynamicKey.value.get_primary_binding();
                  keymap.value[dynamicKey.value.target_keys_location[0].layer][dynamicKey.value.target_keys_location[0].id] = last_binding;
                  const binding = keymap.value[currentLayerIndex.value][id];
                  dynamicKey.value.target_keys_location[0] = { layer: currentLayerIndex.value, id: id };
                  keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                  dynamicKey.value.set_primary_binding(binding);
                }
              }
              dynamicKeys.value[dynamicKeyIndex.value] = dynamicKey.value;
              triggerRef(dynamicKey);
              mapDynamicKey(keymap.value, dynamicKeys.value);
            }
            break;
          default:
            if (keymap.value != undefined) {
              if (dynamicKey.value.target_keys_location.length == 0) {
                const binding = keymap.value[currentLayerIndex.value][id];
                dynamicKey.value.target_keys_location[0] = { layer: currentLayerIndex.value, id: id };
                keymap.value[currentLayerIndex.value][id] = ((ekc.Keycode.DynamicKey & 0xFF) | ((dynamicKeyIndex.value & 0xFF) << 8));
                dynamicKey.value.set_primary_binding(binding);
              }
              else {
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
    }
    case "RGBPanel": {
      rgbConfigs.value[id] = cloneDeep(rgbConfig.value);
      break;
    }
    case "DebugPanel": {
      controller.value.emit(debugEvent.value.event, debugEvent.value.keycode, id, debugEvent.value.is_virtual, useKeymap.value)
      break;
    }
    case "OscilloscopePanel": {
      const currentKeys = [...oscilloscopeSelectedKeys.value];
      if (!currentKeys.includes(id)) {
        currentKeys.push(id);
        if (currentKeys.length > 4) {
          currentKeys.shift(); 
        }
        oscilloscopeSelectedKeys.value = currentKeys;
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
  advancedKeys: ekc.IAdvancedKey[];
  rgbBaseConfig: ekc.IRGBBaseConfig;
  keymap: number[][];
  rgbConfigs: ekc.IRGBConfig[];
  dynamicKeys: ekc.IDynamicKey[];
}

async function loadDefaultConfig() {
  controller.value.reset_to_default();
  advancedKeys.value = await controller.value.get_advanced_keys();
  keymap.value = await controller.value.get_keymap();
  rgbConfigs.value = await controller.value.get_rgb_configs();
  dynamicKeys.value = await controller.value.get_dynamic_keys();
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
    
    // 假设 selectedDevice 现在存的是 ID 数字，需要找对应的文本名称来比较
    const selectedDeviceName = devices.value.find(d => d.value === selectedDevice.value)?.label;
    if (selectedDeviceName == configData.device) {
      advancedKeys.value.forEach((item, index) => {
        advancedKeys.value[index] = configData.advancedKeys[index];
      });
      if (keymap.value != undefined) {
        keymap.value = keymap.value.map((item, index) => {
          return item.map((item1, index1) => {
            return configData.keymap[index][index1];
          });
        });
      }
      rgbBaseConfig.value = configData.rgbBaseConfig;
      rgbConfigs.value.forEach((item, index) => {
        rgbConfigs.value[index] = configData.rgbConfigs[index];
      });
      dynamicKeys.value.forEach((item, index) => {
        dynamicKeys.value[index] = configData.dynamicKeys[index];
      });
      mapDynamicKey(keymap.value, dynamicKeys.value);
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
  const selectedDeviceName = devices.value.find(d => d.value === selectedDevice.value)?.label;
  const jsonStr = JSON.stringify(
    {
      device: selectedDeviceName,
      advancedKeys: advancedKeys.value,
      keymap: keymap.value,
      rgbBaseConfig: rgbBaseConfig.value,
      rgbConfigs: rgbConfigs.value,
      dynamicKeys: dynamicKeys.value,
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
      message.success("Profile exported.");
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
const menuOptions = computed(() => {
  const opts: MenuOption[] = [];

  // 获取特性标志，如果尚未初始化（未连接），可以使用默认值或全部显示/隐藏
  // 这里假设 feature 初始化为 new Feature()，即默认全 false
  const f = firmwareFeature.value || new ekc.Feature();

  // 1. 性能面板 (通常对应 Advanced Key / Rapid Trigger 功能)
  if (f.advanced_key_flag) {
    opts.push({
      label: t('main_tabs_performance'),
      key: 'PerformancePanel',
    });
  }

  // 2. 按键映射 (核心功能，通常总是显示)
  opts.push({
    label: t('main_tabs_keymap'),
    key: 'KeymapPanel',
  });

  // 3. RGB 面板
  if ((rgbBaseConfig.value || rgbConfigs.value.length > 0)&&f.rgb_flag == true) {
    opts.push({
      label: t('main_tabs_rgb'),
      key: 'RGBPanel',
    });
  }

  // 4. 动态键面板
  if (dynamicKeys.value.length != 0) {
    opts.push({
      label: t('main_tabs_dynamic_key'),
      key: 'DynamicKeyPanel',
    });
  }

  // 5. 宏面板
  if (macros.value.length != 0 && macros.value[0]?.length > 0) {
    opts.push({
      label: t('main_tabs_macro'),
      key: 'MacroPanel',
    });
  }

  // 6. 脚本面板 
  if (f.script_level != ekc.ScriptLevel.Disable) {
    opts.push({
      label: t('main_tabs_script'),
      key: 'ScriptPanel',
    });
  }

  // 7. 调试面板 (通常总是显示，或者仅在开发模式显示)
  if (f.advanced_key_flag) {
    opts.push({
      label: t('main_tabs_debug'),
      key: 'DebugPanel',
    });
  }
  if (f.advanced_key_flag) {
    opts.push({
      label: t('main_tabs_oscilloscope'),
      key: 'OscilloscopePanel',
    });
  }

  // 8. 关于面板 (总是显示)
  opts.push({
    label: t('main_tabs_about'),
    key: 'AboutPanel',
  });

  return opts;
});

watch(menuOptions, (newOpts) => {
  // 检查当前选中的 tab 是否还在新的菜单列表中
  const currentTabExists = newOpts.some(opt => opt.key === tabSelection.value);

  if (!currentTabExists && newOpts.length > 0) {
    // 如果当前 Tab 不存在了，默认跳到列表里的第一项
    tabSelection.value = newOpts[0].key as string;
  }
});

function handleAdvancedMenu(key: string | number) {
  if (isConnected.value) {
    switch (key) {
      case advanced_options.value[0].key: {
        controller.value.flash_config();
        break;
      }
      case advanced_options.value[1].key: {
        controller.value.system_reset();
        break;
      }
      case advanced_options.value[2].key: {
        controller.value.factory_reset();
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
  switch (tabSelection.value) {
    case 'PerformancePanel': return PerformancePanel;
    case 'KeymapPanel': return KeymapPanel;
    case 'RGBPanel': return RGBPanel;
    case 'DynamicKeyPanel': return DynamicKeyPanel;
    case 'DebugPanel': return DebugPanel;
    case 'OscilloscopePanel': return OscilloscopePanel;
    case 'MacroPanel': return MacroPanel;
    case 'ScriptPanel': return ScriptPanel;
    case 'AboutPanel': return AboutPanel;
    default: return null;
  }
});

function handleThemeUpdate() {
  if (themeName.value === 'dark') {
    themeName.value = 'light'
  }
  else {
    themeName.value = 'dark'
  }
}

let layout_labels = ref<Array<Array<string>> | undefined>([[]]);
</script>
<template>
  <n-layout class="root_container">
    
    <n-tabs
      v-model:value="selectedDevice"
      type="card"
      @update:value="handleTabChange"
      style="flex-shrink: 0; padding-top: 8px;"
    >
      <n-tab v-for="dev in devices" :key="dev.value" :name="dev.value">
        {{ dev.label }}
      </n-tab>
    </n-tabs>

    <n-layout style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
      
      <n-layout-header class="header" bordered>
        <n-grid :x-gap="12" :y-gap="12" :cols="5">
          <n-gi :span="4">
            <n-flex align="center">
              <div :style="{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, backgroundColor: isReady ? '#18a058' : (isConnected ? '#f0a020' : '#d32f2f'), boxShadow: isReady ? '0 0 8px #18a058' : 'none', transition: 'all 0.3s' }"></div>
              
              <n-button v-if="isConnected" @click="connectCommand" type="error" secondary>
                {{ t('toolbar_disconnect') }}
              </n-button>
              <n-button v-else @click="connectCommand" type="primary" :disabled="selectedDevice == undefined">
                {{ t('toolbar_connect') }}
              </n-button>
            
              <n-button @click="applyCommand" :disabled="!isReady">{{ t('toolbar_apply') }}</n-button>
              <n-dropdown :disabled="!isReady" @select="handleAdvancedMenu" trigger="hover" placement="bottom-start" :options="advanced_options">
                <n-button :disabled="!isReady">{{ t('toolbar_advance') }}</n-button>
              </n-dropdown>
              <n-button tertiary :type="versionStatusType">{{ displayVersion }}</n-button>
            </n-flex>
          </n-gi>
          <n-gi :span="1">
            <n-flex justify="end">
              <n-button @click="handleThemeUpdate">{{ themeLabelMap[themeName as 'light' | 'dark'] }}</n-button>
              <n-select @update:value="handleLanguageMenu" style="max-width: 100px;" v-model:value="lang" :options="language_options" />
            </n-flex>
          </n-gi>
        </n-grid>
      </n-layout-header>

      <n-layout has-sider style="flex: 1; min-height: 0;">
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
                      <n-radio-group v-if="layers && layers.length > 0" :key="(selectedDevice || 0) + '-' + layers.length" v-model:value="currentLayerIndex" size="small">
                        <n-radio-button v-for="item in layers" :key="item.value" :value="item.value" :label="item.label" />
                      </n-radio-group>
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
                  :controller="controller"
                  :readme-markdown="readmeMarkdown"/>
                </Transition>
              </div>
            </template>
          </n-split>
        </n-layout-content>
      </n-layout>

    </n-layout>
  </n-layout>
</template>

<style scoped>
/* 全新防溢出弹性样式 */
.root_container {
  width: 100%;
  height: 100vh;
  overflow: hidden; 
  display: flex;
  flex-direction: column;
}

.header {
  flex-shrink: 0;
  padding: 16px 24px;
  z-index: 2;
}

:deep(.n-layout) {
  display: flex !important;
  flex-direction: column !important;
  height: 100%;
  /* 🚨 修复4：彻底删除 background: transparent，让 Naive UI 自动应用深浅色背景 */
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
  height: 36px;
  background-color: #f5f5f5;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  position: relative;
  transition: background-color 0.2s;
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
  align-items: center;
  pointer-events: none;
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
  align-items: center;
  pointer-events: none;
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
  background-color: rgba(0, 0, 0, 0.05);
}

.menu-list-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  position: relative;
}

.menu-item-btn {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  transition: all 0.5s;
}

.menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-list-move {
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1) !important;
  z-index: 1; 
  position: relative;
}

.menu-list-enter-active,
.menu-list-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.menu-list-enter-from,
.menu-list-leave-to {
  opacity: 0;
}

.menu-list-leave-active {
  position: absolute;
  left: 8px; 
  right: 8px;
  z-index: 0; 
}
</style>