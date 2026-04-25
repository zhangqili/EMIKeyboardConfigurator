<script setup lang="ts">
import { computed, ref, type CSSProperties } from "vue";
import { NButton } from "naive-ui";

const props = defineProps([
  "x", "y", "width", "height", "rotationX", "rotationY", "rotationAngle",
  "labels", "color", "selected", "tooltip",
]);

const emit = defineEmits(['click','mousedown', 'mouseenter', 'mouseup', 'mouseleave']);

const usize = ref(54);
const margin = ref(2);
const isPressed = ref(false);
function handleMouseDown(event: MouseEvent) {
  isPressed.value = true;
  emit('mousedown', event);
}

function handleMouseUp(event: MouseEvent) {
  isPressed.value = false;
  emit('mouseup', event);
}

function handleMouseEnter(event: MouseEvent) {
  if (event.buttons !== 0) {
    isPressed.value = true;
  } else {
    isPressed.value = false;
  }
  emit('mouseenter', event);
}

function handleMouseLeave(event: MouseEvent) {
  isPressed.value = false;
  emit('mouseleave', event);
}
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

const shrinkOffset = computed(() => props.selected ? 6 : 0);
const translateOffset = computed(() => props.selected ? 'translate(2px, 2px)' : 'translate(0px, 0px)');
const translateOffsetBottom = computed(() => props.selected ? 'translate(2px, -2px)' : 'translate(0px, 0px)');

const sizeLabel = computed(() : CSSProperties => ({
  // 宽度和高度动态减去 shrinkOffset
  width: usize.value * props.width - 12 - shrinkOffset.value + "px",
  height: usize.value * props.height - 12 - shrinkOffset.value + "px",
  maxWidth: usize.value * props.width - 12 - shrinkOffset.value + "px",
  maxHeight: usize.value * props.height - 12 - shrinkOffset.value + "px",
  textWrap: "wrap",
  // 增加平滑的动画过渡
  fontSize: props.selected ? '0.85em' : '1em',
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  // 应用位移补偿
  transform: translateOffset.value
}));

const sizeLabel1 = computed(() : CSSProperties => ({
  width: usize.value * props.width - 12 - shrinkOffset.value + "px",
  maxWidth: usize.value * props.width - 12 - shrinkOffset.value + "px",
  textWrap: "wrap",
  height: "8px",
  fontSize: props.selected ? '0.85em' : '1em',
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  transform: translateOffsetBottom.value
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
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "z-index": "1" 
  };

  const primaryColor = "var(--n-primary-color, #18a058)";

  if (props.color) {
    const isLight = getContrastColor(props.color) === "#000000";
    
    // 1. 基础颜色
    styleObj["--n-color"] = props.color;
    styleObj["--n-text-color"] = isLight ? "#000000" : "#FFFFFF";
    styleObj["--n-border"] = `1px solid ${props.color}`;

    styleObj["--n-color-hover"] = props.color;
    styleObj["--n-color-focus"] = props.color;
    styleObj["--n-color-pressed"] = props.color;
    
    styleObj["--n-text-color-hover"] = styleObj["--n-text-color"];
    styleObj["--n-text-color-focus"] = styleObj["--n-text-color"];
    styleObj["--n-text-color-pressed"] = styleObj["--n-text-color"];

    styleObj["--n-border-hover"] = styleObj["--n-border"];
    styleObj["--n-border-focus"] = styleObj["--n-border"];
    styleObj["--n-border-pressed"] = styleObj["--n-border"];

    // 选中状态
    if (props.selected) {
      // 保持 1px 的基础边框，防止内容向内收缩
      styleObj["--n-border"] = `1px solid ${primaryColor}`;
      styleObj["--n-border-hover"] = `1px solid ${primaryColor}`;
      styleObj["--n-border-focus"] = `1px solid ${primaryColor}`;
      styleObj["--n-border-pressed"] = `1px solid ${primaryColor}`;
      
      styleObj["box-shadow"] = `0 0 0 2px ${primaryColor}`;
      styleObj["z-index"] = "2"; 
    }
  } else {
    // 默认按键逻辑（无自定义颜色）
    styleObj["--n-color"] = "transparent";
    styleObj["--n-border"] = "1px solid var(--n-border-color)";

    if (props.selected) {
      styleObj["--n-border"] = `1px solid ${primaryColor}`;
      styleObj["--n-border-hover"] = `1px solid ${primaryColor}`;
      styleObj["--n-border-focus"] = `1px solid ${primaryColor}`;
      styleObj["--n-border-pressed"] = `1px solid ${primaryColor}`;

      const activeBg = "var(--n-primary-color-hover, rgba(24, 160, 88, 0.1))";
      styleObj["--n-color"] = activeBg;
      styleObj["--n-color-hover"] = activeBg;
      styleObj["--n-color-focus"] = activeBg;
      styleObj["--n-color-pressed"] = activeBg;

      styleObj["box-shadow"] = `0 0 0 2px ${primaryColor}`;
      styleObj["z-index"] = "2";
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
          :disabled="!props.tooltip || props.tooltip.length === 0 || isPressed" 
          trigger="hover" placement="top" :animated="false" :delay="0" :duration="0"
        >
          <template #trigger>
            <n-button :style="button_style" :focusable="false" class="keycap"
                @click="$emit('click')"
                @mousedown="handleMouseDown" 
                @mouseenter="handleMouseEnter"
                @mouseup="handleMouseUp"
                @mouseleave="handleMouseLeave">
                <div class="keylabels">
                <div v-for="(label, index) in props.labels" :key="index" :class="'keylabel keylabel' + index + ' textsize2'">
                  <div v-if="index as number < 9 && label" :style="sizeLabel">
                    {{ label }}
                  </div>
                  <div v-if="index as number >= 9 && label" :style="sizeLabel1">
                    {{ label }}
                  </div>
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

:deep(.n-button__content) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  position: relative !important;
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
