<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import * as kle from "@ijprest/kle-serial";
import { useMessage, SelectOption, NMessageProvider, darkTheme, useOsTheme, NConfigProvider, NLayout, NLayoutHeader, NFlex } from 'naive-ui'
import * as apis from '../apis/api'
import { invoke } from '@tauri-apps/api/core';
import { IAdvancedKey, IRGBConfig } from "../apis/interface";

const { t } = useI18n();
const message = useMessage();
const sidebarWidth = ref(10); // 初始化宽度
const tab_selection = ref<string | null>("performance");
const keys = ref([]);
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

function initializeKeyboardFromJson(json_str: string) {
  var layout = JSON.parse(json_str);
  try {
    const parsedKeyboard = kle.Serial.deserialize(layout);
    updateKeyboard(parsedKeyboard);
  } catch (error) {
    message.error('Failed to parse keyboard layout');
  }
}

function initializeKeyboard() {
  try {
    //const parsedKeyboard = kle.Serial.deserialize(zellia80HELayout);
    //updateKeyboard(parsedKeyboard);
  } catch (error) {
    message.error('Failed to parse keyboard layout');
  }
}


function updateKeyboard(value: kle.Keyboard) {
  value.keys.forEach((key) => {
    for (const prop in key) {
      if (typeof key[prop] === "number" && !isNaN(key[prop])) {
        key[prop] = parseFloat(key[prop].toFixed(6));
      }
    }
  });
  keyboard.value.text = JSON.stringify(value, null, 2);
  keys.value = value.keys;
}

function updateSidebarWidth() {
  nextTick(() => {
    const tabsNavWrapper = document.querySelector('.n-tabs-nav-scroll-wrapper');
    if (tabsNavWrapper) {
      sidebarWidth.value = tabsNavWrapper.clientWidth;
    }
  });
}

async function handleUpdateValue(value: string, option: SelectOption) {
  await apis.set_device(option.label);
  var layout_json: string = await apis.get_layout_json();
  console.log(layout_json);
  initializeKeyboardFromJson(layout_json);
}

function applyToSelectedKey(id : number) {
  message.info(id);
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
            <n-button @click="test">{{ t('toolbar_connect') }}</n-button>
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
              <KeyboardRender :keys="keys" @select="applyToSelectedKey"/>
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