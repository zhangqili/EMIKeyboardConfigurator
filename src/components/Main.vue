<script setup lang="ts">
import { onMounted, ref, nextTick, computed, h, getCurrentInstance, triggerRef} from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex, NButton } from 'naive-ui'
import * as apis from '../apis/api'
import * as ekc from "emi-keyboard-controller";
import { keyBindingModifierToString, keyCodeToKeyName, keyCodeToString, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex } from "../apis/utils";
import { listen } from "@tauri-apps/api/event";
import {useMainStore} from "../store/main"
import { storeToRefs } from "pinia";
import { DebugDataItem } from '../apis/utils';
import type { MenuOption, NotificationType } from 'naive-ui'
import { useNotification } from 'naive-ui'

const { t } = useI18n();
const store = useMainStore();
const { 
  selected_device,
  advanced_key, 
  rgb_config, 
  advanced_keys, 
  rgb_configs, 
  keymap, 
  key_binding, 
  selected_layer, 
  config_files,
  selected_config_file_index,
  debug_raw_chart_option, 
  debug_value_chart_option 
} = storeToRefs(store);

const message = useMessage();
const notification = useNotification();
const tab_selection = ref<string | null>("performance");
const keyboard_keys = ref<kle.Key[]>([]);
const isConnected = ref<boolean>(false);

const key_containers = computed(() => {
  var keys = keyboard_keys.value;
  //console.log(tab_selection.value);
  switch (tab_selection.value) {
    case "performance": {
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
    case "keymap": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        if (keymap.value != undefined) {
          var strings = keyCodeToString(keymap.value[selected_layer.value][index]);
          item.labels[0] = strings.subString;
          item.labels[6] = strings.mainString;
        }
      })
      break;
    }
    case "rgb": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        item.labels[0] = rgbModeDisplayMap[rgb_configs.value[index].mode];
        item.labels[3] = `${Math.round(rgb_configs.value[index].speed * 1000)}\t`;
        item.labels[9] = rgbToHex(rgb_configs.value[index].rgb);
      })
      break;
    }
    case "debug": {
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
        item.labels[0] = "null";
      })
      break;
    }
  }
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
        message.success("Found device");
      }
      else{
        message.error("Device not found");
      }
      //await apis.receive_data_in_background();
    }
  }
}

async function saveCommand() {
  if (isConnected.value) {
    apis.set_advanced_keys(advanced_keys.value);
    if (keymap.value != undefined) {
      apis.set_keymap(keymap.value);
    }
    apis.set_rgb_configs(rgb_configs.value);
    var result = await apis.save_config();
    console.log(result);

  }
}

async function flashCommand() {
  if (isConnected.value) {
    var result = await apis.flash_config();
    console.log(result);

  }
}

async function getController() {
  advanced_keys.value = await apis.get_advanced_keys();
  keymap.value = await apis.get_keymap();
  rgb_configs.value = await apis.get_rgb_configs();
  const cnofig_file_num = await apis.get_config_file_num();
  files.value.length = 0;
  for (let index = 0; index < cnofig_file_num; index++) {
    files.value.push({
    label: "config" + index.toString(),
    value: index,
  });
  }
  //console.log(rgb_configs.value);
}

