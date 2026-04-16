<script setup lang="ts">
import { computed, inject, type Ref, ref } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from '@/components/KeyTracker.vue';
import KeySelector from '@/components/KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '@/store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels, KeyConfig } from "@/apis/utils";
import * as ekc from 'emi-keyboard-controller';

const { t } = useI18n();

const store = useMainStore();
const keyBinding = defineModel<number>("keyBinding",{ 
  default: 0
});

interface KeyboardContext {
  keyboardKeys: Ref<KeyConfig[]>;
  advancedKeys: Ref<ekc.IAdvancedKey[]>;
  rgbConfigs: Ref<ekc.IRGBConfig[]>;
  keymap: Ref<number[][]>;
  dynamicKeys: Ref<ekc.IDynamicKey[]>;
  currentLayerIndex: Ref<number>;
  tabSelection: Ref<string | null>;
}

const { 
  advancedKeys,
  rgbConfigs, 
  keymap, 
  currentLayerIndex, 
  tabSelection,
  dynamicKeys
} = inject<KeyboardContext>('keyboardContext')!;

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
  <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">

    <n-flex vertical v-if="keymap != undefined && keymap.length > 0 && keymap[0].length > advancedKeys.length">
      <div class="keyboard no-select" style="height: 54px;">
        <PlainKey
          v-for="(binding, index) in keymap[currentLayerIndex].slice(advancedKeys == undefined ? 0 : advancedKeys.length)"
          @mousedown="(event: MouseEvent) => handleMouseDown(event, index + advancedKeys.length)"
          @mouseenter="(event: MouseEvent) => handleMouseEnter(event, index + advancedKeys.length)" :width="1"
          :height="1" :x=index :labels="keyCodeToStringLabels(binding)" />
      </div>
    </n-flex>

    <n-split direction="horizontal" :default-size="0.3" style="flex: 1; min-height: 0;">
      <template #1>
        <div style="height: 100%; overflow-y: auto; display: flex; flex-direction: column;">
          <OsKeyMonitor style="margin-bottom: 12px; flex-shrink: 0;" />
          <KeyTracker v-model:binding="keyBinding"></KeyTracker>
        </div>
      </template>

      <template #2>
        <div style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">

          <KeySelector v-model:binding="keyBinding" style="flex: 1; min-height: 0; width: 100%;"></KeySelector>

        </div>
      </template>
    </n-split>

  </n-card>
</template>

<style></style>