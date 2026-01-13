<script setup lang="ts">
import { computed, reactive, ref, defineEmits } from "vue";
import Key from "./Key.vue";
import * as kle from "@ijprest/kle-serial";
import { KeyConfig } from "../apis/utils";

const emit = defineEmits<{
  (e: 'select', id: number, key : KeyConfig): void
}>()
const usize = ref(54);
const props = defineProps(["keys"]);

// 计算 min-height 的值，基于 keys 中 key.y 的最大值
const minHeight = computed(() => {
  const maxY = props.keys.length > 0 ? Math.max(...props.keys.map((key : kle.Key) => key.y + key.height)) : 0;
  return `${(maxY) * usize.value}px`; // 添加偏移量以确保足够空间
});
const minWidth = computed(() => {
  const maxX = props.keys.length > 0 ? Math.max(...props.keys.map((key : kle.Key) => key.x + key.width)) : 0;
  return `${(maxX) * usize.value}px`; // 添加偏移量以确保足够空间
});


function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    keyButtonClick(index);
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    keyButtonClick(index);
  } else {

  }
}

function keyButtonClick(index: number) {
  emit('select', index, props.keys[index]);
}

</script>

<template>
  <div style="display: grid; place-items: center;">
    <div class="keyboard no-select" :style="{ minHeight: minHeight, minWidth: minWidth, transition: 'all 0.5s ease'}">
      <TransitionGroup name="list">
        <Key v-for="(key, index) in props.keys" @mousedown="(event : MouseEvent) => handleMouseDown(event, index)" @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index)" :key="index" :x="key.x" :y="key.y"
        :width="key.width" :height="key.height" :rotation-x="key.rotation_x" :rotation-y="key.rotation_y"
        :rotation-angle="key.rotation_angle" :labels="key.labels" :color="key.color" :index="index"/>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.keyboard {
  background-color: transparent;
  padding: 10px;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
}

.list-leave-active {
  position: absolute;
}

</style>
