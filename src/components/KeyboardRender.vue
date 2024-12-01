<script setup lang="ts">
import { computed, reactive, ref, defineEmits } from "vue";
import Key from "./Key.vue";
import { event } from "@tauri-apps/api";
import * as kle from "@ijprest/kle-serial";

const emit = defineEmits<{
  (e: 'select', id: number): void
}>()
const usize = ref(54);
const props = defineProps(["keys"]);

// 计算 min-height 的值，基于 keys 中 key.y 的最大值
const minHeight = computed(() => {
  const maxY = props.keys.length > 0 ? Math.max(...props.keys.map((key : kle.Key) => key.y)) : 0;
  return `${(maxY + 1) * 54}px`; // 添加偏移量以确保足够空间
});

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    keyButtonClick(index);
  } else {

  }
}

function keyButtonClick(index: number) {
  emit('select', index);
}

</script>

<template>
  <div class="keyboard no-select" :style="{ minHeight: minHeight }">
    <Key v-for="(key, index) in props.keys" @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index)" @click="keyButtonClick(index)" :key="index" :x="key.x" :y="key.y"
      :width="key.width" :height="key.height" :rotation-x="key.rotation_x" :rotation-y="key.rotation_y"
      :rotation-angle="key.rotation_angle" :labels="key.labels" />
  </div>
</template>

<style scoped>
.keyboard {
  background-color: transparent;
  padding: 10px;
}

.no-select {
  user-select: none; /* 禁止文本选择 */
  -webkit-user-select: none; /* 兼容 Safari */
  -ms-user-select: none; /* 兼容旧版 IE */
}
</style>
