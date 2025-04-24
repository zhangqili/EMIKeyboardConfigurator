;''
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';

const { t } = useI18n();

const store = useMainStore();
const {advanced_key} = storeToRefs(store);

const mode = computed<ekc.KeyMode>({
  get: () => advanced_key.value.mode,
  set: (value: ekc.KeyMode) => {
    advanced_key.value.mode = value;
  },
});

const activation_value = computed<number>({
  get: () => (Math.round(advanced_key.value.activation_value * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.activation_value = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});

const deactivation_value = computed<number>({
  get: () => (Math.round(advanced_key.value.deactivation_value * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.deactivation_value = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const trigger_distance = computed<number>({
  get: () => (Math.round(advanced_key.value.trigger_distance * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.trigger_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const release_distance = computed<number>({
  get: () => (Math.round(advanced_key.value.release_distance * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.release_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const upper_deadzone = computed<number>({
  get: () => (Math.round(advanced_key.value.upper_deadzone * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.upper_deadzone = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const lower_deadzone = computed<number>({
  get: () => (Math.round(advanced_key.value.lower_deadzone * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.lower_deadzone = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const trigger_speed = computed<number>({
  get: () => (Math.round(advanced_key.value.trigger_speed * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.trigger_speed = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const release_speed = computed<number>({
  get: () => (Math.round(advanced_key.value.release_speed * 1000) / 10),
  set: (value: number) => {
    advanced_key.value.release_speed = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});

const modes = computed(()=>
  [
    {
      value: ekc.KeyMode.KeyDigitalMode,
      label: t('performance_panel_digital')
    },
    {
      value: ekc.KeyMode.KeyAnalogNormalMode,
      label: t('performance_panel_analog_normal')
    },
    {
      value: ekc.KeyMode.KeyAnalogRapidMode,
      label: t('performance_panel_analog_rapid')
    },
    {
      value: ekc.KeyMode.KeyAnalogSpeedMode,
      label: t('performance_panel_analog_speed')
    }
  ].map((s) => {
    return s;
  }));

</script>

<template>
  <n-card style="height: 100%;">
    <n-space vertical>
      <n-radio-group v-model:value="mode">
        <n-radio-button v-for="mode in modes" :key="mode.value" :value="mode.value" :label="mode.label" />
      </n-radio-group>
      <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogNormalMode" :label="t('performance_panel_activation_value')">
          <n-input-number v-model:value="activation_value" :placeholder="t('performance_panel_activation_value')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogNormalMode" :label="t('performance_panel_deactivation_value')">
          <n-input-number v-model:value="deactivation_value" :placeholder="t('performance_panel_deactivation_value')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode" :label="t('performance_panel_trigger_distance')">
          <n-input-number v-model:value="trigger_distance" :placeholder="t('performance_panel_trigger_distance')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode" :label="t('performance_panel_release_distance')">
          <n-input-number v-model:value="release_distance" :placeholder="t('performance_panel_release_distance')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogSpeedMode" :label="t('performance_panel_trigger_speed')">
          <n-input-number v-model:value="trigger_speed" :placeholder="t('performance_panel_trigger_speed')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogSpeedMode" :label="t('performance_panel_release_speed')">
          <n-input-number v-model:value="release_speed" :placeholder="t('performance_panel_release_speed')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode || mode === ekc.KeyMode.KeyAnalogSpeedMode" :label="t('performance_panel_upper_deadzone')">
          <n-input-number v-model:value="upper_deadzone" :placeholder="t('performance_panel_upper_deadzone')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode || mode === ekc.KeyMode.KeyAnalogSpeedMode" :label="t('performance_panel_lower_deadzone')">
          <n-input-number v-model:value="lower_deadzone" :placeholder="t('performance_panel_lower_deadzone')" :min="0" :max="100" >
            <template #suffix>
              %
            </template>
          </n-input-number>
        </n-form-item>
      </n-form>
      <n-collapse v-if="mode !== ekc.KeyMode.KeyDigitalMode">
        <n-collapse-item :title="t('performance_panel_advanced_options')">
          <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
            <n-form-item :label="t('performance_panel_upper_bound')">
              <n-input-number :placeholder="t('performance_panel_upper_bound')"/>
            </n-form-item>
            <n-form-item :label="t('performance_panel_lower_bound')">
              <n-input-number :placeholder="t('performance_panel_lower_bound')"/>
            </n-form-item>
          </n-form>
        </n-collapse-item>
      </n-collapse>
    </n-space>
  </n-card>
</template>

<style></style>