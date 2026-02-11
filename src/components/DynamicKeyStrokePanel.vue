<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels} from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import PlainKey from "./PlainKey.vue";
import KeyEditCell from './KeyEditCell.vue';

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();
const { key_binding, current_layer, keymap, advanced_keys } = storeToRefs(store);

const dynamic_key_stroke = defineModel<ekc.IDynamicKeyStroke4x4>("dynamic_key",{ 
  default: {
    type: ekc.DynamicKeyType.DynamicKeyStroke,
    key_binding:[0,0,0,0],
    key_control:[0,0,0,0],
    press_begin_distance: 0.25, 
    press_fully_distance: 0.75,
    release_begin_distance: 0.75,
    release_fully_distance: 0.25,
  }
});

const action_options = computed(() => [
        {
          label: t('dynamic_key_s_panel_deactivate'),
          value: 0
        },
        {
          label: t('dynamic_key_s_panel_activate_once'),
          value: 1
        },
        {
          label: t('dynamic_key_s_panel_keep_activating'),
          value: 3
        }
      ]);

const press_begin_distance = computed<number>({
  get: () => (Math.round(dynamic_key_stroke.value.press_begin_distance * 1000) / 10),
  set: (value: number) => {
    dynamic_key_stroke.value.press_begin_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const press_fully_distance = computed<number>({
  get: () => (Math.round(dynamic_key_stroke.value.press_fully_distance * 1000) / 10),
  set: (value: number) => {
    dynamic_key_stroke.value.press_fully_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const release_begin_distance = computed<number>({
  get: () => (Math.round(dynamic_key_stroke.value.release_begin_distance * 1000) / 10),
  set: (value: number) => {
    dynamic_key_stroke.value.release_begin_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});
const release_fully_distance = computed<number>({
  get: () => (Math.round(dynamic_key_stroke.value.release_fully_distance * 1000) / 10),
  set: (value: number) => {
    dynamic_key_stroke.value.release_fully_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});

function handleMouseDown(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_stroke.value != undefined) {
      dynamic_key_stroke.value.bindings[index] = key_binding.value;
      triggerRef(dynamic_key_stroke);
      }
  } else {

  }
}

function handleMouseEnter(event : MouseEvent, index: number) {
  if (event.buttons === 1) {
    if (dynamic_key_stroke.value != undefined) {
      dynamic_key_stroke.value.bindings[index] = key_binding.value;
      triggerRef(dynamic_key_stroke);
      }
  } else {

  }
}

function getAction(key : number, index : number)
{
  return (dynamic_key_stroke.value.key_control[key] >> (index*2)) & 0x03;
}

function setAction(key : number, index : number, action : number)
{
  dynamic_key_stroke.value.key_control[key] &= ~(0x03 << (index*2));
  dynamic_key_stroke.value.key_control[key] |= (action << (index*2));
  triggerRef(dynamic_key_stroke);
}

</script>
<template>
  <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
    <n-form-item :label="t('key')">
      <div class="keyboard no-select" style="height: 54px;">
        <PlainKey v-for="(item,index) in dynamic_key_stroke.target_keys_location" :width="1" :height="1" :x=index
      :labels="['Layer '+item.layer.toString(),,,,,,item.id.toString()]"></PlainKey>
      </div>
    </n-form-item>
    <n-form-item :label="t('dynamic_key_s_panel_press_begin_distance')">
      <n-input-number v-model:value="press_begin_distance" :placeholder="t('dynamic_key_s_panel_press_begin_distance')" :min="0" :max="100" />
    </n-form-item>
    <n-form-item :label="t('dynamic_key_s_panel_press_fully_distance')">
      <n-input-number v-model:value="press_fully_distance" :placeholder="t('dynamic_key_s_panel_press_fully_distance')" :min="0" :max="100" />
    </n-form-item>
    <n-form-item :label="t('dynamic_key_s_panel_release_begin_distance')">
      <n-input-number v-model:value="release_begin_distance" :placeholder="t('dynamic_key_s_panel_release_begin_distance')" :min="0" :max="100" />
    </n-form-item>
    <n-form-item :label="t('dynamic_key_s_panel_release_fully_distance')">
      <n-input-number v-model:value="release_fully_distance" :placeholder="t('dynamic_key_s_panel_release_fully_distance')" :min="0" :max="100" />
    </n-form-item>
    <n-form-item :label="t('dynamic_key_s_panel_key_bindings')">
      <div class="keyboard no-select" style="height: 54px;">
        <KeyEditCell v-for="(item,index) in dynamic_key_stroke.bindings" :width="1" :height="1" :x=index
          v-model:value="dynamic_key_stroke.bindings[index]"></KeyEditCell>
      </div>
    </n-form-item>
    <n-form-item :label="t('dynamic_key_s_panel_key_control')" style="text-align: center;">
      <div style="display: flex; width: 100%;">
      <div style="width: 40px;"></div>
      <n-grid style="flex: 1" :cols="4">
        <n-grid-item>
          <div>{{ t('dynamic_key_s_panel_press_begin') }}</div>
        </n-grid-item>
        <n-grid-item>
          <div>{{ t('dynamic_key_s_panel_press_fully') }}</div>
        </n-grid-item>
        <n-grid-item>
          <div>{{ t('dynamic_key_s_panel_release_begin') }}</div>
        </n-grid-item>
        <n-grid-item>
          <div>{{ t('dynamic_key_s_panel_release_fully') }}</div>
        </n-grid-item>
        <n-grid-item>
          <div style="position: absolute; left: 0px;">{{ t('key') + '1' }}</div>
          <n-select :options="action_options" :value="getAction(0,0)" @update:value="(value : number)=>{setAction(0,0,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(0,1)" @update:value="(value : number)=>{setAction(0,1,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(0,2)" @update:value="(value : number)=>{setAction(0,2,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(0,3)" @update:value="(value : number)=>{setAction(0,3,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <div style="position: absolute; left: 0px;">{{ t('key') + '2' }}</div>
          <n-select :options="action_options" :value="getAction(1,0)" @update:value="(value : number)=>{setAction(1,0,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(1,1)" @update:value="(value : number)=>{setAction(1,1,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(1,2)" @update:value="(value : number)=>{setAction(1,2,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(1,3)" @update:value="(value : number)=>{setAction(1,3,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <div style="position: absolute; left: 0px;">{{ t('key') + '3' }}</div>
          <n-select :options="action_options" :value="getAction(2,0)" @update:value="(value : number)=>{setAction(2,0,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(2,1)" @update:value="(value : number)=>{setAction(2,1,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(2,2)" @update:value="(value : number)=>{setAction(2,2,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(2,3)" @update:value="(value : number)=>{setAction(2,3,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <div style="position: absolute; left: 0px;">{{ t('key') + '4' }}</div>
          <n-select :options="action_options" :value="getAction(3,0)" @update:value="(value : number)=>{setAction(3,0,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(3,1)" @update:value="(value : number)=>{setAction(3,1,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(3,2)" @update:value="(value : number)=>{setAction(3,2,value)}"></n-select>
        </n-grid-item>
        <n-grid-item>
          <n-select :options="action_options" :value="getAction(3,3)" @update:value="(value : number)=>{setAction(3,3,value)}"></n-select>
        </n-grid-item>
      </n-grid>
      </div>
    </n-form-item>
  </n-form>
</template>

<style scoped>
</style>