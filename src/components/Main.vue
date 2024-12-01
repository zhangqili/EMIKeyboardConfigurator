<script setup lang="ts">
import { onMounted, ref, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NLayout, NLayoutHeader, NFlex } from 'naive-ui'
import * as apis from '../apis/api'
import { IAdvancedKey, IRGBConfig, KeyMode } from "../apis/interface";

const { t } = useI18n();
const message = useMessage();
const sidebarWidth = ref(10); // 初始化宽度
const tab_selection = ref<string | null>("performance");
const keyboard_keys = ref<kle.Key[]>([]);
const key_containers = computed(() => {
  var keys = keyboard_keys.value;
  switch (tab_selection.value) {
    case "performance": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        item.labels[0] = advanced_keys.value[index].mode.toString();
      })
      break;
    }
    case "keymap": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        if (keymap.value != undefined) {
          item.labels[0] = keymap.value[0][index].toString();
        }
      })
      break;
    }
    case "rgb": {
      keys.forEach((item, index) => {
        item.labels = item.labels.map(() => "");
        item.labels[0] = rgb_configs.value[index].mode.toString();
      })
      break;
    }
    case "debug": {
      keys.forEach((item) => {
        item.labels = item.labels.map(() => "");
        item.labels[3] = "test4";
      })
      break;
    }
    default: {
      keys.forEach((item) => {
        item.labels = item.labels.map(() => "");
        item.labels[4] = "test5";
      })
      break;
    }
  }
  return keys;
});
const keyboard = ref({
  json: undefined,
  text: JSON.stringify(kle.Serial.deserialize([]), null, 2),
});
var advanced_keys = ref<IAdvancedKey[]>([]);
var rgb_configs = ref<IRGBConfig[]>([]);
var keymap = ref<number[][] | undefined>(undefined);

var devices = ref<{ label: string; value: number }[]>([]);
const selected_device = ref(null);

const advanced_options = [
  {
    label: '复位设备',
    key: ''
  },
  {
    label: '恢复出厂设置',
    key: ''
  }
]

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
  keyboard.value.text = JSON.stringify(value, null, 2);
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

async function getController() {
  advanced_keys.value = await apis.get_advanced_keys();
  keymap.value = await apis.get_keymap();
  rgb_configs.value = await apis.get_rgb_configs();
}

async function handleUpdateValue(_value: string, option: SelectOption) {
  await apis.set_device(option.label as string);
  var layout_json: string = await apis.get_layout_json();
  //console.log(layout_json);
  renderKeyboardFromJson(layout_json);
  getController();
}

function applyToSelectedKey(id: number) {
  //message.info(id.toString());
  var keys = keyboard_keys.value;
  switch (tab_selection.value) {
    case "performance": {
      advanced_keys.value[id].mode = KeyMode.KeyAnalogNormalMode;
      break;
    }
    case "keymap": {
      keys[id].labels = keys[id].labels.map(() => "");
      keys[id].labels[0] = advanced_keys.value[id].mode;
      break;
    }
    case "rgb": {
      keys[id].labels = keys[id].labels.map(() => "");
      keys[id].labels[0] = advanced_keys.value[id].mode;
      break;
    }
    case "debug": {
      keys[id].labels = keys[id].labels.map(() => "");
      keys[id].labels[0] = advanced_keys.value[id].mode;
      break;
    }
    default: {
      keys[id].labels = keys[id].labels.map(() => "");
      keys[id].labels[0] = advanced_keys.value[id].mode;
      break;
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
</script>

<template>
  <n-layout position="absolute">
    <n-layout-header style="height: 80px; padding: 24px" bordered>
      <n-grid :x-gap="12" :y-gap="12" :cols="5">
        <n-gi>
          <n-flex>
            <n-select @update:value="handleUpdateValue" v-model:value="selected_device" v-model:options="devices"
              filterable placeholder="Select device" />
          </n-flex>
        </n-gi>
        <n-gi :span="3">
          <n-flex>
            <n-button @click="getController">{{ t('toolbar_connect') }}</n-button>
            <n-button>{{ t('toolbar_save') }}</n-button>
            <n-dropdown trigger="hover" placement="bottom-start" :options="advanced_options">
              <n-button>{{ t('toolbar_advance') }}</n-button>
            </n-dropdown>
          </n-flex>
        </n-gi>
        <n-gi>
          <n-flex justify="end">
            <n-button>{{ t('toolbar_settings') }}</n-button>
          </n-flex>
        </n-gi>
      </n-grid>
    </n-layout-header>
    <n-layout has-sider position="absolute" style="top: 80px;">
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
            <n-layout-header>
              <KeyboardRender v-model:keys="key_containers" @select="applyToSelectedKey" />
            </n-layout-header>
            <n-layout-content>
              <PerformancePanel v-if="tab_selection == 'performance'" />
              <KeymapPanel v-if="tab_selection == 'keymap'" />
              <RGBPanel v-if="tab_selection == 'rgb'" />
              <DebugPanel v-if="tab_selection == 'debug'" />
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