async function handleUpdateDeviceValue(_value: string, option: SelectOption) {
  await apis.set_device(option.label as string);
  var layout_json: string = await apis.get_layout_json();
  //console.log(layout_json);
  renderKeyboardFromJson(layout_json);
  getController();
  apis.addEventListener('updateData',(event: Event) => {triggerRef(keyboard_keys)});
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
    case "performance": {
      advanced_keys.value[id] = JSON.parse(JSON.stringify(advanced_key.value));
      break;
    }
    case "keymap": {
      if (keymap.value != undefined) {
        keymap.value[selected_layer.value][id] = key_binding.value;
      }
      break;
    }
    case "rgb": {
      rgb_configs.value[id] = JSON.parse(JSON.stringify(rgb_config.value));
      break;
    }
    case "debug": {
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

const advanced_options = [
  {
    label: 'Flash configuration',
    key: 'flash config'
  },
  {
    label: 'System reset',
    key: 'system reset'
  },
  {
    label: 'Factory reset',
    key: 'factory reset'
  }
];

const menuOptions: MenuOption[] = [
  {
    label: t('main_tabs_performance'),
    key: 'performance',
  },
  {
    label: t('main_tabs_keymap'),
    key: 'keymap',
  },
  {
    label: t('main_tabs_rgb'),
    key: 'rgb',
  },
  {
    label: t('main_tabs_debug'),
    key: 'debug',
  },
];


function handleAdvancedMenu(key: string | number) {
  if (isConnected.value) {
    switch (key) {
      case advanced_options[0].key: {
        apis.flash_config();
        break;
      }
      case advanced_options[1].key: {
        apis.system_reset();
        break;
      }
      case advanced_options[2].key: {
        apis.factory_reset();
        break;
      }
      default: {
        break;
      }
    }

  }
}

onMounted(async () => {
  //initializeKeyboard();
  if(navigator.userAgent.toLowerCase().includes("linux"))
  {
    notification.warning(
      {
        title: 'Linux system detected',
        content: 'You may modifiy udev rules to connect to your device.',
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
            },
            {
              default: () => "Don't show again"
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

listen<ekc.IAdvancedKey[]>('update-value', (event) => {
  //console.log(event.payload);
  advanced_keys.value.forEach((key, index) => {
    key.raw = event.payload[index].raw;
    key.value = event.payload[index].value;
    key.state = event.payload[index].state;
  }
  );
});
</script>

<template>
  <div class="root_container">
    <n-layout>
      <n-layout-header class="header" bordered>
        <n-grid :x-gap="12" :y-gap="12" :cols="5">
          <n-gi :span="4">
            <n-flex>
              <n-select @update:value="handleUpdateDeviceValue" style="max-width: 200px;" :disabled="isConnected" v-model:value="selected_device"
                v-model:options="devices" filterable placeholder="Select device" />
              <n-button @click="connectCommand" :disabled="selected_device == undefined">{{ isConnected ? "Disconnect" :
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
              <!--<n-button >Import</n-button>
              <n-button >Export</n-button>-->
              <n-button>{{ t('toolbar_settings') }}</n-button>
            </n-flex>
          </n-gi>
        </n-grid>
      </n-layout-header>
      <n-layout has-sider class="container">
        <n-layout-sider :width="200">
          <n-space vertical>
            <div style="margin-left: 8px; margin-top: 8px; margin-right: 8px;">
              <n-select placeholder="Config file" @update:value="handleUpdateFileValue" 
              v-model:value="selected_config_file_index" v-model:options="files"></n-select>
            </div>
            <n-menu
              :options="menuOptions" v-model:value="tab_selection">
            </n-menu>
          </n-space>
        </n-layout-sider>
        <n-layout-content >
          <n-layout class="keyboard_render">
            <KeyboardRender v-model:keys="key_containers" @select="applyToSelectedKey" />
            <n-button @click="applyToAllKeys">Apply to all</n-button>
          </n-layout>
          <div style="flex-grow: 1;">
            <PerformancePanel v-if="tab_selection == 'performance'"/>
            <KeymapPanel v-if="tab_selection == 'keymap'"/>
            <RGBPanel v-if="tab_selection == 'rgb'"/>
            <DebugPanel v-if="tab_selection == 'debug'"/>
          </div>
        </n-layout-content>
      </n-layout>
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
  .tabs {
      position: sticky;
      top: 80px;
      white-space: nowrap; /* 防止内容换行 */
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
    position: absolute;
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
    position: sticky;
    top: 0px;
    z-index: 2;
  }
  
</style>