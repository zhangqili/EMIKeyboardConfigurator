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
const { keyBinding, currentLayerIndex, keymap, advancedKeys } = storeToRefs(store);

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (keymap.value != undefined) {
        keymap.value[currentLayerIndex.value][index] = keyBinding.value;
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (keymap.value != undefined) {
        keymap.value[currentLayerIndex.value][index] = keyBinding.value;
      }
  } else {

  }
}

</script>
<template>
  <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
    <n-scrollbar>
      <n-flex vertical  v-if="keymap != undefined && keymap.length>0 &&  keymap[0].length> advancedKeys.length">
        <div class="keyboard no-select" style="height: 54px;">
          <PlainKey v-for="(binding,index) in keymap[currentLayerIndex].slice(advancedKeys == undefined ? 0 : advancedKeys.length)"
            @mousedown="(event : MouseEvent) => handleMouseDown(event, index + advancedKeys.length)"
            @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index + advancedKeys.length)"
            :width="1" :height="1" :x=index
            :labels="keyCodeToStringLabels(binding)" />
        </div>
        <n-divider></n-divider>
      </n-flex>
      <KeyTracker v-model:binding="keyBinding"></KeyTracker>
      <n-divider></n-divider>
      <KeySelector v-model:binding="keyBinding"></KeySelector>
    </n-scrollbar>
  </n-card>
</template>

<style></style>