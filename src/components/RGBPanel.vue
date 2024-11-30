;''
<script setup lang="ts">
import { ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const mode = ref<number | null>(0);
const modes =
  [
    {
      value: 0,
      label: 'Fixed'
    },
    {
      value: 1,
      label: 'Static'
    },
    {
      value: 2,
      label: 'Cycle'
    },
    {
      value: 3,
      label: 'Linear'
    },
    {
      value: 4,
      label: 'Trigger'
    },
    {
      value: 5,
      label: 'String'
    },
    {
      value: 6,
      label: 'Fading String'
    },
    {
      value: 7,
      label: 'Diamond Ripple'
    },
    {
      value: 8,
      label: 'Fading Diamond Ripple'
    },
    {
      value: 9,
      label: 'Jelly'
    },
  ].map((s) => {
    return s;
  });

</script>

<template>
  <n-space vertical>
    <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
      <n-form-item label="Mode">
        <n-select :options="modes" v-model:value="mode">
        </n-select>
      </n-form-item>
      <n-form-item label="Color">
        <n-color-picker :show-preview="true" />
      </n-form-item>
      <n-form-item label="Speed">
        <n-input-number placeholder="Speed" :min="0" :max="100" />
      </n-form-item>
    </n-form>
  </n-space>
</template>

<style></style>