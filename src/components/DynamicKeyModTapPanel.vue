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
import PlainKey from "./PlainKey.vue";
import KeyEditCell from './KeyEditCell.vue';

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

const dynamic_key_mt = defineModel<ekc.IDynamicKeyModTap>("dynamic_key",{ 
  default: {
    key_binding:[0,0],
    duration: 100,
  }
});

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_mt.value != undefined) {
      dynamic_key_mt.value.bindings[index] = key_binding.value;
      triggerRef(dynamic_key_mt);
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_mt.value != undefined) {
      dynamic_key_mt.value.bindings[index] = key_binding.value;
      triggerRef(dynamic_key_mt);
      }
  } else {

  }
}
</script>
<template>
<n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
    <n-form-item :label="t('key')">
      <div class="keyboard no-select" style="height: 54px;">
        <PlainKey v-for="(item,index) in dynamic_key_mt.target_keys_location" :width="1" :height="1" :x=index
      :labels="['Layer '+item.layer.toString(),,,,,,item.id.toString()]"></PlainKey>
      </div>
    </n-form-item>
    <n-form-item :label="t('dynamic_key_mt_panel_duration')">
      <n-input-number v-model:value="dynamic_key_mt.duration" placeholder="Duration" :min="0" :max="4294967295" />
    </n-form-item>
    <n-form-item :label="t('dynamic_key_mt_panel_key_bindings')">
      <div class="keyboard no-select" style="height: 54px;">
        <KeyEditCell v-for="(item,index) in dynamic_key_mt.bindings" :width="1" :height="1" :x=index
          v-model:value="dynamic_key_mt.bindings[index]"></KeyEditCell>
      </div>
    </n-form-item>
  </n-form>
</template>

<style scoped>
</style>