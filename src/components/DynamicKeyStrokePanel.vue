<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels} from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

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

const action_options = [
        {
          label: 'Deactivate',
          value: 0
        },
        {
          label: 'Activate once',
          value: 1
        },
        {
          label: 'Keep activating',
          value: 3
        }
      ];

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
  return (dynamic_key_stroke.value.key_control[key] >> (index*4)) & 0x0F;
}

function setAction(key : number, index : number, action : number)
{
  dynamic_key_stroke.value.key_control[key] &= ~(0x0F << (index*4));
  dynamic_key_stroke.value.key_control[key] |= (action << (index*4));
  //console.log(dynamic_key_stroke.value.key_control);
  triggerRef(dynamic_key_stroke);
}

</script>
<template>
  <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
    <n-form-item label="Key">
      <div class="keyboard no-select" style="height: 54px;">
        <Key v-for="(item,index) in dynamic_key_stroke.target_keys_location" :width="1" :height="1" :x=index
      :labels="['Layer '+item.layer.toString(),,,,,,item.id.toString()]"></Key>
      </div>
    </n-form-item>
    <n-form-item label="Press begin distance">
      <n-input-number v-model:value="press_begin_distance" placeholder="Press begin distance" :min="0" :max="100" />
    </n-form-item>
    <n-form-item label="Press fully distance">
      <n-input-number v-model:value="press_fully_distance" placeholder="Press begin distance" :min="0" :max="100" />
    </n-form-item>
    <n-form-item label="Release begin distance">
      <n-input-number v-model:value="release_begin_distance" placeholder="Release begin distance" :min="0" :max="100" />
    </n-form-item>
    <n-form-item label="Release fully distance">
      <n-input-number v-model:value="release_fully_distance" placeholder="Release fully distance" :min="0" :max="100" />
    </n-form-item>
    <n-form-item label="Key bindings">
      <div class="keyboard no-select" style="height: 54px;">
      <Key v-for="(item,index) in dynamic_key_stroke.bindings" :width="1" :height="1" :x=index
      :labels="keyCodeToStringLabels(item)"
      @mousedown="(event : MouseEvent) => handleMouseDown(event, index)"
      @mouseenter="(event : MouseEvent) => handleMouseEnter(event, index)"></Key>
      </div>
    </n-form-item>
    <n-form-item label="Key control" style="text-align: center;">
      <div style="display: flex; width: 100%;">
      <div style="width: 40px;"></div>
      <n-grid style="flex: 1" :cols="4">
        <n-grid-item>
          <div>Press begin</div>
        </n-grid-item>
        <n-grid-item>
          <div>Press fully</div>
        </n-grid-item>
        <n-grid-item>
          <div>Release begin</div>
        </n-grid-item>
        <n-grid-item>
          <div>Release fully</div>
        </n-grid-item>
        <n-grid-item>
          <div style="position: absolute; left: 0px;">Key1</div>
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
          <div style="position: absolute; left: 0px;">Key2</div>
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
          <div style="position: absolute; left: 0px;">Key3</div>
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
          <div style="position: absolute; left: 0px;">Key4</div>
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