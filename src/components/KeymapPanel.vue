<script setup lang="ts">
import { computed, ref } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels } from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';

const { t } = useI18n();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (keymap.value != undefined) {
        keymap.value[current_layer.value][index] = key_binding.value;
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (keymap.value != undefined) {
        keymap.value[current_layer.value][index] = key_binding.value;
      }
  } else {

  }
}

</script>
<template>
  <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
    <n-scrollbar>
      <n-flex vertical  v-if="keymap != undefined && keymap.length>0 &&  keymap[0].length> advanced_keys.length">
        <div class="keyboard no-select" style="height: 54px;">
          <Key v-for="(binding,index) in keymap[current_layer].slice(advanced_keys == undefined ? 0 : advanced_keys.length)"
            @mousedown="(event : MouseEvent) => handleMouseDown(event, index + advanced_keys.length)"
            @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index + advanced_keys.length)"
            :width="1" :height="1" :x=index
            :labels="keyCodeToStringLabels(binding)" />
        </div>
        <n-divider></n-divider>
      </n-flex>
      <KeyTracker v-model:binding="key_binding"></KeyTracker>
      <n-divider></n-divider>
      <KeySelector v-model:binding="key_binding"></KeySelector>
    </n-scrollbar>
  </n-card>
</template>

<style></style>