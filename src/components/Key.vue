<script setup lang="ts">
import { computed, inject, type Ref, reactive, ref, type CSSProperties  } from "vue";
import * as kle from "@ijprest/kle-serial";
import { Translation } from "vue-i18n";
import {useMainStore} from "@/store/main"
import * as ekc from "emi-keyboard-controller";
import { storeToRefs } from "pinia";
import { NPopover, NButton} from 'naive-ui'
import { DynamicKeyToKeyName, keyCodeToString, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex } from "@/apis/utils";
import PlainKey from "./PlainKey.vue";

const store = useMainStore();

interface KeyboardContext {
  advancedKeys: Ref<ekc.IAdvancedKey[]>;
  rgbConfigs: Ref<ekc.IRGBConfig[]>;
  keymap: Ref<number[][]>;
  dynamicKeys: Ref<ekc.IDynamicKey[]>;
  currentLayerIndex: Ref<number>;
  tabSelection: Ref<string | null>;
}

const { 
  advancedKeys,
  rgbConfigs, 
  keymap, 
  currentLayerIndex, 
  tabSelection,
  dynamicKeys
} = inject<KeyboardContext>('keyboardContext')!;

const emit = defineEmits(['click', 'mousedown', 'mouseenter']);

const labels = computed(() => {
  let labels = [...props.labels];
  //console.debug(tabSelection.value);
  switch (tabSelection.value) {
    case "PerformancePanel": {
      const advancedKey = advancedKeys.value[props.id];
      if (advancedKey != undefined) {
        labels = labels.map(() => "");
        labels[0] = keyModeDisplayMap[advancedKey.mode];
        switch (advancedKey.mode) {
          case ekc.KeyMode.KeyAnalogNormalMode: {
            labels[3] = `↓${Math.round(advancedKey.activation_value * 1000) / 10}\t↑${Math.round(advancedKey.deactivation_value * 1000) / 10}`;
            break;
          }
          case ekc.KeyMode.KeyAnalogRapidMode: {
            labels[3] = `↓${Math.round(advancedKey.trigger_distance * 1000) / 10}\t↑${Math.round(advancedKey.release_distance * 1000) / 10}`;
            labels[6] = `↧${Math.round(advancedKey.upper_deadzone * 1000) / 10}\t↥${Math.round(advancedKey.lower_deadzone * 1000) / 10}`;
            break;
          }
          case ekc.KeyMode.KeyAnalogSpeedMode: {
            labels[3] = `↓${Math.round(advancedKey.trigger_speed * 1000) / 10}\t↑${Math.round(advancedKey.release_speed * 1000) / 10}`;
            labels[6] = `↧${Math.round(advancedKey.upper_deadzone * 1000) / 10}\t↥${Math.round(advancedKey.lower_deadzone * 1000) / 10}`;
            break;
          }
          default: {
            break;
          }
        }
      }
      break;
    }
    case "KeymapPanel":
    case "MacroPanel":
    case "DynamicKeyPanel": {
      labels = labels.map(() => "");
      if (keymap.value != undefined) {
        if((keymap.value[currentLayerIndex.value][props.id] & 0xFF) == ekc.Keycode.DynamicKey)
        {
          const strings = keyCodeToString(keymap.value[currentLayerIndex.value][props.id]);
          const dk_id = ((keymap.value[currentLayerIndex.value][props.id] >> 8) & 0xFF)
          //labels[0] = strings.subString;
          labels[6] = DynamicKeyToKeyName[dynamicKeys.value[dk_id].type as ekc.DynamicKeyType];
          labels[9] = strings.mainString;
        }
        else
        {
          var strings = keyCodeToString(keymap.value[currentLayerIndex.value][props.id]);
          labels[0] = strings.subString;
          labels[6] = strings.mainString;
        }
      }
      break;
    }
    case "RGBPanel": {
      labels = labels.map(() => "");
      if(rgbConfigs.value[props.id])
      {
        labels[0] = rgbModeDisplayMap[rgbConfigs.value[props.id].mode];
        labels[6] = `${Math.round(rgbConfigs.value[props.id].speed)}\t`;
        labels[9] = rgbToHex(rgbConfigs.value[props.id].rgb);
      }
      break;
    }
    case "DebugPanel": {
      labels = labels.map(() => "");
      labels[0] = advancedKeys.value[props.id].raw.toFixed(2);
      labels[3] = advancedKeys.value[props.id].value.toFixed(3);
      labels[6] = advancedKeys.value[props.id].state.toString();
      break;
    }
    default: {
      labels = labels.map(() => "");
      labels[0] = props.id.toString();
      break;
    }
  }
  return labels;
});

const color = computed(() => {
  if(rgbConfigs.value[props.id])
    return rgbToHex(rgbConfigs.value[props.id].rgb);
})

const props = defineProps([
  "x",
  "y",
  "width",
  "height",
  "rotationX",
  "rotationY",
  "rotationAngle",
  "labels",
  "color",
  "selected",
  "index",
  "id",
]);

function toUint16Hex(num: number): string {
  // 确保数字在 uint16 范围内 (0 - 65535)
  const safeNum = num & 0xFFFF; 
  return "0x" + safeNum.toString(16).toUpperCase().padStart(4, '0');
}

const tooltipContent = computed(() => {
  const content = [];
  content.push(`ID: ${props.id}`); // 显示按键 ID
  //content.push(`Index: ${props.index}`); // 显示索引
  
  // 添加当前模式下计算出的非空标签信息
  labels.value.forEach(label => {
    if (label && label.trim() !== "") {
      // 移除可能存在的制表符，换成空格以便阅读
      content.push(label.replace(/\t/g, " ")); 
    }
  });
  
  // 如果是 RGB 模式，可以额外显示颜色代码
  if (tabSelection.value === 'RGBPanel' && rgbConfigs.value[props.id]) {
     content.push(`Color: ${rgbToHex(rgbConfigs.value[props.id].rgb)}`);
  }
  if ((tabSelection.value === 'KeymapPanel' || tabSelection.value === 'DynamicKeyPanel' )&& keymap.value[currentLayerIndex.value][props.id]) {
     content.push(`Keycode:  ${toUint16Hex(keymap.value[currentLayerIndex.value][props.id])}`);
  }
  return content;
});
</script>

<template>
  <PlainKey
    :x="x" :y="y" 
    :width="width" :height="height" 
    :rotationX="rotationX" :rotationY="rotationY" :rotationAngle="rotationAngle"
    :labels="labels" 
    :color="color"
    :selected="selected"
    :tooltip="tooltipContent" 
    @click="$emit('click', $event)"
    @mousedown.stop="$emit('mousedown', $event)"
    @mouseenter="$emit('mouseenter', $event)"
  />
</template>

<style scoped>
</style>
