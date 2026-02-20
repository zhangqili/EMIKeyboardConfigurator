<template>
  <div class="hex-viewer-container" :class="theme" ref="containerRef">
    <n-scrollbar v-if="lines.length > 0" x-scrollable class="scroll-area">
      <div class="hex-viewer">
        <div class="header">
          <span class="offset-header">Offset</span>
          <span class="hex-header">
            <span v-for="n in bpl" :key="n" class="hex-byte-header">
              {{ (n - 1).toString(16).padStart(2, '0').toUpperCase() }}
            </span>
          </span>
          <span class="ascii-header">Decoded Text</span>
        </div>

        <div class="body">
          <div v-for="(line, index) in lines" :key="index" class="line">
            <span class="offset">{{ line.offset }}</span>

            <span class="hex-data">
              <span 
                v-for="(b, hIndex) in line.bytes" 
                :key="'hex-' + hIndex" 
                class="hex-byte"
                :class="{ 'empty': b.isEmpty, 'hovered': hoveredIndex === b.index }"
                @mouseenter="!b.isEmpty && (hoveredIndex = b.index)"
                @mouseleave="hoveredIndex = null"
              >
                {{ b.hex }}
              </span>
            </span>

            <span class="ascii-data">
              <span 
                v-for="(b, aIndex) in line.bytes" 
                :key="'ascii-' + aIndex"
                class="ascii-char"
                :class="{ 'empty': b.isEmpty, 'hovered': hoveredIndex === b.index }"
                @mouseenter="!b.isEmpty && (hoveredIndex = b.index)"
                @mouseleave="hoveredIndex = null"
              >{{ b.char }}</span>
            </span>
          </div>
        </div>
      </div>
    </n-scrollbar>

    <div v-else class="empty-state">
      <n-empty description="暂无字节码数据，等待编译" />
    </div>

    <div class="status-bar" v-if="lines.length > 0">
      <span v-if="hoveredByteInfo">{{ hoveredByteInfo }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { NScrollbar, NEmpty } from 'naive-ui';

const props = withDefaults(defineProps<{
  data: Uint8Array;
  theme?: 'light' | 'dark';
}>(), {
  theme: 'dark'
});

// DOM 容器引用
const containerRef = ref<HTMLElement | null>(null);
// 动态每行字节数
const bpl = ref(8); 
const hoveredIndex = ref<number | null>(null);

let resizeObserver: ResizeObserver | null = null;

// 生命周期：组件挂载时启动尺寸监听
onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 获取容器的实时像素宽度
        const containerWidth = entry.contentRect.width;
        
        // 720px 是 16 字节布局不出现横向滚动条的大致安全宽度
        if (containerWidth >= 720) {
          if (bpl.value !== 16) bpl.value = 16;
        } else {
          if (bpl.value !== 8) bpl.value = 8;
        }
      }
    });
    // 开始监听容器
    resizeObserver.observe(containerRef.value);
  }
});

// 生命周期：组件销毁时清理监听器防止内存泄漏
onBeforeUnmount(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
    resizeObserver.disconnect();
  }
});

const lines = computed(() => {
  if (!props.data || props.data.length === 0) return [];
  
  const result = [];
  const currentBpl = bpl.value;

  for (let i = 0; i < props.data.length; i += currentBpl) {
    const chunk = props.data.subarray(i, i + currentBpl);
    const offset = i.toString(16).padStart(8, '0').toUpperCase();
    
    const bytes = [];
    for (let j = 0; j < currentBpl; j++) {
      const absIndex = i + j;
      if (j < chunk.length) {
        const b = chunk[j];
        bytes.push({
          hex: b.toString(16).padStart(2, '0').toUpperCase(),
          char: (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.',
          index: absIndex,
          isEmpty: false
        });
      } else {
        bytes.push({ hex: '  ', char: ' ', index: absIndex, isEmpty: true });
      }
    }
    result.push({ offset, bytes });
  }
  return result;
});

const hoveredByteInfo = computed(() => {
  if (hoveredIndex.value === null) return null;
  const val = props.data[hoveredIndex.value];
  if (val === undefined) return null;
  
  const offsetHex = hoveredIndex.value.toString(16).padStart(4, '0').toUpperCase();
  const valHex = val.toString(16).padStart(2, '0').toUpperCase();
  
  return `0x${offsetHex} (${hoveredIndex.value}) | Dec: ${val} | Hex: 0x${valHex}`;
});
</script>

<style scoped>
/* ====================================================
   主题色变量定义：完美对齐 VSCode Light / VSCode Dark
==================================================== */
.hex-viewer-container {
  --bg-color: #ffffff;
  --text-color: #333333;
  --header-bg: #f3f3f3;
  --border-color: #e4e4e4;
  --offset-color: #098658; 
  --hex-color: #a31515;    
  --ascii-color: #0000ff;  
  --hover-bg: #e8e8e8;
  --status-bg: #007acc;
  --status-text: #ffffff;
  --highlight-bg: #add6ff; 
  --highlight-text: #000000;
}

.hex-viewer-container.dark {
  --bg-color: #1e1e1e;
  --text-color: #d4d4d4;
  --header-bg: #1e1e1e;
  --border-color: #444444;
  --offset-color: #569cd6; 
  --hex-color: #ce9178;    
  --ascii-color: #9cdcfe;  
  --hover-bg: #2a2d2e;
  --status-bg: #007acc;
  --status-text: #ffffff;
  --highlight-bg: #062f4a; 
  --highlight-text: #ffffff;
}

/* ====================================================
   结构与布局
==================================================== */
.hex-viewer-container {
  width: 100%;
  height: 100%;
  background-color: var(--bg-color);
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s;
}

.scroll-area {
  flex: 1;
}

.hex-viewer {
  font-family: 'Noto Sans Mono', 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 14px;
  color: var(--text-color);
  padding: 12px 16px; 
  min-width: max-content;
  white-space: pre;
  line-height: 1.5;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--header-bg);
  display: flex;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.line {
  display: flex;
  padding: 2px 0;
  border-radius: 4px;
}

.line:hover {
  background-color: var(--hover-bg);
}

/* ====================================================
   间距极限压缩
==================================================== */
.offset-header, .offset {
  width: 72px; 
  color: var(--offset-color);
  margin-right: 16px; 
  flex-shrink: 0;
  user-select: none;
}

.hex-header, .hex-data {
  display: flex;
  margin-right: 16px; 
}

.hex-byte-header, .hex-byte {
  width: 22px; 
  text-align: center;
  margin-right: 4px; 
  border-radius: 2px;
  transition: background-color 0.1s, color 0.1s;
}

.hex-byte:not(.empty), .ascii-char:not(.empty) {
  cursor: crosshair;
}

.hovered {
  background-color: var(--highlight-bg) !important; 
  color: var(--highlight-text) !important;
  outline: solid 1px;
}

.hex-byte-header:nth-child(8n),
.hex-byte:nth-child(8n) {
  margin-right: 12px; 
}

.hex-byte { color: var(--hex-color); }
.ascii-header, .ascii-data { color: var(--ascii-color); flex-shrink: 0; }
.ascii-char {
  display: inline-block;
  text-align: center;
  border-radius: 2px;
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.status-bar {
  border-top: 1px solid var(--border-color);
  background-color: var(--status-bg);
  color: var(--status-text);
  padding: 2px 16px;
  font-size: 12px;
  font-family: 'Noto Sans Mono', 'Fira Code', monospace;
  display: flex;
  align-items: center;
  height: 24px;
  flex-shrink: 0;
}
</style>