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
const {rgb_config, keyboard_keys, rgb_configs} = storeToRefs(store);
const direction = ref(0);
const density = ref(10);

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
  <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
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
          <n-input-number v-model:value="speed" placeholder="Speed"/>
        </n-form-item>
      </n-form>
      <n-collapse>
        <n-collapse-item title="Rainbow Preset" class="no-select">
          <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
            <n-form-item label="Direction">
              <n-input-number placeholder="Direction" v-model:value="direction"/>
            </n-form-item>
            <n-form-item label="Density">
              <n-input-number placeholder="Density" v-model:value="density"/>
            </n-form-item>
          </n-form>
          <n-button @click="applyRainbowEffect">Apply</n-button>
        </n-collapse-item>
      </n-collapse>
    </n-space>
  </n-card>
</template>

<style></style>