;''
<script setup lang="ts">
import { ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const mode = ref<number| null>(0);
const modes =
  [
    {
      value: 0,
      label: 'Digital'
    },
    {
      value: 1,
      label: 'Analog Normal'
    },
    {
      value: 2,
      label: 'Analog Rapid'
    },
    {
      value: 3,
      label: 'Analog Speed'
    }
  ].map((s) => {
    return s;
  });

</script>

<template>
  <NSpace vertical>
    <n-radio-group v-model:value="mode" name="radiobuttongroup1">
      <n-radio-button
        v-for="mode in modes"
        :key="mode.value"
        :value="mode.value"
        :label="mode.label"
      />
    </n-radio-group>
    <n-form inline
    label-placement="top"
    label-width="auto"
    require-mark-placement="right-hanging">
      <n-form-item v-if="mode === 1" label="Activation Distance">
        <n-input-number placeholder="Activation Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 1" label="Deactivation Distance">
        <n-input-number placeholder="Deactivation Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 2" label="Trigger Distance">
        <n-input-number placeholder="Trigger Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 2" label="Release Distance">
        <n-input-number placeholder="Release Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 3" label="Trigger Speed">
        <n-input-number placeholder="Trigger Speed" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 3" label="Release Speed">
        <n-input-number placeholder="Release Speed" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 2 || mode === 3" label="Upper Deadzone">
        <n-input-number placeholder="Upper Deadzone" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === 2 || mode === 3" label="Lower Deadzone">
        <n-input-number placeholder="Lower Deadzone" :min="0" :max="100" />
      </n-form-item>
    </n-form>
  </NSpace>
</template>

<style>
</style>