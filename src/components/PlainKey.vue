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
const translateOffset = computed(() => props.selected ? 'translate(0px, 0px)' : 'translate(0px, 0px)');
const translateOffsetBottom = computed(() => props.selected ? 'translate(0px, 0px)' : 'translate(0px, 0px)');

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

function adjustColor(color: string, amount: number) {
  if (!color) return "#000000";
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const button_style = computed(() : any => {
  const styleObj: any = {
    height: "100%",
    width: "100%",
    "--n-padding": "0",
    "--n-border-radius": "0",
    outline: "none",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "z-index": "1",
    "border": "2px solid transparent",
    "background-clip": "padding-box",
    "box-sizing": "border-box" 
  };

  if (props.color) {
    const isLight = getContrastColor(props.color) === "#000000";
    const textColor = isLight ? "#000000" : "#FFFFFF";
    
    // 浅色背景：悬浮变暗(-20)，按压更暗(-40)
    // 深色背景：悬浮变亮(+30)，按压更亮(+50)
    const hoverAmount = isLight ? -20 : 30; 
    const pressedAmount = isLight ? -40 : 50;
    
    const hoverColor = adjustColor(props.color, hoverAmount);
    const pressedColor = adjustColor(props.color, pressedAmount);
    
    styleObj["--n-color"] = props.color;
    styleObj["--n-text-color"] = textColor;
    styleObj["--n-border"] = `1px solid ${props.color}`; 

    styleObj["--n-color-hover"] = hoverColor;
    styleObj["--n-color-focus"] = hoverColor;
    styleObj["--n-color-pressed"] = pressedColor;
    
    styleObj["--n-text-color-hover"] = textColor;
    styleObj["--n-text-color-focus"] = textColor;
    styleObj["--n-text-color-pressed"] = textColor;

    styleObj["--n-border-hover"] = styleObj["--n-border"];
    styleObj["--n-border-focus"] = styleObj["--n-border"];
    styleObj["--n-border-pressed"] = styleObj["--n-border"];

    if (props.selected) {
      styleObj["border"] = `2px solid ${textColor}`;
      styleObj["--n-border"] = "none";
      styleObj["--n-border-hover"] = "none";
      styleObj["--n-border-focus"] = "none";
      styleObj["--n-border-pressed"] = "none";
      styleObj["z-index"] = "2"; 
    }
  } else {
    // 默认按键逻辑
    styleObj["--n-color"] = "transparent";
    styleObj["--n-border"] = "1px solid var(--n-border-color)";

    if (props.selected) {
      styleObj["border"] = `2px solid var(--n-text-color)`;
      styleObj["--n-border"] = "none";
      styleObj["--n-border-hover"] = "none";
      styleObj["--n-border-focus"] = "none";
      styleObj["--n-border-pressed"] = "none";

      const activeBg = "var(--n-border-color)";
      styleObj["--n-color"] = activeBg;
      styleObj["--n-color-hover"] = activeBg;
      styleObj["--n-color-focus"] = activeBg;
      styleObj["--n-color-pressed"] = activeBg;

      styleObj["z-index"] = "2";
    }
  }

  return styleObj;
});
</script>

<template>
  <div class="key" :style="rotation">
    <div :style="keycap_size">
        
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
