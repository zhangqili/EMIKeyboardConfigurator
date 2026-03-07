<template>
  <div class="smooth-wrapper" :style="{ width: wrapperWidth }">
    <div class="smooth-content" ref="contentRef">
      <Transition name="cross-fade">
        <span :key="text" class="text-node">{{ text }}</span>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{ 
  text: string 
}>();

const contentRef = ref<HTMLElement | null>(null);
const wrapperWidth = ref<string>('auto'); // 初始状态设为 auto 避免闪烁
let observer: ResizeObserver | null = null;

onMounted(() => {
  if (contentRef.value) {
    // 监听内部真实内容宽度的变化
    observer = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        if (entries[0].contentRect.width > 0) {
          wrapperWidth.value = `${entries[0].contentRect.width}px`;
        }
      });
    });
    observer.observe(contentRef.value);
  }
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
/* 最外层包装器：负责平滑过渡宽度 */
.smooth-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  vertical-align: middle;
}

/* 内部内容区：永远保持文字真实的物理宽度 */
.smooth-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: max-content;
}

.text-node {
  display: inline-block;
  white-space: nowrap;
}

.cross-fade-enter-active,
.cross-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 离开的旧文本：瞬间变为绝对定位，脱离文档流。
   这样新文本就能瞬间接管盒子的真实宽度，通知 ResizeObserver */
.cross-fade-leave-active {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.cross-fade-enter-from,
.cross-fade-leave-to {
  opacity: 0;
}
</style>