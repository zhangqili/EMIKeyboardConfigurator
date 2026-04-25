<script setup lang="ts">
import { computed, ref, type CSSProperties } from "vue";
import { NButton } from "naive-ui";

const props = defineProps([
  "x", "y", "width", "height", "rotationX", "rotationY", "rotationAngle",
  "labels", "color", "selected", "tooltip",
]);

const emit = defineEmits(['click','mousedown', 'mouseenter']);

const usize = ref(54);
const margin = ref(2);

const rotation = computed(() : CSSProperties => {
  if (props.rotationAngle !== 0) {
    return {
      transform: `rotate(${props.rotationAngle}deg)`,
      transformOrigin: `${usize.value * props.rotationX}px ${usize.value * props.rotationY}px`,
    };
  }
  return {};
});

const keycap_size = computed(() : CSSProperties => ({
  width: usize.value * props.width + "px",
  height: usize.value * props.height + "px",
  position: "absolute",
  left: usize.value * props.x + "px",
  top: usize.value * props.y + "px",
  transition: 'all 0.5s ease'
}));

const sizeLabel = computed(() : CSSProperties => ({
  width: usize.value * props.width - 12 + "px",
  height: usize.value * props.height - 12 + "px",
  maxWidth: usize.value * props.width - 12 + "px",
  maxHeight: usize.value * props.height - 12 + "px",
  textWrap: "wrap",
}));

const sizeLabel1 = computed(() : CSSProperties => ({
  width: usize.value * props.width - 12 + "px",
  maxWidth: usize.value * props.width - 12 + "px",
  textWrap: "wrap",
  height: "8px",
}));

const key_border = computed(() => {
  return {
    padding: margin.value + "px",
  };
});

function getContrastColor(bgColor : string) {
    if (bgColor == undefined) {
      return;
    }
    const r = parseInt(bgColor.substr(1, 2), 16);
    const g = parseInt(bgColor.substr(3, 2), 16);
    const b = parseInt(bgColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#FFFFFF";
}
const button_style = computed(() : any => {
  const styleObj: any = {
    height: "100%",
    width: "100%",
    "--n-padding": "0",
    outline: "none",
    transition: "all 0.2s ease-in-out" 
  };

  if (props.color) {
    const contrastText = getContrastColor(props.color) || "#FFFFFF";

    // 1. 基础状态
    styleObj["--n-border"] = `1px solid ${props.color}`;
    styleObj["--n-color"] = `transparent`;
    styleObj["--n-text-color"] = contrastText;

    // 2. 悬浮/聚焦/按下 状态 (统一变量，防止 Naive UI 默认绿色泄漏)
    const hoverBorder = `1px solid ${props.color}`;
    const hoverColor = `${props.color}33`;

    styleObj["--n-border-hover"] = hoverBorder;
    styleObj["--n-border-focus"] = hoverBorder;
    styleObj["--n-border-pressed"] = hoverBorder;

    styleObj["--n-color-hover"] = hoverColor;
    styleObj["--n-color-focus"] = hoverColor;
    styleObj["--n-color-pressed"] = hoverColor;

    styleObj["--n-text-color-hover"] = contrastText;
    styleObj["--n-text-color-focus"] = contrastText;
    styleObj["--n-text-color-pressed"] = contrastText;

    if (props.selected) {
      // 3. 选中时的基础状态
      styleObj["--n-border"] = `2px solid ${props.color}`;
      styleObj["--n-color"] = `${props.color}66`;
      styleObj["--n-text-color"] = contrastText;
      
      // 4. 选中时的 悬浮/聚焦/按下 状态
      const selectedHoverBorder = `2px solid ${props.color}`;
      const selectedHoverColor = `${props.color}99`;

      styleObj["--n-border-hover"] = selectedHoverBorder;
      styleObj["--n-border-focus"] = selectedHoverBorder;
      styleObj["--n-border-pressed"] = selectedHoverBorder;

      styleObj["--n-color-hover"] = selectedHoverColor;
      styleObj["--n-color-focus"] = selectedHoverColor;
      styleObj["--n-color-pressed"] = selectedHoverColor;
    }
  } else {
    // 没有颜色时的默认按键逻辑
    if (props.selected) {
      const selectedBorder = `2px solid var(--n-primary-color, #18a058)`;
      const selectedColor = `var(--n-primary-color-hover, rgba(24, 160, 88, 0.2))`;
      const selectedHoverBorder = `2px solid var(--n-primary-color-hover, #36ad6a)`;
      const selectedHoverColor = `var(--n-primary-color-pressed, rgba(24, 160, 88, 0.4))`;

      styleObj["--n-border"] = selectedBorder;
      styleObj["--n-color"] = selectedColor;
      styleObj["--n-text-color"] = `var(--n-text-color)`;

      styleObj["--n-border-hover"] = selectedHoverBorder;
      styleObj["--n-border-focus"] = selectedHoverBorder;
      styleObj["--n-border-pressed"] = selectedHoverBorder;

      styleObj["--n-color-hover"] = selectedHoverColor;
      styleObj["--n-color-focus"] = selectedHoverColor;
      styleObj["--n-color-pressed"] = selectedHoverColor;
    } else {
      const hoverBorder = `1px solid var(--n-primary-color, #18a058)`;
      const hoverColor = `var(--n-primary-color-hover, rgba(24, 160, 88, 0.1))`;

      styleObj["--n-border-hover"] = hoverBorder;
      styleObj["--n-border-focus"] = hoverBorder;
      styleObj["--n-border-pressed"] = hoverBorder;

      styleObj["--n-color-hover"] = hoverColor;
      styleObj["--n-color-focus"] = hoverColor;
      styleObj["--n-color-pressed"] = hoverColor;

      styleObj["--n-text-color"] = `var(--n-text-color)`;
      styleObj["--n-text-color-hover"] = `var(--n-text-color)`;
      styleObj["--n-text-color-focus"] = `var(--n-text-color)`;
      styleObj["--n-text-color-pressed"] = `var(--n-text-color)`;
    }
  }

  return styleObj;
});
</script>

<template>
  <div class="key" :style="rotation">
    <div :style="keycap_size">
      <div style="position: absolute; inset: 2px;">
        
        <n-popover 
          :disabled="!props.tooltip || props.tooltip.length === 0" 
          trigger="hover" placement="top" :animated="false" :delay="0" :duration="0"
        >
          <template #trigger>
            <n-button :style="button_style" :focusable="false" class="keycap"
                @click="$emit('click')"
                @mousedown="$emit('mousedown', $event)" 
                @mouseenter="$emit('mouseenter', $event)">
              <div class="keylabels">
                <div v-for="(label, index) in props.labels" :key="index" :class="'keylabel keylabel' + index + ' textsize2'">
                  <div v-if="index as number <9 && label" :style="sizeLabel">{{ label }}</div>
                  <div v-if="index as number >=9 && label" :style="sizeLabel1">{{ label }}</div>
                </div>
              </div>
            </n-button>
          </template>
          
          <div style="text-align: center; font-size: 12px;">
            <div v-for="(line, idx) in props.tooltip" :key="idx">{{ line }}</div>
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

.keylabel.textsize2 {
  font-size: 9px;
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

.keylabels {
/*
  font-family: "Helvetica", "Arial", sans-serif;
*/
  z-index: 1;
}

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
