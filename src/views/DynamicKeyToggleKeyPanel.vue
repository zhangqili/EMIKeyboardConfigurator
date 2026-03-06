<script setup lang="ts">
import { computed, h, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';
import PlainKey from "@/components/PlainKey.vue";
import KeyEditCell from '@/components/KeyEditCell.vue';

const { t } = useI18n();

const message = useMessage();


const dynamic_key_tk = defineModel<ekc.IDynamicKeyToggleKey>("dynamicKey",{ 
  default: {
    keyBinding: 0,
  }
});

</script>
<template>
<n-form label-placement="top" label-width="auto" require-mark-placement="right-hanging">
    <n-form-item :label="t('key')">
      <div class="keyboard no-select" style="height: 54px;">
        <PlainKey v-for="(item,index) in dynamic_key_tk.target_keys_location" :width="1" :height="1" :x=index
      :labels="['Layer '+item.layer.toString(),,,,,,item.id.toString()]"></PlainKey>
      </div>
    </n-form-item>
    <n-form-item :label="t('dynamic_key_tk_panel_key_bindings')">
      <div class="keyboard no-select" style="height: 54px;">
        <KeyEditCell v-for="(item,index) in dynamic_key_tk.bindings" :width="1" :height="1" :x=index
          v-model:value="dynamic_key_tk.bindings[index]"></KeyEditCell>
      </div>
    </n-form-item>
  </n-form>
</template>

<style scoped>
</style>