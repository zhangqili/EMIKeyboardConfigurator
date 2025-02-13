<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels } from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();
const { key_binding, selected_layer, keymap, advanced_keys } = storeToRefs(store);

const dynamic_key_tk = defineModel<ekc.IDynamicKeyToggleKey>("dynamic_key",{ 
  default: {
    key_binding: 0,
  }
});

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_tk.value != undefined) {
      dynamic_key_tk.value.key_binding = key_binding.value;
      triggerRef(dynamic_key_tk);
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_tk.value != undefined) {
      dynamic_key_tk.value.key_binding = key_binding.value;
      triggerRef(dynamic_key_tk);
      }
  } else {

  }
}
</script>
<template>
<n-form label-placement="left" label-width="auto" require-mark-placement="right-hanging">
    <n-form-item label="Key">
      <div class="keyboard no-select" style="height: 54px;">
      <Key :width="1" :height="1" :x=0
      :labels="['111']"></Key>
      </div>
    </n-form-item>
    <n-form-item label="Key binding">
      <div class="keyboard no-select" style="height: 54px;">
        <Key :width="1" :height="1" :x=0
      :labels="keyCodeToStringLabels(dynamic_key_tk.key_binding)"
      @mousedown="(event : MouseEvent) => handleMouseDown(event, 0)"
      @mouseenter="(event : MouseEvent) => handleMouseEnter(event, 0)"></Key>
      </div>
    </n-form-item>
  </n-form>
</template>

<style scoped>
</style>