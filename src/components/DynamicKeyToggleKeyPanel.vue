<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels } from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

const dynamic_key_tk = defineModel<ekc.IDynamicKeyToggleKey>("dynamic_key",{ 
  default: {
    key_binding: 0,
  }
});

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_tk.value != undefined) {
      dynamic_key_tk.value.bindings[0] = key_binding.value;
      triggerRef(dynamic_key_tk);
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_tk.value != undefined) {
      dynamic_key_tk.value.bindings[0] = key_binding.value;
      triggerRef(dynamic_key_tk);
      }
  } else {

  }
}
</script>
<template>
<n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
    <n-form-item :label="t('key')">
      <div class="keyboard no-select" style="height: 54px;">
        <Key v-for="(item,index) in dynamic_key_tk.target_keys_location" :width="1" :height="1" :x=index
      :labels="['Layer '+item.layer.toString(),,,,,,item.id.toString()]"></Key>
      </div>
    </n-form-item>
    <n-form-item :label="t('dynamic_key_tk_panel_key_bindings')">
      <div class="keyboard no-select" style="height: 54px;">
        <Key :width="1" :height="1" :x=0
      :labels="keyCodeToStringLabels(dynamic_key_tk.bindings[0])"
      @mousedown="(event : MouseEvent) => handleMouseDown(event, 0)"
      @mouseenter="(event : MouseEvent) => handleMouseEnter(event, 0)"></Key>
      </div>
    </n-form-item>
  </n-form>
</template>

<style scoped>
</style>