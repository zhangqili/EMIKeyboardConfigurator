;''
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';
import { rgbToHex } from '../apis/utils';
import tinycolor from "tinycolor2";
import { useMainStore } from '../store/main';
import { storeToRefs } from 'pinia';

const { t } = useI18n();
const store = useMainStore();
const {rgb_config, keyboard_keys, rgb_configs, rgb_base_config} = storeToRefs(store);
const direction = ref(0);
const density = ref(10);

const base_speed = computed<number>({
  get: () => (Math.round(rgb_base_config.value.speed * 1000)),
  set: (value: number) => {
    rgb_base_config.value.speed = isNaN(value) ? 0 : Math.round(value) / 1000;
  },
});

const base_mode = computed<ekc.RGBBaseMode>({
  get: () => rgb_base_config.value.mode,
  set: (value: ekc.RGBBaseMode) => {
    rgb_base_config.value.mode = value;
  },
});

const base_color = computed<string>({
  get: () => rgbToHex(rgb_base_config.value.rgb),
  set: (value: string) => {
    var c = tinycolor(value).toRgb();
    rgb_base_config.value.rgb.red = c.r;
    rgb_base_config.value.rgb.green = c.g;
    rgb_base_config.value.rgb.blue = c.b;
  },
});

const base_sub_color = computed<string>({
  get: () => rgbToHex(rgb_base_config.value.secondary_rgb),
  set: (value: string) => {
    var c = tinycolor(value).toRgb();
    rgb_base_config.value.secondary_rgb.red = c.r;
    rgb_base_config.value.secondary_rgb.green = c.g;
    rgb_base_config.value.secondary_rgb.blue = c.b;
  },
});

const base_direction = computed<number>({
  get: () => rgb_base_config.value.direction,
  set: (value: number) => {
    rgb_base_config.value.direction = value;
  },
});

const base_density = computed<number>({
  get: () => rgb_base_config.value.density,
  set: (value: number) => {
    rgb_base_config.value.density = value;
  },
});

const base_brightness = computed<number>({
  get: () => rgb_base_config.value.brightness,
  set: (value: number) => {
    rgb_base_config.value.brightness = value;
  },
});

const speed = computed<number>({
  get: () => (Math.round(rgb_config.value.speed * 1000)),
  set: (value: number) => {
    rgb_config.value.speed = isNaN(value) ? 0 : Math.round(value) / 1000;
  },
});

const mode = computed<ekc.RGBMode>({
  get: () => rgb_config.value.mode,
  set: (value: ekc.RGBMode) => {
    rgb_config.value.mode = value;
  },
});

const color = computed<string>({
  get: () => rgbToHex(rgb_config.value.rgb),
  set: (value: string) => {
    var c = tinycolor(value).toRgb();
    rgb_config.value.rgb.red = c.r;
    rgb_config.value.rgb.green = c.g;
    rgb_config.value.rgb.blue = c.b;
  },
});

const base_modes = computed(()=>
  [
    {
      value: ekc.RGBBaseMode.RgbBaseModeOff,
      label: t('rgb_base_mode_off')
    },
    {
      value: ekc.RGBBaseMode.RgbBaseModeBlank,
      label: t('rgb_base_mode_blank')
    },
    {
      value: ekc.RGBBaseMode.RgbBaseModeRainbow,
      label: t('rgb_base_mode_rainbow')
    },
    {
      value: ekc.RGBBaseMode.RgbBaseModeWave,
      label: t('rgb_base_mode_wave')
    },
  ].map((s) => {
    return s;
  })
);

const modes = computed(()=>
  [
    {
      value: ekc.RGBMode.RgbModeFixed,
      label: t('rgb_mode_fixed')
    },
    {
      value: ekc.RGBMode.RgbModeStatic,
      label: t('rgb_mode_static')
    },
    {
      value: ekc.RGBMode.RgbModeCycle,
      label: t('rgb_mode_cycle')
    },
    {
      value: ekc.RGBMode.RgbModeLinear,
      label: t('rgb_mode_linear')
    },
    {
      value: ekc.RGBMode.RgbModeTrigger,
      label: t('rgb_mode_trigger')
    },
    {
      value: ekc.RGBMode.RgbModeString,
      label: t('rgb_mode_string')
    },
    {
      value: ekc.RGBMode.RgbModeFadingString,
      label: t('rgb_mode_fading_string')
    },
    {
      value: ekc.RGBMode.RgbModeDiamondRipple,
      label: t('rgb_mode_diamond_ripple')
    },
    {
      value: ekc.RGBMode.RgbModeFadingDiamondRipple,
      label: t('rgb_mode_fading_diamond_ripple')
    },
    {
      value: ekc.RGBMode.RgbModeJelly,
      label: t('rgb_mode_jelly')
    },
  ].map((s) => {
    return s;
  })
);


