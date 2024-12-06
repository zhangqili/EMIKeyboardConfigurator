;''
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';
import { rgbToHex } from '../apis/utils';
import tinycolor from "tinycolor2";

const { t } = useI18n();

const props = defineProps<{ rgb_config: ekc.IRGBConfig }>();
const emit = defineEmits(['update:rgb_config']);

const speed = computed<number>({
  get: () => (Math.round(props.rgb_config.speed * 1000)),
  set: (value: number) => {
    props.rgb_config.speed = isNaN(value) ? 0 : Math.round(value) / 1000;
  },
});

const mode = computed<ekc.RGBMode>({
  get: () => props.rgb_config.mode,
  set: (value: ekc.RGBMode) => {
    props.rgb_config.mode = value;
  },
});

const color = computed<string>({
  get: () => rgbToHex(props.rgb_config.rgb),
  set: (value: string) => {
    var c = tinycolor(value).toRgb();
    props.rgb_config.rgb.red = c.r;
    props.rgb_config.rgb.green = c.g;
    props.rgb_config.rgb.blue = c.b;
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
</template>

<style></style>