<script setup lang="ts">
import { onMounted, ref, nextTick, computed, h, getCurrentInstance, triggerRef} from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex, NButton } from 'naive-ui'
import * as apis from '../apis/api'
import * as ekc from "emi-keyboard-controller";
import { DynamicKeyToKeyName, keyBindingModifierToString, keyCodeToKeyName, keyCodeToString, KeyConfig, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex, mapDynamicKey, mapBackDynamicKey } from "../apis/utils";
import {useMainStore} from "../store/main"
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
  config_files,
  selected_config_file_index,
  debug_raw_chart_option, 
  debug_value_chart_option,
  dynamic_keys,
  keyboard_keys,
  theme_name
} = storeToRefs(store);

const message = useMessage();
const notification = useNotification();
const tab_selection = ref<string | null>("PerformancePanel");
const isConnected = ref<boolean>(false);

const themeLabelMap = computed(() => ({
  dark: t('light'),
  light: t('dark')
} satisfies Record<string, string>));

const key_containers = computed(() => {
  var keys = keyboard_keys.value;
  //console.debug(tab_selection.value);
  switch (tab_selection.value) {
    case "PerformancePanel": {
      keys.forEach((item, index) => {
        const advanced_key = advanced_keys.value[index];
        if (advanced_key != undefined) {
          item.labels = item.labels.map(() => "");
          item.labels[0] = keyModeDisplayMap[advanced_key.mode];
          switch (advanced_key.mode) {
            case ekc.KeyMode.KeyAnalogNormalMode: {
              item.labels[3] = `↓${Math.round(advanced_key.activation_value * 1000) / 10}\t↑${Math.round(advanced_key.deactivation_value * 1000) / 10}`;
              break;
            }
            case ekc.KeyMode.KeyAnalogRapidMode: {
              item.labels[3] = `↓${Math.round(advanced_key.trigger_distance * 1000) / 10}\t↑${Math.round(advanced_key.release_distance * 1000) / 10}`;
              item.labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
              break;
            }
            case ekc.KeyMode.KeyAnalogSpeedMode: {
              item.labels[3] = `↓${Math.round(advanced_key.trigger_speed * 1000) / 10}\t↑${Math.round(advanced_key.release_speed * 1000) / 10}`;
              item.labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
              break;
            }
            default: {
              break;
            }
          }
        }
      })
      break;
    }
    case "KeymapPanel":
    case "DynamicKeyPanel": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        if (keymap.value != undefined) {
          if((keymap.value[current_layer.value][index] & 0xFF) == ekc.Keycode.DynamicKey)
          {
            const strings = keyCodeToString(keymap.value[current_layer.value][index]);
            const dk_index = ((keymap.value[current_layer.value][index] >> 8) & 0xFF)
            //item.labels[0] = strings.subString;
            item.labels[6] = DynamicKeyToKeyName[dynamic_keys.value[dk_index].type as ekc.DynamicKeyType];
            item.labels[9] = strings.mainString;
          }
          else
          {
            var strings = keyCodeToString(keymap.value[current_layer.value][index]);
            item.labels[0] = strings.subString;
            item.labels[6] = strings.mainString;
          }
        }
      });
      break;
    }
    case "RGBPanel": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        if(rgb_configs.value[index])
        {
          item.labels[0] = rgbModeDisplayMap[rgb_configs.value[index].mode];
          item.labels[6] = `${Math.round(rgb_configs.value[index].speed * 1000)}\t`;
          item.labels[9] = rgbToHex(rgb_configs.value[index].rgb);
        }
      })
      break;
    }
    case "DebugPanel": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        item.labels[0] = advanced_keys.value[index].raw.toFixed(2);
        item.labels[3] = advanced_keys.value[index].value.toFixed(3);
        item.labels[6] = advanced_keys.value[index].state.toString();
      })
      break;
    }
    default: {
      keys.forEach((item) => {
        item.labels = item.labels.map(() => "");
      })
      break;
    }
  }
  keys.forEach((item,index) => {
    if(rgb_configs.value[index])
      item.color = rgbToHex(rgb_configs.value[index].rgb);
  })
  return keys;
});

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

