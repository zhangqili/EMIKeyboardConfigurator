<script setup lang="ts">
import { computed, reactive, ref, type CSSProperties  } from "vue";
import * as kle from "@ijprest/kle-serial";
import { Translation } from "vue-i18n";
import {useMainStore} from "../store/main"
import * as ekc from "emi-keyboard-controller";
import { storeToRefs } from "pinia";
import { NPopover, NButton} from 'naive-ui'
import { DynamicKeyToKeyName, keyCodeToString, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex } from "../apis/utils";

const store = useMainStore();
const { 
  lang,
  selectedDevice,
  advancedKey, 
  rgbConfig, 
  dynamicKey,
  dynamicKeyIndex,
  advancedKeys, 
  rgbBaseConfig,
  rgbConfigs, 
  keymap, 
  keyBinding, 
  currentLayerIndex, 
  tabSelection,
  profiles,
  selectedProfileIndex,
  debugRawChartOption, 
  debugValueChartOption,
  dynamicKeys,
  keyboardKeys,
  themeName
} = storeToRefs(store);

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
        labels[6] = `${Math.round(rgbConfigs.value[props.id].speed * 1000)}\t`;
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

const usize = ref(54);
const margin = ref(2);

const position = computed(() : CSSProperties => {
  return {
    position: "absolute",
    left: usize.value * props.x + "px",
    top: usize.value * props.y + "px",
  };
});

const size = computed(() : CSSProperties => {
  return {
    width: usize.value * props.width + "px",
    height: usize.value * props.height + "px",
  };
});

const keycap_size = computed(() : CSSProperties => {
  return {
    width: usize.value * props.width + "px",
    height: usize.value * props.height + "px",
    position: "absolute",
    left: usize.value * props.x + "px",
    top: usize.value * props.y + "px",
    transition: 'all 0.5s ease'
  };
});

const sizeKeytop = computed(() : CSSProperties => {
  return {
    width: usize.value * props.width - 12 + "px",
    height: usize.value * props.height - 12 + "px",
  };
});

const sizeLabel = computed(() : CSSProperties => {
  return {
    width: usize.value * props.width - 12 + "px",
    height: usize.value * props.height - 12 + "px",
    maxWidth: usize.value * props.width - 12 + "px",
    maxHeight: usize.value * props.height - 12 + "px",
    textWrap: "wrap",
  };
});

const sizeLabel1 = computed(() : CSSProperties => {
  return {
    width: usize.value * props.width - 12 + "px",
    maxWidth: usize.value * props.width - 12 + "px",
    textWrap: "wrap",
    height: "8px",
  };
});
const rotation = computed(() : CSSProperties => {
  if (props.rotationAngle !== 0) {
    return {
      transform: `rotate(${props.rotationAngle}deg)`,
      transformOrigin: `${usize.value * props.rotationX}px ${usize.value * props.rotationY
        }px`,
    };
  }
  return {};
});

const key_border = computed(() => {
  return {
    padding: margin.value + "px",
  };
});

function getContrastColor(bgColor : string | undefined) {
    if (bgColor == undefined) {
      return;
    }
    const r = parseInt(bgColor.substr(1, 2), 16);
    const g = parseInt(bgColor.substr(3, 2), 16);
    const b = parseInt(bgColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#FFFFFF";
}

const button_style = computed(() : CSSProperties => {
  return {
    height: "100%",
    width: "100%",
    background: color.value,
    color: getContrastColor(color.value),
    outline: props.selected ? "solid red 2px" : "none",
  };
});

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
  if (store.tabSelection === 'RGBPanel' && rgbConfigs.value[props.id]) {
     content.push(`Color: ${rgbToHex(rgbConfigs.value[props.id].rgb)}`);
  }
  if ((store.tabSelection === 'KeymapPanel' || store.tabSelection === 'DynamicKeyPanel' )&& keymap.value[currentLayerIndex.value][props.id]) {
     content.push(`Keycode:  ${toUint16Hex(keymap.value[currentLayerIndex.value][props.id])}`);
  }
  return content;
});
</script>