function applyRainbowEffect() {
  keyboard_keys.value.forEach((key, index) => {
    var reference_color = tinycolor(color.value).toHsv();
    var direction_c = direction.value / 360 * 2 * Math.PI;
    var vertical_distance = (key.x + key.width/2) * Math.cos(direction_c) + (key.y + key.height/2) * Math.sin(direction_c);
    reference_color.h = (reference_color.h + vertical_distance * density.value) % 360;
    if (reference_color.h < 0) {
      reference_color.h += 360;
    }
    var real_color = tinycolor(reference_color).toRgb();
    rgb_configs.value[index].rgb.red = real_color.r;
    rgb_configs.value[index].rgb.green = real_color.g;
    rgb_configs.value[index].rgb.blue = real_color.b;
    rgb_configs.value[index].mode = rgb_config.value.mode;
    rgb_configs.value[index].speed = isNaN(speed.value) ? 0 : Math.round(speed.value) / 1000;
  });
}


</script>

<template>
  <div style="flex: 1; display: flex; height: 100%;">
    <div style="flex: 1; display: flex; height: 100%;">
      <n-card style="height: 100%; flex:400px;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" :title="t('rgb_panel_main_title')">
        <n-scrollbar>
          <n-space vertical>
            <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
              <n-form-item :label="t('rgb_panel_mode')">
                <n-select :options="base_modes" v-model:value="base_mode">
                </n-select>
              </n-form-item>
              <n-form-item :label="t('rgb_panel_color')">
                <n-color-picker v-model:value="base_color" :show-preview="true" :show-alpha="false"/>
              </n-form-item>
              <n-form-item :label="t('rgb_panel_secondary_color')">
                <n-color-picker v-model:value="base_sub_color" :show-preview="true" :show-alpha="false"/>
              </n-form-item>
              <n-form-item :label="t('rgb_panel_speed')">
                <n-input-number v-model:value="base_speed" :placeholder="t('rgb_panel_speed')"/>
              </n-form-item>
              <n-form-item :label="t('rgb_panel_direction')">
                <n-input-number v-model:value="base_direction" :placeholder="t('rgb_panel_direction')" :min="0" :max="360"/>
              </n-form-item>
              <n-form-item :label="t('rgb_panel_density')">
                <n-input-number v-model:value="base_density" :placeholder="t('rgb_panel_density')" :min="0" :max="255"/>
              </n-form-item>
              <n-form-item :label="t('rgb_panel_brightness')">
                <n-input-number v-model:value="base_brightness" :placeholder="t('rgb_panel_brightness')" :min="0" :max="255"/>
              </n-form-item>
            </n-form>
          </n-space>
        </n-scrollbar>
      </n-card>
      <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;"
      :title="t('rgb_panel_sub_title')">
        <n-space vertical>
          <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
            <n-form-item :label="t('rgb_panel_mode')">
              <n-select :options="modes" v-model:value="mode">
              </n-select>
            </n-form-item>
            <n-form-item :label="t('rgb_panel_color')">
              <n-color-picker v-model:value="color" :show-preview="true" :show-alpha="false"/>
            </n-form-item>
            <n-form-item :label="t('rgb_panel_speed')">
              <n-input-number v-model:value="speed" :placeholder="t('rgb_panel_speed')"/>
            </n-form-item>
          </n-form>
          <n-collapse>
            <n-collapse-item :title="t('rgb_panel_rainbow_preset')" class="no-select">
              <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
                <n-form-item :label="t('rgb_panel_rainbow_direction')">
                  <n-input-number :placeholder="t('rgb_panel_rainbow_direction')" v-model:value="direction"/>
                </n-form-item>
                <n-form-item :label="t('rgb_panel_rainbow_density')">
                  <n-input-number :placeholder="t('rgb_panel_rainbow_density')" v-model:value="density"/>
                </n-form-item>
              </n-form>
              <n-button @click="applyRainbowEffect">{{ t('apply') }}</n-button>
            </n-collapse-item>
          </n-collapse>
        </n-space>
      </n-card>
    </div>
  </div>
</template>

<style></style>