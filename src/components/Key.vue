<script setup>
import { computed, reactive, ref } from "vue";
import * as kle from "@ijprest/kle-serial";

const props = defineProps([
  "x",
  "y",
  "width",
  "height",
  "rotationX",
  "rotationY",
  "rotationAngle",
  "labels"
]);

const usize = ref(54);

const position = computed(() => {
  return {
    position: "absolute",
    left: usize.value * props.x + "px",
    top: usize.value * props.y + "px",
  };
});

const size = computed(() => {
  return {
    width: usize.value * props.width + "px",
    height: usize.value * props.height + "px",
  };
});

const sizeKeytop = computed(() => {
  return {
    width: usize.value * props.width - 12 + "px",
    height: usize.value * props.height - 12 + "px",
  };
});

const sizeLabel = computed(() => {
  return {
    width: usize.value * props.width - 12 + "px",
    height: usize.value * props.height - 12 + "px",
    color: "white",
  };
});

const rotation = computed(() => {
  if (props.rotationAngle !== 0) {
    return {
      transform: `rotate(${props.rotationAngle}deg)`,
      transformOrigin: `${usize.value * props.rotationX}px ${usize.value * props.rotationY
        }px`,
    };
  }
  return {};
});
</script>

<template>
  <div class="key" :style="rotation">
    <div id="keycap" :style="position">
      <div class="keyborder" :style="size" />
      <div class="keytop" :style="sizeKeytop">
      </div>
      <!-- Render Labels -->
      <!-- Labels rendering -->
      <div class="keylabels" style="left: 8px; top: 4px; width: 40px; height: 40px; padding: 3px;">
        <div v-for="(label, index) in props.labels" :key="index" :class="'keylabel keylabel' + index + ' textsize3'">
          <div :style="sizeLabel">{{ label }}</div>
        </div>
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
  background-color: #333333;
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
  color: rgba(0, 0, 0, 1)
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
  top: 100%;
  margin-top: -1px;
  font-size: 10px !important;
  max-height: 1em !important;
  white-space: nowrap;
  overflow: hidden;
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

.keylabels {
  font-family: "Helvetica", "Arial", sans-serif;
}

.keylabel hr {
  display: inline;
  /*position: absolute;*/
}

.keylabel hr:before {
  position: relative;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  content: "\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500\2500";
}

/* Key labels */
.keylabel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%; /* Ensure labels take the full width */
  height: 100%; /* Ensure labels take the full height */
}
</style>
