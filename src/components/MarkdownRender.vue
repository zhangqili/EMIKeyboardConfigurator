<script setup lang="ts">
import { computed, onMounted } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

// 1. 引入 GitHub 样式
import 'github-markdown-css/github-markdown.css';

// 2. 引入代码高亮样式
// 使用 atom-one-dark，在浅色/深色背景下都像一个深色代码编辑器，视觉效果统一且清晰
import 'highlight.js/styles/atom-one-dark.css';

import { useMainStore } from '../store/main';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  content: string
}>();

const store = useMainStore();
const { themeName } = storeToRefs(store);

// 【关键修复 1】标准化 themeName
// 确保传给 CSS 的只有 'light' 或 'dark' 两个值，且全小写
const colorMode = computed(() => {
  // 获取当前主题，如果未定义则默认为 light
  const mode = String(themeName.value || 'light').toLowerCase();
  
  // 只有明确包含 'dark' 时才切换到深色，其他情况（'light', 'Light', 'system'...）一律视为浅色
  return mode.includes('dark') ? 'dark' : 'light';
});

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

md.set({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

const renderedHtml = computed(() => md.render(props.content || ''));
</script>

<template>
  <div 
    class="markdown-body" 
    :data-color-mode="colorMode"
    @contextmenu.stop
  >
    <div v-html="renderedHtml"></div>
  </div>
</template>

<style scoped>
/* 基础设置：背景透明，跟随父容器 */
.markdown-body {
  background: none !important;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 20px;
}

/* 【关键修复 2】CSS 暴力强制覆盖 */
/* 当我们告诉它是 light 模式时，强制文字变黑，不管它原本的 CSS 变量怎么算 */
.markdown-body[data-color-mode="light"] {
  color: #24292f !important; /* GitHub 的标准黑色字体 */
  --color-fg-default: #24292f !important;
}

/* 当我们告诉它是 dark 模式时，强制文字变白 */
.markdown-body[data-color-mode="dark"] {
  color: #c9d1d9 !important; /* GitHub 的标准浅灰字体 */
  --color-fg-default: #c9d1d9 !important;
}

/* 修复表格背景：强制透明，去掉斑马纹，防止深色背景残留 */
:deep(table), :deep(tr), :deep(td), :deep(th) {
  background-color: transparent !important;
}
</style>