;''
<script setup lang="ts">
import { ref } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';

const { t } = useI18n();

const store = useMainStore();
const {key_binding, selected_layer} = storeToRefs(store);

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

  function updateBinding(binding : number)
  {
    key_binding.value = binding;
  }


</script>

<template>
  <NSpace vertical>
    <n-radio-group v-model:value="selected_layer" name="radiobuttongroup1">
      <n-radio-button
        v-for="item in layers"
        :key="item.value"
        :value="item.value"
        :label="item.label"
      />
    </n-radio-group>
    <KeyboardTracker v-model:binding="key_binding" v-on:update:binding="updateBinding"></KeyboardTracker>
    <KeySelector v-model:binding="key_binding"  v-on:update:binding="updateBinding"></KeySelector>
  </NSpace>
</template>

<style>
</style>