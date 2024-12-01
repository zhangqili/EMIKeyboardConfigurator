;''
<script setup lang="ts">
import { ref } from 'vue'
import { NSpace } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';

const { t } = useI18n();

const layer = ref<number| null>(0);
const layers =
  [
    {
      value: 0,
      label: 'Normal'
    },
    {
      value: 1,
      label: 'Shift'
    },
    {
      value: 2,
      label: 'Alpha'
    }
  ].map((s) => {
    return s;
  });

</script>

<template>
  <NSpace vertical>
    <n-radio-group v-model:value="layer" name="radiobuttongroup1">
      <n-radio-button
        v-for="item in layers"
        :key="item.value"
        :value="item.value"
        :label="item.label"
      />
    </n-radio-group>
    <KeyboardTracker></KeyboardTracker>
  </NSpace>
</template>

<style>
</style>