<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels } from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

const { t } = useI18n();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

const code = ref(
`// Code outside functions runs once at startup/boot.
// Register keys to monitor (e.g., Key ID 2)
keyboard.watch(2);

// Runs per tick.
function loop() 
{

}

// Triggered when a watched key is pressed.
function onKeyDown(key)
{
    // Check if Key 2 was pressed
    if (key.id == 2)
    {
        // Tap 'A' for 100ms
        keyboard.tap(0x0004, 100);
        // Print something
        console.log("Key " + key.id + " pressed");
    }
}

// Triggered when a watched key is released.
function onKeyUp(key)
{

}
`)

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

const editorOptions = {
  theme: 'vs-dark', // 'vs' (light), 'vs-dark', 'hc-black',
  fontFamily: "'Noto Sans Mono', 'Fira Code', 'Consolas', 'Cascadia Code', 'Menlo', 'Monaco', 'Courier New', monospace",
  fontSize: 14,
  minimap: { enabled: false }, // 关闭右侧缩略图节省空间
  automaticLayout: true, // 自动适应父容器大小
}

</script>
<template>
  <n-card style="height: 100%; flex:400px;" :title="t('script_panel_title')" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
    <div class="editor-container">
      <VueMonacoEditor
        v-model:value="code"
        theme="vs-dark"
        language="javascript"
        :options="editorOptions"
        @mount="handleMount"
      />
    </div>
    <template #header-extra>
      <n-button style="margin-left: 12px;">
          {{ t('full_screen') }}
      </n-button>
      <n-button style="margin-left: 12px;">
          {{ t('apply') }}
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