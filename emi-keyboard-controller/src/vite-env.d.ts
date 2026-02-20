// src/vite-env.d.ts

/// <reference types="vite/client" />

// 解决 .md?raw 导入报错
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// (可选) 如果你的 .vue 导入也报错，可以在这里加上：
declare module '*.json?raw' {
  const content: string;
  export default content;
}