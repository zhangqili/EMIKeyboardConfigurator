<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex, NCard, NForm, NFormItem, NSelect, NColorPicker, NInputNumber, NCollapse, NCollapseItem, NButton, NScrollbar } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';
import { KeyConfig, rgbToHex } from '@/apis/utils';
import tinycolor from "tinycolor2";
import { useMainStore } from '@/store/main';
import { storeToRefs } from 'pinia';

const { t } = useI18n();

const props = defineProps({
  selectedKeys: { type: Array as () => number[], required: true }
});

interface KeyboardContext {
  keyboardKeys: Ref<KeyConfig[]>;
  advancedKeys: Ref<ekc.IAdvancedKey[]>;
  rgbConfigs: Ref<ekc.IRGBConfig[]>;
  keymap: Ref<number[][]>;
  dynamicKeys: Ref<ekc.IDynamicKey[]>;
  currentLayerIndex: Ref<number>;
  tabSelection: Ref<string | null>;
}

const { 
  keyboardKeys,
  advancedKeys,
  rgbConfigs, 
  keymap, 
  currentLayerIndex, 
  tabSelection,
  dynamicKeys
} = inject<KeyboardContext>('keyboardContext')!;

const direction = ref(0);
const density = ref(10);
const rainbow_color = ref('#800000');

// ==========================================
// 全局底灯效果 (Base Config) - 保持单体绑定不变
// ==========================================
const rgbBaseConfig = defineModel<ekc.IRGBBaseConfig>('rgbBaseConfig', { default: new ekc.RGBBaseConfig() });

const base_speed = computed<number>({
  get: () => (Math.round(rgbBaseConfig.value.speed)),
  set: (value: number) => {
    rgbBaseConfig.value.speed = isNaN(value) ? 0 : Math.round(value);
  },
});
const base_mode = computed<ekc.RGBBaseMode>({
  get: () => rgbBaseConfig.value.mode,
  set: (value: ekc.RGBBaseMode) => {
    rgbBaseConfig.value.mode = value;
  },
});
const base_color = computed<string>({
  get: () => rgbToHex(rgbBaseConfig.value.rgb),
  set: (value: string) => {
    var c = tinycolor(value).toRgb();
    rgbBaseConfig.value.rgb.red = c.r;
    rgbBaseConfig.value.rgb.green = c.g;
    rgbBaseConfig.value.rgb.blue = c.b;
  },
});
const base_sub_color = computed<string>({
  get: () => rgbToHex(rgbBaseConfig.value.secondary_rgb),
  set: (value: string) => {
    var c = tinycolor(value).toRgb();
    rgbBaseConfig.value.secondary_rgb.red = c.r;
    rgbBaseConfig.value.secondary_rgb.green = c.g;
    rgbBaseConfig.value.secondary_rgb.blue = c.b;
  },
});
const base_direction = computed<number>({
  get: () => rgbBaseConfig.value.direction,
  set: (value: number) => {
    rgbBaseConfig.value.direction = value;
  },
});
const base_density = computed<number>({
  get: () => rgbBaseConfig.value.density,
  set: (value: number) => {
    rgbBaseConfig.value.density = value;
  },
});
const base_brightness = computed<number>({
  get: () => rgbBaseConfig.value.brightness,
  set: (value: number) => {
    rgbBaseConfig.value.brightness = value;
  },
});

// 通用标量属性工厂函数 (用于 mode 和 speed)
function useSharedRGBProperty(propName: keyof ekc.IRGBConfig) {
  return computed<any>({
    get: () => {
      if (!props.selectedKeys || props.selectedKeys.length === 0) return null;
      const firstVal = rgbConfigs.value[props.selectedKeys[0]][propName];
      const isAllSame = props.selectedKeys.every(id => rgbConfigs.value[id][propName] === firstVal);
      return isAllSame ? Math.round(firstVal as number) : null;
    },
    set: (val: any) => {
      if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return;
      props.selectedKeys.forEach(id => {
        (rgbConfigs.value[id] as any)[propName] = val;
      });
    }
  });
}

const speed = useSharedRGBProperty('speed');
const mode = useSharedRGBProperty('mode');

