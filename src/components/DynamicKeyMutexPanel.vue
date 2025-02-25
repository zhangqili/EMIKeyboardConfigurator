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
import { Keycode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

const dynamic_key_mutex = defineModel<ekc.IDynamicKeyMutex>("dynamic_key",{ 
  default: {
    key:[
      {
        binding: 0,
        id:0
      },
      {
        binding: 0,
        id:0
      }
    ],
    mode: ekc.DynamicKeyMutexMode.DKMutexDistancePriority,
  }
});

const dynamic_key_mutex_modes =
  [
    {
      value: ekc.DynamicKeyMutexMode.DKMutexDistancePriority,
      label: 'Distance'
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexLastPriority,
      label: 'Last trigger'
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexKey1Priority,
      label: 'Key1'
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexKey2Priority,
      label: 'Key2'
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexNeutral,
      label: 'Neutarl'
    }
  ].map((s) => {
    return s;
  });

const dynamic_key_mutex_mode = computed<ekc.DynamicKeyMutexMode>({
  get: () => (dynamic_key_mutex.value.mode&0x0F),
  set: (value: ekc.DynamicKeyMutexMode) => {
    dynamic_key_mutex.value.mode &= 0xF0;
    dynamic_key_mutex.value.mode |= value&0x0F;
    triggerRef(dynamic_key_mutex);
  },
});

const dynamic_key_mutex_switch = computed<boolean>({
  get: () => ((dynamic_key_mutex.value.mode&0xF0)>0),
  set: (value: boolean) => {
    dynamic_key_mutex.value.mode &= 0x0F;
    dynamic_key_mutex.value.mode |= value ? 0xF0 : 0x00;
    triggerRef(dynamic_key_mutex);
  },
});

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_mutex.value != undefined) {
      if (index == 0) {
        dynamic_key_mutex.value.bindings[index] = key_binding.value;
        
      }
      else
      {

      }
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_mutex.value != undefined) {
      dynamic_key_mutex.value.bindings[index] = key_binding.value;
      }
  } else {

  }
}
</script>
<template>
<n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
  <n-form-item label="Key">
    <div class="keyboard no-select" style="height: 54px;width: 108px;">
        <Key v-for="(item,index) in dynamic_key_mutex.target_keys_location" :width="1" :height="1" :x=index
      :labels="['Layer '+item.layer.toString(),,,,,,item.id.toString()]"></Key>
    </div>
  </n-form-item>
  <n-form-item label="Priority mode">
    <n-radio-group v-model:value="dynamic_key_mutex_mode" name="radiobuttongroup1">
      <n-radio-button v-for="mode in dynamic_key_mutex_modes" :key="mode.value" :value="mode.value" :label="mode.label" />
    </n-radio-group> 
  </n-form-item>
  <n-form-item label="Always trigger when fully pressed">
    <n-switch v-model:value="dynamic_key_mutex_switch"/>
  </n-form-item>
  <n-form-item label="Key bindings">
    <div class="keyboard no-select" style="height: 54px;">
      <Key v-for="(item,index) in dynamic_key_mutex.bindings" :width="1" :height="1" :x=index
      :labels="keyCodeToStringLabels(item)"
      @mousedown="(event : MouseEvent) => handleMouseDown(event, index)"
      @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index)"></Key>
    </div>
  </n-form-item>
</n-form>
</template>

<style scoped>
</style>