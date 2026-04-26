<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { useI18n } from "vue-i18n";
import { useMainStore } from '@/store/main';
import * as ekc from 'emi-keyboard-controller';
import PlainKey from "@/components/PlainKey.vue";
import KeyEditCell from '@/components/KeyEditCell.vue';

const { t } = useI18n();

const message = useMessage();

const store = useMainStore();

const dynamic_key_mutex = defineModel<ekc.IDynamicKeyMutex>("dynamicKey",{ 
  default: {
    key:[
      {
        binding: 0,
        id:0
      },
      {
        binding: 0,
        id:0
      }
    ],
    mode: ekc.DynamicKeyMutexMode.DKMutexDistancePriority,
  }
});

const dynamic_key_mutex_modes = computed(()=>
  [
    {
      value: ekc.DynamicKeyMutexMode.DKMutexDistancePriority,
      label: t('dynamic_key_mutex_panel_distance')
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexLastPriority,
      label: t('dynamic_key_mutex_panel_last_trigger')
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexKey1Priority,
      label: t('dynamic_key_mutex_panel_key1')
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexKey2Priority,
      label: t('dynamic_key_mutex_panel_key2')
    },
    {
      value: ekc.DynamicKeyMutexMode.DKMutexNeutral,
      label: t('dynamic_key_mutex_panel_neutral')
    }
  ].map((s) => {
    return s;
  })
);

const dynamic_key_mutex_mode = computed<ekc.DynamicKeyMutexMode>({
  get: () => (dynamic_key_mutex.value.mode&0x0F),
  set: (value: ekc.DynamicKeyMutexMode) => {
    dynamic_key_mutex.value.mode &= 0xF0;
    dynamic_key_mutex.value.mode |= value&0x0F;
    triggerRef(dynamic_key_mutex);
  },
});

const dynamic_key_mutex_switch = computed<boolean>({
  get: () => ((dynamic_key_mutex.value.mode&0xF0)>0),
  set: (value: boolean) => {
    dynamic_key_mutex.value.mode &= 0x0F;
    dynamic_key_mutex.value.mode |= value ? 0xF0 : 0x00;
    triggerRef(dynamic_key_mutex);
  },
});

</script>
<template>
<n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
  <n-form-item :label="t('key')">
    <div v-if="dynamic_key_mutex?.target_keys_location?.length > 0" class="keyboard no-select" style="height: 54px; width: 108px; position: relative;">
      
      <PlainKey 
        v-for="(item,index) in dynamic_key_mutex.target_keys_location" 
        :key="index" :width="1" :height="1" :x="index"
        :labels="['Layer ' + (item?.layer ?? '?'), , , , , , (item?.id ?? '?')]"
      ></PlainKey>

      <div v-if="dynamic_key_mutex.target_keys_location.length === 1" 
           style="position: absolute; left: 54px; top: 0; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--n-border-color); border-radius: 4px; box-sizing: border-box;">
        <span style="color: var(--n-text-color-3); font-size: 12px; text-align: center; line-height: 1.2;">
          {{ t('dynamic_key_mutex_panel_select') }}<br/>{{ t('dynamic_key_mutex_panel_key2') }}
        </span>
      </div>

    </div>
    
    <div v-else style="height: 54px; display: flex; align-items: center;">
      <span style="color: var(--n-text-color-3); font-size: 13px;">{{ t('dynamic_key_mutex_panel_please_select_2_keys') }}</span>
    </div>
  </n-form-item>
  <n-form-item :label="t('dynamic_key_mutex_panel_priority_mode')">
    <n-radio-group v-model:value="dynamic_key_mutex_mode" name="radiobuttongroup1">
      <n-radio-button v-for="mode in dynamic_key_mutex_modes" :key="mode.value" :value="mode.value" :label="mode.label" />
    </n-radio-group> 
  </n-form-item>
  <n-form-item :label="t('dynamic_key_mutex_panel_always')">
    <n-switch v-model:value="dynamic_key_mutex_switch"/>
  </n-form-item>
  <n-form-item :label="t('dynamic_key_mutex_panel_key_bindings')">
    <div class="keyboard no-select" style="height: 54px;">
      <KeyEditCell v-for="(item,index) in dynamic_key_mutex.bindings" :x=index
        v-model:value="dynamic_key_mutex.bindings[index]"></KeyEditCell>
    </div>
  </n-form-item>
</n-form>
</template>

<style scoped>
</style>