const color = computed<string | null>({
  get: () => {
    if (!props.selectedKeys || props.selectedKeys.length === 0) return null;
    const firstRGB = rgbConfigs.value[props.selectedKeys[0]].rgb;
    
    // 判断所有选中的按键 R,G,B 是否完全一致
    const isAllSame = props.selectedKeys.every(id => {
      const currentRGB = rgbConfigs.value[id].rgb;
      return currentRGB.red === firstRGB.red && 
             currentRGB.green === firstRGB.green && 
             currentRGB.blue === firstRGB.blue;
    });

    return isAllSame ? rgbToHex(firstRGB) : null;
  },
  set: (value: string | null) => {
    if (!value) return;
    const c = tinycolor(value).toRgb();
    props.selectedKeys.forEach(id => {
      rgbConfigs.value[id].rgb.red = c.r;
      rgbConfigs.value[id].rgb.green = c.g;
      rgbConfigs.value[id].rgb.blue = c.b;
    });
  }
});


const base_modes = computed(()=>
  [
    { value: ekc.RGBBaseMode.RgbBaseModeOff, label: t('rgb_base_mode_off') },
    { value: ekc.RGBBaseMode.RgbBaseModeBlank, label: t('rgb_base_mode_blank') },
    { value: ekc.RGBBaseMode.RgbBaseModeRainbow, label: t('rgb_base_mode_rainbow') },
    { value: ekc.RGBBaseMode.RgbBaseModeWave, label: t('rgb_base_mode_wave') },
  ]
);

const modes = computed(()=>
  [
    { value: ekc.RGBMode.RgbModeFixed, label: t('rgb_mode_fixed') },
    { value: ekc.RGBMode.RgbModeStatic, label: t('rgb_mode_static') },
    { value: ekc.RGBMode.RgbModeCycle, label: t('rgb_mode_cycle') },
    { value: ekc.RGBMode.RgbModeLinear, label: t('rgb_mode_linear') },
    { value: ekc.RGBMode.RgbModeTrigger, label: t('rgb_mode_trigger') },
    { value: ekc.RGBMode.RgbModeString, label: t('rgb_mode_string') },
    { value: ekc.RGBMode.RgbModeFadingString, label: t('rgb_mode_fading_string') },
    { value: ekc.RGBMode.RgbModeDiamondRipple, label: t('rgb_mode_diamond_ripple') },
    { value: ekc.RGBMode.RgbModeFadingDiamondRipple, label: t('rgb_mode_fading_diamond_ripple') },
    { value: ekc.RGBMode.RgbModeJelly, label: t('rgb_mode_jelly') },
    { value: ekc.RGBMode.RgbModeBubble, label: t('rgb_mode_bubble') },
  ]
);

function applyRainbowEffect() {
  keyboardKeys.value.forEach((key) => {
    // 拦截：仅计算被选中的按键
    if (!props.selectedKeys.includes(key.id)) return;

    // 如果因为混合状态 color 为 null，默认给个红色基准进行推算
    var reference_color = tinycolor(rainbow_color.value).toHsv();
    var direction_c = direction.value / 360 * 2 * Math.PI;
    var vertical_distance = (key.x + key.width/2) * Math.cos(direction_c) + (key.y + key.height/2) * Math.sin(direction_c);
    
    reference_color.h = (reference_color.h + vertical_distance * density.value) % 360;
    if (reference_color.h < 0) {
      reference_color.h += 360;
    }
    
    var real_color = tinycolor(reference_color).toRgb();
    rgbConfigs.value[key.id].rgb.red = real_color.r;
    rgbConfigs.value[key.id].rgb.green = real_color.g;
    rgbConfigs.value[key.id].rgb.blue = real_color.b;
    
    // 如果模式或速度因为混合状态为空，这里给一个彩虹渐变的默认模式/速度
    //rgbConfigs.value[key.id].mode = mode.value !== null ? mode.value : ekc.RGBMode.RgbModeFixed;
    //rgbConfigs.value[key.id].speed = speed.value !== null ? Math.round(speed.value) : 100;
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
                <n-select :options="base_modes" v-model:value="base_mode" />
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
              <n-select 
                :options="modes" 
                v-model:value="mode"
                :placeholder="mode === null ? '多个不同模式' : '请选择'"
              />
            </n-form-item>
            
            <n-form-item :label="t('rgb_panel_color')">
              <n-color-picker v-model:value="color" :show-preview="true" :show-alpha="false" />
            </n-form-item>
            
            <n-form-item :label="t('rgb_panel_speed')">
              <n-input-number 
                v-model:value="speed" 
                :placeholder="speed === null ? '多个不同值' : t('rgb_panel_speed')"
              />
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
                <n-form-item :label="t('rgb_panel_color')">
                  <n-color-picker v-model:value="rainbow_color" :show-preview="true" :show-alpha="false" style="width: 120px;" />
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