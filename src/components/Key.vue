<script setup lang="ts">
import { computed, reactive, ref, type CSSProperties  } from "vue";
import * as kle from "@ijprest/kle-serial";
import { Translation } from "vue-i18n";
import {useMainStore} from "../store/main"
import * as ekc from "emi-keyboard-controller";
import { storeToRefs } from "pinia";
import { DynamicKeyToKeyName, keyCodeToString, keyModeDisplayMap, rgbModeDisplayMap, rgbToHex } from "../apis/utils";

const store = useMainStore();
const { 
  lang,
  selected_device,
  advanced_key, 
  rgb_config, 
  dynamic_key,
  dynamic_key_index,
  advanced_keys, 
  rgb_base_config,
  rgb_configs, 
  keymap, 
  key_binding, 
  current_layer, 
  tab_selection,
  config_files,
  selected_config_file_index,
  debug_raw_chart_option, 
  debug_value_chart_option,
  dynamic_keys,
  keyboard_keys,
  theme_name
} = storeToRefs(store);

const labels = computed(() => {
  let labels = [...props.labels];
  //console.debug(tab_selection.value);
  switch (tab_selection.value) {
    case "PerformancePanel": {
      const advanced_key = advanced_keys.value[props.id];
      if (advanced_key != undefined) {
        labels = labels.map(() => "");
        labels[0] = keyModeDisplayMap[advanced_key.mode];
        switch (advanced_key.mode) {
          case ekc.KeyMode.KeyAnalogNormalMode: {
            labels[3] = `↓${Math.round(advanced_key.activation_value * 1000) / 10}\t↑${Math.round(advanced_key.deactivation_value * 1000) / 10}`;
            break;
          }
          case ekc.KeyMode.KeyAnalogRapidMode: {
            labels[3] = `↓${Math.round(advanced_key.trigger_distance * 1000) / 10}\t↑${Math.round(advanced_key.release_distance * 1000) / 10}`;
            labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
            break;
          }
          case ekc.KeyMode.KeyAnalogSpeedMode: {
            labels[3] = `↓${Math.round(advanced_key.trigger_speed * 1000) / 10}\t↑${Math.round(advanced_key.release_speed * 1000) / 10}`;
            labels[6] = `↧${Math.round(advanced_key.upper_deadzone * 1000) / 10}\t↥${Math.round(advanced_key.lower_deadzone * 1000) / 10}`;
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
    case "DynamicKeyPanel": {
      labels = labels.map(() => "");
      if (keymap.value != undefined) {
        if((keymap.value[current_layer.value][props.id] & 0xFF) == ekc.Keycode.DynamicKey)
        {
          const strings = keyCodeToString(keymap.value[current_layer.value][props.id]);
          const dk_id = ((keymap.value[current_layer.value][props.id] >> 8) & 0xFF)
          //labels[0] = strings.subString;
          labels[6] = DynamicKeyToKeyName[dynamic_keys.value[dk_id].type as ekc.DynamicKeyType];
          labels[9] = strings.mainString;
        }
        else
        {
          var strings = keyCodeToString(keymap.value[current_layer.value][props.id]);
          labels[0] = strings.subString;
          labels[6] = strings.mainString;
        }
      }
      break;
    }
    case "RGBPanel": {
      labels = labels.map(() => "");
      if(rgb_configs.value[props.id])
      {
        labels[0] = rgbModeDisplayMap[rgb_configs.value[props.id].mode];
        labels[6] = `${Math.round(rgb_configs.value[props.id].speed * 1000)}\t`;
        labels[9] = rgbToHex(rgb_configs.value[props.id].rgb);
      }
      break;
    }
    case "DebugPanel": {
      labels = labels.map(() => "");
      labels[0] = advanced_keys.value[props.id].raw.toFixed(2);
      labels[3] = advanced_keys.value[props.id].value.toFixed(3);
      labels[6] = advanced_keys.value[props.id].state.toString();
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
  if(rgb_configs.value[props.index])
    return rgbToHex(rgb_configs.value[props.index].rgb);
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
</script>

<template>
  <div class="key" :style="rotation">
    <div :style="keycap_size">
      <div style="position: absolute; inset: 2px;">
        <n-button :style="button_style" :focusable="false" class="keycap" >
          <div class="keylabels">
            <div v-for="(label, index) in labels" :key="index" :class="'keylabel keylabel' + index + ' textsize2'">
              <div v-if="index<9" :style="sizeLabel">{{ label }}</div>
              <div v-if="index>=9" :style="sizeLabel1">{{ label }}</div>
            </div>
          </div>
        </n-button>
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
