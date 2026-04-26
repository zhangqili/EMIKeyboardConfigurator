<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage, NTable } from 'naive-ui'
import { useI18n } from "vue-i18n";
import { useMainStore } from '@/store/main';
import * as ekc from 'emi-keyboard-controller';
import PlainKey from "@/components/PlainKey.vue";
import KeyEditCell from '@/components/KeyEditCell.vue';

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();

const dynamic_key_stroke = defineModel<ekc.IDynamicKeyStroke4x4>("dynamicKey",{ 
  default: {
    type: ekc.DynamicKeyType.DynamicKeyStroke,
    keyBinding:[0,0,0,0],
    key_control:[0,0,0,0],
    press_begin_distance: 0.25, 
    press_fully_distance: 0.75,
    release_begin_distance: 0.75,
    release_fully_distance: 0.25,
  }
});

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

function cycleAction(key: number, index: number) {
  const current = getAction(key, index);
  const next = current === 0 ? 1 : (current === 1 ? 3 : 0);
  setAction(key, index, next);
}

function actionLabel(val: number) {
  if (val === 0) return t('dynamic_key_s_panel_deactivate');
  if (val === 1) return t('dynamic_key_s_panel_activate_once');
  if (val === 3) return t('dynamic_key_s_panel_keep_activating');
  return '';
}

</script>
<template>
  <n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
    
    <n-form-item :label="t('key')">
      <div v-if="dynamic_key_stroke?.target_keys_location?.length > 0" class="keyboard no-select" style="height: 54px;">
        <PlainKey 
          v-for="(item,index) in dynamic_key_stroke.target_keys_location" 
          :key="index" :width="1" :height="1" :x="index"
          :labels="['Layer '+ (item?.layer ?? '?'),,,,,, (item?.id ?? '?')]"
        ></PlainKey>
      </div>
      <div v-else style="height: 54px; display: flex; align-items: center;">
        <span style="color: var(--n-text-color-3); font-size: 13px;">* {{ t('common_please_select_key') }}</span>
      </div>
    </n-form-item>

    <n-form-item :label="t('dynamic_key_s_panel_key_control')">
      <n-table :single-line="false" size="small" style="text-align: center; vertical-align: middle;">
        
        <thead>
          <tr>
            <th style="width: 80px; text-align: center; vertical-align: bottom; padding-bottom: 12px; background-color: var(--n-th-color);">
              {{ t('dynamic_key_s_panel_key_bindings') }}
            </th>
            <th style="text-align: center; padding: 8px;">
              <div style="margin-bottom: 8px;">{{ t('dynamic_key_s_panel_press_begin') }}</div>
              <n-input-number size="small" v-model:value="press_begin_distance" :min="0" :max="100" style="text-align: left;">
                <template #suffix>%</template>
              </n-input-number>
            </th>
            <th style="text-align: center; padding: 8px;">
              <div style="margin-bottom: 8px;">{{ t('dynamic_key_s_panel_press_fully') }}</div>
              <n-input-number size="small" v-model:value="press_fully_distance" :min="0" :max="100" style="text-align: left;">
                <template #suffix>%</template>
              </n-input-number>
            </th>
            <th style="text-align: center; padding: 8px;">
              <div style="margin-bottom: 8px;">{{ t('dynamic_key_s_panel_release_begin') }}</div>
              <n-input-number size="small" v-model:value="release_begin_distance" :min="0" :max="100" style="text-align: left;">
                <template #suffix>%</template>
              </n-input-number>
            </th>
            <th style="text-align: center; padding: 8px;">
              <div style="margin-bottom: 8px;">{{ t('dynamic_key_s_panel_release_fully') }}</div>
              <n-input-number size="small" v-model:value="release_fully_distance" :min="0" :max="100" style="text-align: left;">
                <template #suffix>%</template>
              </n-input-number>
            </th>
          </tr>
        </thead>
        
        <tbody>
          <tr v-for="keyIndex in [0, 1, 2, 3]" :key="keyIndex">
            
            <td style="background-color: var(--n-td-color-hover); padding: 8px; vertical-align: middle;">
              <div class="keyboard no-select" style="position: relative; height: 54px; width: 54px; margin: 0 auto;">
                <KeyEditCell :x="0" :y="0"
                  v-model:value="dynamic_key_stroke.bindings[keyIndex]">
                </KeyEditCell>
              </div>
            </td>
            
            <td v-for="stageIndex in [0, 1, 2, 3]" :key="stageIndex" style="padding: 12px 8px; vertical-align: middle;">
              <n-button 
                size="small" 
                style="width: 100%; transition: all 0.2s;"
                :type="getAction(keyIndex, stageIndex) === 3 ? 'primary' : (getAction(keyIndex, stageIndex) === 1 ? 'info' : 'default')"
                :dashed="getAction(keyIndex, stageIndex) === 0"
                :secondary="getAction(keyIndex, stageIndex) === 1"
                @click="cycleAction(keyIndex, stageIndex)"
              >
                {{ actionLabel(getAction(keyIndex, stageIndex)) }}
              </n-button>
            </td>
            
          </tr>
        </tbody>
        
      </n-table>
    </n-form-item>

  </n-form>
</template>

<style scoped>
</style>