function updateKeyboard(value: kle.Keyboard) {
  value.keys.forEach((key: kle.Key) => {
    for (const prop in key) {
      if (typeof (key as any)[prop] === "number" && !isNaN((key as any)[prop])) {
        (key as any)[prop] = parseFloat((key as any)[prop].toFixed(6));
      }
    }
  });
  keyboard_layout.value.text = JSON.stringify(value, null, 2);
  keyboard_keys.value = value.keys;
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
      else{
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
  const cnofig_file_num = await apis.get_config_file_num();
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

function updateData()
{
  if (keymap.value != undefined) {
    mapBackDynamicKey(keymap.value, dynamic_keys.value);
  }
  triggerRef(advanced_keys);
  triggerRef(keymap);
  triggerRef(rgb_configs);
  triggerRef(dynamic_keys);
}

async function handleUpdateDeviceValue(_value: string, option: SelectOption) {
  await apis.set_device(option.label as string);
  var layout_json: string = await apis.get_layout_json();
  //console.debug(layout_json);
  renderKeyboardFromJson(layout_json);
  getController();
  apis.addEventListener('updateData',(event: Event) => {updateData();});
}

async function handleUpdateFileValue(_value: string, option: SelectOption) {
  await apis.set_config_file_num(option.value as number);
}

function applyToAllKeys() {
  advanced_keys.value.forEach((item, index) => {
    applyToSelectedKey(index);
    });
}

function applyToSelectedKey(id: number) {
  //message.info(id.toString());
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
      if (dynamic_key.value.type != ekc.DynamicKeyType.DynamicKeyNone ) {
        switch (dynamic_key.value.type) {
          case ekc.DynamicKeyType.DynamicKeyMutex:
            var dynamic_key_mutex = dynamic_key.value as ekc.DynamicKeyMutex;
            if (keymap.value != undefined) {
              if (dynamic_key_mutex.target_keys_location.length == 0) {
                dynamic_key_mutex.is_key2_primary = false;
                const binding = keymap.value[current_layer.value][id];
                dynamic_key_mutex.target_keys_location[0] = {layer: current_layer.value, id: id};
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamic_key.value = dynamic_key_mutex;
                dynamic_key_mutex.key_id[0] = id;
                
              }
              else if (dynamic_key_mutex.target_keys_location.length == 1)
              {
                dynamic_key_mutex.is_key2_primary = true;
                const binding = keymap.value[current_layer.value][id];
                dynamic_key_mutex.target_keys_location[1] = {layer: current_layer.value, id: id};
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key_mutex.set_primary_binding(binding);
                dynamic_key_mutex.key_id[1] = id;
                dynamic_key.value = dynamic_key_mutex;
              }
              else
              {
                if (dynamic_key_mutex.is_key2_primary) {
                  const last_binding = dynamic_key.value.get_primary_binding();
                  keymap.value[dynamic_key.value.target_keys_location[1].layer][dynamic_key.value.target_keys_location[1].id] = last_binding;
                  const binding = keymap.value[current_layer.value][id];
                  dynamic_key.value.target_keys_location[1] = {layer: current_layer.value, id: id};
                  keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                  dynamic_key_mutex.key_id[1] = id;
                  dynamic_key.value.set_primary_binding(binding);
                }
                else
                {
                  const last_binding = dynamic_key.value.get_primary_binding();
                  keymap.value[dynamic_key.value.target_keys_location[0].layer][dynamic_key.value.target_keys_location[0].id] = last_binding;
                  const binding = keymap.value[current_layer.value][id];
                  dynamic_key.value.target_keys_location[0] = {layer: current_layer.value, id: id};
                  keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                  dynamic_key_mutex.key_id[0] = id;
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
                dynamic_key.value.target_keys_location[0] = {layer: current_layer.value, id: id};
                keymap.value[current_layer.value][id] = (ekc.Keycode.DynamicKey & 0xFF | (dynamic_key_index.value & 0xFF << 8));
                dynamic_key.value.set_primary_binding(binding);
              }
              else
              {
                const last_binding = dynamic_key.value.get_primary_binding();
                keymap.value[dynamic_key.value.target_keys_location[0].layer][dynamic_key.value.target_keys_location[0].id] = last_binding;
                const binding = keymap.value[current_layer.value][id];
                dynamic_key.value.target_keys_location[0] = {layer: current_layer.value, id: id};
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
  device : string;
  advanced_keys : ekc.IAdvancedKey[];
  rgb_base_config : ekc.IRGBBaseConfig;
  keymap : number[][];
  rgb_configs : ekc.IRGBConfig[];
  dynamic_keys : ekc.IDynamicKey[];
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
      advanced_keys.value.forEach((item,index)=>{
        advanced_keys.value[index] = configData.advanced_keys[index];
      });
      if (keymap.value != undefined) {
        keymap.value.forEach((item,index)=>{
          item = configData.keymap[index];
        });
      }
      rgb_base_config.value = configData.rgb_base_config;
      rgb_configs.value.forEach((item,index)=>{
        rgb_configs.value[index] = configData.rgb_configs[index];
        });
      dynamic_keys.value.forEach((item,index)=>{
        dynamic_keys.value[index] = configData.dynamic_keys[index];
      });
      mapDynamicKey(keymap.value, dynamic_keys.value);
    }
    else
    {
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
      device : selected_device.value,
      advanced_keys : advanced_keys.value,
      keymap : keymap.value,
      rgb_base_config : rgb_base_config.value,
      rgb_configs : rgb_configs.value,
      dynamic_keys : dynamic_keys.value,
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

const advanced_options = computed(()=> [
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

const language_options = computed(()=> [
  {
    label: 'English',
    value: 'en'
  },
  {
    label: '简体中文',
    value: 'zh'
  }
]);

const menuOptions = computed(()=>[
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
  if(navigator.userAgent.toLowerCase().includes("linux") && localStorage.getItem('dontShowLinuxDetect') != 'true')
  {
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
  if (!('hid' in navigator) && localStorage.getItem('dontShowWebHIDDetect') != 'true')
  {
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


const layers = computed(()=>
  {
    if (keymap.value!=undefined) {
      return keymap.value.map((item,index)=>({
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

</script>

<template>
  <div class="root_container">
    <n-layout has-sider>
      <n-layout-header class="header" bordered>
        <n-grid :x-gap="12" :y-gap="12" :cols="5">
          <n-gi :span="4">
            <n-flex>
              <n-select @update:value="handleUpdateDeviceValue" style="max-width: 200px;" :disabled="isConnected" v-model:value="selected_device"
                v-model:options="devices" filterable :placeholder="t('toolbar_select_device')" />
              <n-button @click="connectCommand" :disabled="selected_device == undefined">{{ isConnected ? t('toolbar_disconnect') :
                t('toolbar_connect') }}</n-button>
              <n-button @click="saveCommand" :disabled="!isConnected">{{ t('toolbar_save') }}</n-button>
              <n-dropdown :disabled="!isConnected" @select="handleAdvancedMenu" trigger="hover" placement="bottom-start"
                :options="advanced_options">
                <n-button :disabled="!isConnected">{{ t('toolbar_advance') }}</n-button>
              </n-dropdown>
            </n-flex>
          </n-gi>
          <n-gi :span="1">
            <n-flex justify="end">
              <n-button
                @click="handleThemeUpdate"
              >
                {{ themeLabelMap[theme_name as 'light'|'dark'] }}
              </n-button>
              <n-select @update:value="handleLanguageMenu" style="max-width: 100px;" v-model:value="lang"
                :options="language_options"/>
            </n-flex>
          </n-gi>
        </n-grid>
      </n-layout-header>
      <div class="container">
        <n-layout-sider :width="200" style="flex-shrink: 0;">
          <div style="margin-left: 8px; margin-top: 8px; margin-right: 8px;">
            <n-select style="font-size: 14px;" size="large" :placeholder="t('main_tabs_config_file')" @update:value="handleUpdateFileValue" 
            v-model:value="selected_config_file_index" v-model:options="files"></n-select>
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
            <n-menu
              :indent="20" :options="menuOptions" v-model:value="tab_selection">
            </n-menu>
          </n-space>
        </n-layout-sider>
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div class="keyboard_render">
            <KeyboardRender v-model:keys="key_containers" @select="applyToSelectedKey" />
            <div style="display: flex; justify-content: center; min-height: 24px;" >
              <Transition>
                <n-radio-group v-model:value="current_layer" size="small" v-if="tab_selection == 'KeymapPanel'||tab_selection == 'DynamicKeyPanel'">
                  <TransitionGroup name="list">
                    <n-radio-button v-for="item in layers" :key="item.value" :value="item.value" :label="item.label" />
                  </TransitionGroup>
                </n-radio-group>
              </Transition>
            </div>
            <Transition>
              <div style="position: relative;"  v-if="tab_selection == 'PerformancePanel'||tab_selection == 'KeymapPanel'||tab_selection == 'RGBPanel'">
                <n-button size="small" style="position: absolute; bottom: 0px;" @click="applyToAllKeys">{{ t('apply_to_all') }}</n-button>
              </div>
            </Transition>
            <n-divider style="margin: 0px;"/>
          </div>
          <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
            <Transition name="fade" mode="out-in" >
              <component :is="currentPanel"/>
            </Transition>
          </div>
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
      flex-grow: 1; /* 让右侧占据剩余空间 */
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
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.25s ease-in-out;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }

  .nav-end {
    display: flex;
    align-items: center;
  }
</style>