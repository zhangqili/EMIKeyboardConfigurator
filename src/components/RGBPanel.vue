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
const {rgb_config} = storeToRefs(store);

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

const modes =
  [
    {
      value: ekc.RGBMode.RgbModeFixed,
      label: 'Fixed'
    },
    {
      value: ekc.RGBMode.RgbModeStatic,
      label: 'Static'
    },
    {
      value: ekc.RGBMode.RgbModeCycle,
      label: 'Cycle'
    },
    {
      value: ekc.RGBMode.RgbModeLinear,
      label: 'Linear'
    },
    {
      value: ekc.RGBMode.RgbModeTrigger,
      label: 'Trigger'
    },
    {
      value: ekc.RGBMode.RgbModeString,
      label: 'String'
    },
    {
      value: ekc.RGBMode.RgbModeFadingString,
      label: 'Fading String'
    },
    {
      value: ekc.RGBMode.RgbModeDiamondRipple,
      label: 'Diamond Ripple'
    },
    {
      value: ekc.RGBMode.RgbModeFadingDiamondRipple,
      label: 'Fading Diamond Ripple'
    },
    {
      value: ekc.RGBMode.RgbModeJelly,
      label: 'Jelly'
    },
  ].map((s) => {
    return s;
  });

</script>

<template>
  <n-card>
    <n-space vertical>
      <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
        <n-form-item label="Mode">
          <n-select :options="modes" v-model:value="mode">
          </n-select>
        </n-form-item>
        <n-form-item label="Color">
          <n-color-picker v-model:value="color" :show-preview="true" :show-alpha="false"/>
        </n-form-item>
        <n-form-item label="Speed">
          <n-input-number v-model:value="speed" placeholder="Speed" :min="0" :max="100" />
        </n-form-item>
      </n-form>
    </n-space>
  </n-card>
</template>

<style></style>