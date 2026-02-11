<script setup lang="ts">
import { computed, h, onMounted, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from './KeyTracker.vue';
import KeySelector from './KeySelector.vue';
import DynamicKeyStrokePanel from './DynamicKeyStrokePanel.vue';
import DynamicKeyModTapPanel from './DynamicKeyModTapPanel.vue';
import DynamicKeyMutexPanel from './DynamicKeyMutexPanel.vue';
import DynamicKeyToggleKeyPanel from './DynamicKeyToggleKeyPanel.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels, mapDynamicKey } from "../apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import PlainKey from "./PlainKey.vue";
import { cloneDeep } from 'lodash';
import KeyEditCell from './KeyEditCell.vue';

const { t } = useI18n();

const message = useMessage();


const store = useMainStore();
const { keyBinding, dynamicKeys, currentLayerIndex, keymap, advancedKeys, dynamicKey, dynamicKeyIndex} = storeToRefs(store);

const dynamic_key_types =
  [
    {
      value: ekc.DynamicKeyType.DynamicKeyStroke,
      key: ekc.DynamicKeyType.DynamicKeyStroke,
      label: t('dynamic_key_panel_dks')
    },
    {
      value: ekc.DynamicKeyType.DynamicKeyModTap,
      key: ekc.DynamicKeyType.DynamicKeyModTap,
      label: t('dynamic_key_panel_mt')
    },
    {
      value: ekc.DynamicKeyType.DynamicKeyToggleKey,
      key: ekc.DynamicKeyType.DynamicKeyToggleKey,
      label: t('dynamic_key_panel_tk')
    },
    {
      value: ekc.DynamicKeyType.DynamicKeyMutex,
      key: ekc.DynamicKeyType.DynamicKeyMutex,
      label: t('dynamic_key_panel_mutex')
    }
  ].map((s) => {
    return s;
  });

interface DynamicKeyRow {
  index: number
  type: string
  bindings: number[]
}

var edit_mode : boolean = false;
var dynamic_key_cache : ekc.IDynamicKey;
function deleteDynamicKey(index : number)
{
  dynamicKey.value.target_keys_location.forEach((item,index)=>{
    if (keymap.value != undefined) {
      keymap.value[item.layer][item.id] = dynamicKey.value.bindings[index];
    }
  });
  dynamicKeys.value[index] = new ekc.DynamicKey();
  if (keymap.value != undefined) {
    mapDynamicKey(keymap.value, dynamicKeys.value);
  }
}

function editDynamicKey(index : number)
{
  edit_mode = true;
  dynamic_key_cache = cloneDeep(dynamicKeys.value[index]);
  dynamicKey.value = dynamicKeys.value[index];
  dynamicKeyIndex.value = index;
}

function createColumns({
  execute
}: {
    execute: (row: DynamicKeyRow) => void
}): DataTableColumns<DynamicKeyRow> {
  return [
    {
      title: t('dynamic_key_panel_index'),
      key: 'index'
    },
    {
      title: t('dynamic_key_panel_type'),
      key: 'type'
    },
    {
      title: t('dynamic_key_panel_bindings'),
      key: 'bindings',
      render(row) {
        const keys = row.bindings.map((binding, index) => {
          return h(
            PlainKey,
            {
              width:1,
              height:1,
              x:index,
              labels: keyCodeToStringLabels(binding),
            }
          )
        })
        return h(
            'div',
            {
              style: "height: 54px; width: 224px;"
            },
            keys
          )
      }
    },
    {
      title: t('dynamic_key_panel_actions'),
      key: 'actions',
      render(row) {
        return [h(
          NButton,
          {
            onClick: () => editDynamicKey(row.index)
          },
          { default: () => t('edit') },
        ),
        h(
          NButton,
          {
            onClick: () => deleteDynamicKey(row.index)
          },
          { default: () => t('delete') },
        )]
      }
    }
  ]
}

const columns = computed(()=> createColumns({
        execute(row: DynamicKeyRow) {
          message.info(`Play ${row.index}`)
        }
      }));

function handleDynamicTypeSelection(key: string, item: MenuOption) 
{
  edit_mode = false;
  dynamicKeyIndex.value = dynamicKeys.value.findIndex(item => item.type == ekc.DynamicKeyType.DynamicKeyNone);
  switch (item.key) {
    case ekc.DynamicKeyType.DynamicKeyStroke:
      dynamicKey.value = new ekc.DynamicKeyStroke4x4();
      break;
    case ekc.DynamicKeyType.DynamicKeyModTap:
      dynamicKey.value = new ekc.DynamicKeyModTap();
      break;
    case ekc.DynamicKeyType.DynamicKeyToggleKey:
      dynamicKey.value = new ekc.DynamicKeyToggleKey();
      break;
    case ekc.DynamicKeyType.DynamicKeyMutex:
      dynamicKey.value = new ekc.DynamicKeyMutex();
      break;
    default:
      break;
  }
  dynamicKeys.value[dynamicKeyIndex.value] = dynamicKey.value;
}

function cancelDynamicKey() 
{
  if (edit_mode) {
    dynamicKeys.value[dynamicKeyIndex.value] = dynamic_key_cache;
  }
  else
  {
    deleteDynamicKey(dynamicKeyIndex.value);
  }
  dynamicKey.value = new ekc.DynamicKey();
  console.debug(dynamicKey);
  if (keymap.value != undefined) {
    mapDynamicKey(keymap.value, dynamicKeys.value);
  }
}

function confirmDynamicKey() 
{
  dynamicKeys.value[dynamicKeyIndex.value] = dynamicKey.value;
  dynamicKey.value = new ekc.DynamicKey();
}

const data = computed<DynamicKeyRow[]>(
  ()=>{
    var dynamic_key_rows = new Array<DynamicKeyRow>();
    dynamicKeys.value.forEach((item,index)=>
    {
      switch (item.type) {
        case ekc.DynamicKeyType.DynamicKeyStroke:
          dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_dks'), bindings: item.bindings});
          break;
        case ekc.DynamicKeyType.DynamicKeyModTap:
          dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_mt'), bindings: item.bindings});
          break;
        case ekc.DynamicKeyType.DynamicKeyToggleKey:
          dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_tk'), bindings: item.bindings});
          break;
        case ekc.DynamicKeyType.DynamicKeyMutex:
          dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_mutex'), bindings: item.bindings});
          break;
        default:
          break;
      }
    });
    return dynamic_key_rows;
  }
);

const dynamic_key_mt = computed({
  get: () => dynamicKey.value as ekc.DynamicKeyModTap,
  set: (value) => dynamicKey.value = value
});
const dynamic_key_stroke = computed({
  get: () => dynamicKey.value as ekc.DynamicKeyStroke4x4,
  set: (value) => dynamicKey.value = value
});
const dynamic_key_tk = computed({
  get: () => dynamicKey.value as ekc.DynamicKeyToggleKey,
  set: (value) => dynamicKey.value = value
});
const dynamic_key_mutex= computed({
  get: () => dynamicKey.value as ekc.DynamicKeyMutex,
  set: (value) => dynamicKey.value = value
});

</script>
<template>
  <div style="flex: 1; display: flex; height: 100%;">
    <div style="flex: 1; display: flex; height: 100%;" v-if="dynamicKey?.type == ekc.DynamicKeyType.DynamicKeyNone">
      <n-card style="height: 100%; flex:400px;" :title="t('dynamic_key_panel_main_title')">
        <n-menu
          :options="dynamic_key_types" @update:value="handleDynamicTypeSelection">
        </n-menu>
      </n-card>
      <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;"
      :title="t('dynamic_key_panel_sub_title')">
        <n-scrollbar>
        <n-data-table
            :columns="columns" :data="data">
        </n-data-table>
        </n-scrollbar>
      </n-card>
    </div>
      <n-card v-if="dynamicKey.type === ekc.DynamicKeyType.DynamicKeyStroke"
        style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" :title="t('dynamic_key_panel_dks')">
          <div style="flex: 1; display: flex; height: 100%;">
            <n-scrollbar style="flex: 1; overflow-y: auto;">
            <DynamicKeyStrokePanel v-model:dynamicKey="dynamic_key_stroke"></DynamicKeyStrokePanel>
            </n-scrollbar>
          </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              {{ t('cancel') }}
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              {{ t('confirm') }}
          </n-button>
        </template>
      </n-card>
      <n-card v-if="dynamicKey.type === ekc.DynamicKeyType.DynamicKeyModTap"
        style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" :title="t('dynamic_key_panel_mt')">

        <div style="flex: 1; display: flex; height: 100%;">
          <n-scrollbar style="flex: 1; overflow-y: auto;">
            <DynamicKeyModTapPanel v-model:dynamicKey="dynamic_key_mt"></DynamicKeyModTapPanel>
          </n-scrollbar>
        </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              {{ t('cancel') }}
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              {{ t('confirm') }}
          </n-button>
        </template>
      </n-card>
      <n-card v-if="dynamicKey.type === ekc.DynamicKeyType.DynamicKeyToggleKey"
        style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" :title="t('dynamic_key_panel_tk')">

        <div style="flex: 1; display: flex; height: 100%;">
          <n-scrollbar style="flex: 1; overflow-y: auto;">
            <DynamicKeyToggleKeyPanel v-model:dynamicKey="dynamic_key_tk"></DynamicKeyToggleKeyPanel>
          </n-scrollbar>
        </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              {{ t('cancel') }}
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              {{ t('confirm') }}
          </n-button>
        </template>
      </n-card>
      <n-card v-if="dynamicKey.type === ekc.DynamicKeyType.DynamicKeyMutex"
      style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" :title="t('dynamic_key_panel_mutex')">
      <div style="flex: 1; display: flex; height: 100%;">
        <n-scrollbar style="flex: 1; overflow-y: auto;">
          <DynamicKeyMutexPanel v-model:dynamicKey="dynamic_key_mutex"></DynamicKeyMutexPanel>
        </n-scrollbar>
        </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              {{ t('cancel') }}
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              {{ t('confirm') }}
          </n-button>
        </template>
      </n-card>
  </div>
</template>

<style scoped>

</style>