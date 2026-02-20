<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { NSpace, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels, demoScriptSource, mqjsCompile } from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

const { t } = useI18n();

const message = useMessage();
const store = useMainStore();
const { themeName, scriptSource, scriptBytecode } = storeToRefs(store); // 获取全局主题状态

const editorRef = shallowRef()

const handleMount = (editor: any, monaco: any) => {
  editorRef.value = editor
  
  // 【核心功能】注入你的键盘 API 类型定义
  // 这样用户输入 "keyboard." 时就会自动弹出提示
  monaco.languages.typescript.javascriptDefaults.addExtraLib(`
    declare class Keyboard {
      /** 设置按键颜色 */
      setRgb(index: number, r: number, g: number, b: number): void;
      /** 切换层级 */
      layerSwitch(layer: number): void;
    }
    const keyboard: Keyboard;
  `, 'filename/keyboard.d.ts')
}

const editorTheme = computed(() => {
  return themeName.value === 'dark' ? 'vs-dark' : 'vs';
});

const editorOptions = {
  theme: 'vs-dark', // 'vs' (light), 'vs-dark', 'hc-black',
  fontFamily: "'Noto Sans Mono', 'Fira Code', 'Consolas', 'Cascadia Code', 'Menlo', 'Monaco', 'Courier New', monospace",
  fontSize: 14,
  minimap: { enabled: true }, // 关闭右侧缩略图节省空间
  automaticLayout: true, // 自动适应父容器大小
  smoothScrolling: true,
  //cursorSmoothCaretAnimation: 'on', 

}

const downloadScript = async () => {
  try {
    // 唤起原生保存文件对话框
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'keyboard_script.js',
      types: [
        {
          description: 'JavaScript Files',
          accept: { 'text/javascript': ['.js'] },
        },
      ],
    });

    // 创建可写流并写入数据
    const writable = await handle.createWritable();
    await writable.write(scriptSource.value);
    await writable.close();

  } catch (error: any) {
    // 用户主动取消保存时会抛出 AbortError，不需要提示错误
    if (error.name !== 'AbortError') {
      console.error("Save failed:", error);
    }
  }
};

const uploadScript = async () => {
  // 检查浏览器是否支持该 API
  if (!('showOpenFilePicker' in window)) {
    return;
  }

  try {
    // 唤起原生打开文件对话框
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'JavaScript & Text Files',
          accept: { 
            'text/javascript': ['.js'],
            'text/plain': ['.txt']
          },
        },
      ],
      multiple: false, // 仅允许单选
    });

    // 获取 File 对象并读取文本
    const file = await fileHandle.getFile();
    const text = await file.text();
    
    // 赋值给编辑器
    scriptSource.value = text;
  } catch (error: any) {
    // 用户主动取消选择时会抛出 AbortError，不需要提示错误
    if (error.name !== 'AbortError') {
      console.error("Load failed:", error);
    }
  }
};

const compileAndUpload = async () => {
  if (!scriptSource.value) {
    return;
  }

  try {

    console.log(scriptBytecode.value)
  } catch (error: any) {
    message.error(`编译失败: ${error.message}`);
  }
};

</script>
<template>
  <n-card style="height: 100%; flex:400px;" :title="t('script_panel_title')" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
    <div class="editor-container">
      <VueMonacoEditor
        v-model:value="scriptSource"
        :theme="editorTheme"
        language="javascript"
        :options="editorOptions"
        @mount="handleMount"
      />
    </div>
    <template #header-extra>
      <n-button style="margin-left: 12px;" @click="scriptSource = demoScriptSource">
          {{ t('demo_js') }}
      </n-button>
      <n-button style="margin-left: 12px;" @click="downloadScript">
          {{ t('download_js') }}
      </n-button>
      <n-button style="margin-left: 12px;" @click="uploadScript">
          {{ t('upload_js') }}
      </n-button>
      <n-button style="margin-left: 12px;" @click="compileAndUpload">
          {{ t('upload_js') }}
      </n-button>
    </template>
  </n-card>
  
</template>

<style>
.editor-container {
  height: 100%; /* 必须给高度 */
  /*border: 1px solid #333;*/
}
</style>