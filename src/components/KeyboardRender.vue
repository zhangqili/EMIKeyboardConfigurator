<script setup lang="ts">
import { computed, reactive, ref, defineEmits, watch } from "vue";
import Key from "./Key.vue";
import * as kle from "@ijprest/kle-serial";
import { KeyConfig } from "../apis/utils";
import LayoutSubSelector from "./LayoutSubSelector.vue";

const emit = defineEmits<{
  (e: 'select', id: number): void
}>()
const usize = ref(54);
const props = defineProps(["keys","layout_labels"]);

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

const visibleKeys = computed(() => {
  return props.keys.filter((key: KeyConfig) => {
    if (key.layoutGroup != undefined) {
      return selectedIndices.value[key.layoutGroup.groupId] == key.layoutGroup.id;
    }
    else {
      return true;
    }
  });
});

function keyButtonClick(index: number) {
  emit('select', index);
}

const selectedIndices = ref<number[]>([]);

watch(() => props.layout_labels, (newLabels) => {
  selectedIndices.value = new Array(newLabels.length).fill(0);
}, { immediate: true });

</script>

<template>
  <div style="display: grid; place-items: center;">
    <div class="keyboard no-select" :style="{ minHeight: minHeight, minWidth: minWidth, transition: 'all 0.5s ease'}">
      <TransitionGroup name="list">
        <Key v-for="(key, index) in visibleKeys" @mousedown="(event : MouseEvent) => handleMouseDown(event, key.id)" @mouseenter="(event : MouseEvent) => handleMouseEnter(event, key.id)" :key="key.id" :x="key.x" :y="key.y"
        :width="key.width" :height="key.height" :rotation-x="key.rotation_x" :rotation-y="key.rotation_y"
        :rotation-angle="key.rotation_angle" :labels="key.labels" :id="key.id" :color="key.color" :index="index"/>
      </TransitionGroup>
    </div>
    <n-card v-if="props.layout_labels[0].length != 0" style="position: absolute; top: 10px; right: 10px; max-width: 300px;">
      <n-flex vertical>
        <LayoutSubSelector v-for="(value,index) in props.layout_labels" v-model:selected-index="selectedIndices[index as number]" :labels="value"></LayoutSubSelector>
      </n-flex>
    </n-card>
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