<template>
  <div class="key" :style="rotation">
    <div :style="keycap_size">
      <div style="position: absolute; inset: 2px;">
        <n-popover trigger="hover" placement="top" :animated="false" :delay="0" :duration="0">
          <template #trigger>
            <n-button :style="button_style" :focusable="false" class="keycap" >
              <div class="keylabels">
                <div v-for="(label, index) in labels" :key="index" :class="'keylabel keylabel' + index + ' textsize2'">
                  <div v-if="index<9" :style="sizeLabel">{{ label }}</div>
                  <div v-if="index>=9" :style="sizeLabel1">{{ label }}</div>
                </div>
              </div>
            </n-button>
          </template>
          
          <div style="text-align: center; font-size: 12px;">
             <div v-for="(line, idx) in tooltipContent" :key="idx">
               {{ line }}
             </div>
          </div>
        </n-popover>
      </div>
    </div>
  </div>
</template>

<style scoped>
.key {
  position: relative;
}

#keycap>* {
  position: absolute;
  box-sizing: border-box;
  background-clip: padding-box;
}

.keyborder {
  left: 0px;
  top: 0px;
  border-width: 1px;
  border-radius: 3px;
  border-style: solid;
  border-color: #000;
}

.keytop {
  left: 6px;
  top: 3px;
  border-width: 1px;
  border-radius: 3px;
  border-style: solid;
  border-color: rgba(0, 0, 0, 0.1);
  background-color: #444444;
}

/* Key labels */
.keylabel>div {
  display: table-cell;
  position: static !important;
  /*color: rgba(0, 0, 0, 1)*/
}

/* Vertical alignment */
.keylabel0>div,
.keylabel1>div,
.keylabel2>div {
  vertical-align: top;
}

.keylabel3>div,
.keylabel4>div,
.keylabel5>div {
  vertical-align: middle;
}

.keylabel6>div,
.keylabel7>div,
.keylabel8>div {
  vertical-align: bottom;
}

.keylabel9,
.keylabel10,
.keylabel11 {
  margin-top: 40px;
  font-size: 9px !important;
}

/* Horizontal  alignment */
.keylabel0>div,
.keylabel3>div,
.keylabel6>div,
.keylabel9>div {
  text-align: left;
}

.keylabel1>div,
.keylabel4>div,
.keylabel7>div,
.keylabel10>div {
  text-align: center;
}

.keylabel2>div,
.keylabel5>div,
.keylabel8>div,
.keylabel11>div {
  text-align: right;
}

/* Label Sizes */

.keylabel.textsize1 {
  font-size: 8px;
  line-height: 1em;
}

.keylabel.textsize1 {
  font-size: 8px;
  line-height: 1em;
}

.keylabel.textsize2 {
  font-size: 10px;
  line-height: 1em;
}

.keylabel.textsize3 {
  font-size: 12px;
  line-height: 1em;
}

.keylabel.textsize4 {
  font-size: 14px;
  line-height: 1em;
}

.keylabel.textsize5 {
  font-size: 16px;
  line-height: 1em;
}

.keylabel.textsize6 {
  font-size: 18px;
  line-height: 1em;
}

.keylabel.textsize7 {
  font-size: 20px;
  line-height: 1em;
}

.keylabel.textsize8 {
  font-size: 22px;
  line-height: 1em;
}

.keylabel.textsize9 {
  font-size: 24px;
  line-height: 1em;
}

/*
.keylabels {
  font-family: "Helvetica", "Arial", sans-serif;
}
*/

.keylabel hr {
  display: inline;
  /*position: absolute;*/
}

.keylabel hr:before {
  position: relative;
  display: block;
  white-space: nowrap;
  content: "\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500";
}

/* Key labels */
.keylabel {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 100%-2px; /* Ensure labels take the full width */
  height: 100%-2px; /* Ensure labels take the full height */
  /*
  text-shadow: 
    0 0 5px #000000, 
    0 0 10px #000000,
    0 0 15px #000000;;
    */
}
</style>
