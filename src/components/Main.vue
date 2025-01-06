<script setup lang="ts">
import { onMounted, ref, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex } from 'naive-ui'
import * as apis from '../apis/api'
import * as ekc from "emi-keyboard-controller";
import { keyBindingModifierToString, keyCodeToKeyName, keyCodeToString, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex } from "../apis/utils";
import { listen } from "@tauri-apps/api/event";
import {useMainStore} from "../store/main"
import { storeToRefs } from "pinia";
import { DebugDataItem } from '../apis/utils';

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
  debug_raw_chart_option, 
  debug_value_chart_option 
} = storeToRefs(store);

const message = useMessage();
const sidebarWidth = ref(10); // 初始化宽度
const tab_selection = ref<string | null>("performance");
const keyboard_keys = ref<kle.Key[]>([]);
const isConnected = ref<boolean>(false);

const key_containers = computed(() => {
  var keys = keyboard_keys.value;
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

const containerRef = ref<HTMLElement | undefined>(undefined);
//const selected_device = ref(undefined);

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

function updateSidebarWidth() {
  nextTick(() => {
    const tabsNavWrapper = document.querySelector('.n-tabs-nav-scroll-wrapper');
    if (tabsNavWrapper) {
      sidebarWidth.value = tabsNavWrapper.clientWidth;
    }
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
  //console.log(rgb_configs.value);
}

async function handleUpdateValue(_value: string, option: SelectOption) {
  await apis.set_device(option.label as string);
  var layout_json: string = await apis.get_layout_json();
  //console.log(layout_json);
  renderKeyboardFromJson(layout_json);
  getController();
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
]

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
  updateSidebarWidth();
  //window.addEventListener('resize', updateSidebarWidth); // Update width on window resize
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
  <n-layout position="absolute">
    <n-layout-header style="height: 80px; padding: 24px" bordered>
      <n-grid :x-gap="12" :y-gap="12" :cols="5">
        <n-gi :span="4">
          <n-flex>
            <n-select @update:value="handleUpdateValue" style="max-width: 200px;" :disabled="isConnected" v-model:value="selected_device"
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
<!--             <n-button >Import</n-button>
            <n-button >Export</n-button> -->
            <n-button>{{ t('toolbar_settings') }}</n-button>
          </n-flex>
        </n-gi>
      </n-grid>
    </n-layout-header>
    <n-layout has-sider position="absolute" style="top: 80px;" >
      <n-layout position="absolute" content-style="padding: 0px;">

        <n-layout has-sider position="absolute">
          <n-layout-sider ref="sidebar" :width="sidebarWidth">
            <n-tabs line v-model:value=tab_selection animated :placement="'left'">
              <n-tab name="performance" :tab="t('main_tabs_performance')">
              </n-tab>
              <n-tab name="keymap" :tab="t('main_tabs_keymap')">
              </n-tab>
              <n-tab name="rgb" :tab="t('main_tabs_rgb')">
              </n-tab>
              <n-tab name="debug" :tab="t('main_tabs_debug')">
              </n-tab>
            </n-tabs>
          </n-layout-sider>

          <n-layout>
            <n-layout-header style="position: sticky; top: 0px; z-index: 2;">
              <KeyboardRender v-model:keys="key_containers" @select="applyToSelectedKey" />
              <n-button @click="applyToAllKeys">Apply to all</n-button>
            </n-layout-header>
            <n-layout-content>
              <PerformancePanel v-if="tab_selection == 'performance'"/>
              <KeymapPanel v-if="tab_selection == 'keymap'"/>
              <RGBPanel v-if="tab_selection == 'rgb'"/>
              <DebugPanel v-if="tab_selection == 'debug'"/>
            </n-layout-content>
            <n-layout-footer>

            </n-layout-footer>
          </n-layout>
        </n-layout>
      </n-layout>
    </n-layout>
    <!--       <n-layout-footer
              bordered
              position="absolute"
              style="height: 64px;"
            >
            </n-layout-footer> -->
  </n-layout>
</template>