;''
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';

const { t } = useI18n();

const props = defineProps<{ advanced_key: ekc.IAdvancedKey }>();
const emit = defineEmits(['update:advanced_key']);

/*
const advanced_key = ref<IAdvancedKey>({
  value: 0,
  state: false,
  raw: 0,
  maximum: 0,
  minimum: 0,
  mode: KeyMode.KeyAnalogRapidMode,
  calibration_mode: CalibrationMode.KeyNoCalibration,
  activation_value: 0.5,
  phantom_lower_deadzone: 0.2,
  trigger_distance: 0.08,
  release_distance: 0.08,
  schmitt_parameter: 0.01,
  trigger_speed: 0.01,
  release_speed: 0.01,
  upper_deadzone: 0.04,
  lower_deadzone: 0.2,
  upper_bound: 4096.0,
  lower_bound: 0
});
*/

const mode = computed<ekc.KeyMode>({
  get: () => props.advanced_key.mode,
  set: (value: ekc.KeyMode) => {
    props.advanced_key.mode = value;
  },
});
const activation_value = computed<number>({
  get: () => (Math.round(props.advanced_key.activation_value * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.activation_value = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const trigger_distance = computed<number>({
  get: () => (Math.round(props.advanced_key.trigger_distance * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.trigger_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const release_distance = computed<number>({
  get: () => (Math.round(props.advanced_key.release_distance * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.release_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const upper_deadzone = computed<number>({
  get: () => (Math.round(props.advanced_key.upper_deadzone * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.upper_deadzone = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const lower_deadzone = computed<number>({
  get: () => (Math.round(props.advanced_key.lower_deadzone * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.lower_deadzone = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const trigger_speed = computed<number>({
  get: () => (Math.round(props.advanced_key.trigger_speed * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.trigger_speed = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const release_speed = computed<number>({
  get: () => (Math.round(props.advanced_key.release_speed * 1000) / 10),
  set: (value: number) => {
    props.advanced_key.release_speed = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});

const modes =
  [
    {
      value: ekc.KeyMode.KeyDigitalMode,
      label: 'Digital'
    },
    {
      value: ekc.KeyMode.KeyAnalogNormalMode,
      label: 'Analog Normal'
    },
    {
      value: ekc.KeyMode.KeyAnalogRapidMode,
      label: 'Analog Rapid'
    },
    {
      value: ekc.KeyMode.KeyAnalogSpeedMode,
      label: 'Analog Speed'
    }
  ].map((s) => {
    return s;
  });

</script>

<template>
  <NSpace vertical>
    <n-radio-group v-model:value="mode" name="radiobuttongroup1">
      <n-radio-button v-for="mode in modes" :key="mode.value" :value="mode.value" :label="mode.label" />
    </n-radio-group>
    <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogNormalMode" label="Activation Distance">
        <n-input-number v-model:value="activation_value" placeholder="Activation Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogNormalMode" label="Deactivation Distance">
        <n-input-number placeholder="Deactivation Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode" label="Trigger Distance">
        <n-input-number v-model:value="trigger_distance" placeholder="Trigger Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode" label="Release Distance">
        <n-input-number v-model:value="release_distance" placeholder="Release Distance" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogSpeedMode" label="Trigger Speed">
        <n-input-number v-model:value="trigger_speed" placeholder="Trigger Speed" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogSpeedMode" label="Release Speed">
        <n-input-number v-model:value="release_speed" placeholder="Release Speed" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode || mode === ekc.KeyMode.KeyAnalogSpeedMode" label="Upper Deadzone">
        <n-input-number v-model:value="upper_deadzone" placeholder="Upper Deadzone" :min="0" :max="100" />
      </n-form-item>
      <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode || mode === ekc.KeyMode.KeyAnalogSpeedMode" label="Lower Deadzone">
        <n-input-number v-model:value="lower_deadzone" placeholder="Lower Deadzone" :min="0" :max="100" />
      </n-form-item>
    </n-form>
  </NSpace>
</template>

<style></style>