<script setup lang="ts">
import { ref } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels } from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';

const { t } = useI18n();

const store = useMainStore();
const { key_binding, selected_layer, keymap, advanced_keys } = storeToRefs(store);

const layers =
  [
    {
      value: 0,
      label: 'Layer 0'
    },
    {
      value: 1,
      label: 'Layer 1'
    },
    {
      value: 2,
      label: 'Layer 2'
    }
  ].map((s) => {
    return s;
  });

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (keymap.value != undefined) {
        keymap.value[selected_layer.value][index] = key_binding.value;
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (keymap.value != undefined) {
        keymap.value[selected_layer.value][index] = key_binding.value;
      }
  } else {

  }
}

</script>
<template>
  <n-card>
    <n-flex vertical>
      <n-radio-group v-model:value="selected_layer">
        <n-radio-button v-for="item in layers" :key="item.value" :value="item.value" :label="item.label" />
      </n-radio-group>
      <div v-if="keymap != undefined" class="keyboard no-select" style="height: 54px;">
        <Key v-for="(binding,index) in keymap[selected_layer].slice(advanced_keys == undefined ? 0 : advanced_keys.length)"
          @mousedown="(event : MouseEvent) => handleMouseDown(event, index + advanced_keys.length)"
          @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index + advanced_keys.length)"
          :width="1" :height="1" :x=index
          :labels="keyCodeToStringLabels(binding)" />
      </div>
    </n-flex>
  </n-card>
  <n-card>
    <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
    <n-divider></n-divider>
    <KeySelector v-model:binding="key_binding"></KeySelector>
  </n-card>
</template>

<style></style>