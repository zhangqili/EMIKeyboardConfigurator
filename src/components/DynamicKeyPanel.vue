<script setup lang="ts">
import { computed, h, onMounted, ref, triggerRef } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyboardTracker from './KeyboardTracker.vue';
import KeySelector from './KeySelector.vue';
import DynamicKeyStrokePanel from './DynamicKeyStrokePanel.vue';
import DynamicKeyModTapPanel from './DynamicKeyModTapPanel.vue';
import DynamicKeyMutexPanel from './DynamicKeyMutexPanel.vue';
import DynamicKeyToggleKeyPanel from './DynamicKeyToggleKeyPanel.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels, mapDynamicKey } from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

const { t } = useI18n();

const message = useMessage();


const store = useMainStore();
const { key_binding, dynamic_keys, current_layer, keymap, advanced_keys, dynamic_key, dynamic_key_index} = storeToRefs(store);

const dynamic_key_types =
  [
    {
      value: ekc.DynamicKeyType.DynamicKeyStroke,
      key: ekc.DynamicKeyType.DynamicKeyStroke,
      label: 'Dynamic Key Stroke'
    },
    {
      value: ekc.DynamicKeyType.DynamicKeyModTap,
      key: ekc.DynamicKeyType.DynamicKeyModTap,
      label: 'Mod Tap'
    },
    {
      value: ekc.DynamicKeyType.DynamicKeyToggleKey,
      key: ekc.DynamicKeyType.DynamicKeyToggleKey,
      label: 'Toggle Key'
    },
    {
      value: ekc.DynamicKeyType.DynamicKeyMutex,
      key: ekc.DynamicKeyType.DynamicKeyMutex,
      label: 'Mutex Key'
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
  dynamic_key.value.target_keys_location.forEach((item,index)=>{
    if (keymap.value != undefined) {
      keymap.value[item.layer][item.id] = dynamic_key.value.bindings[index];
    }
  });
  dynamic_keys.value[index] = new ekc.DynamicKey();
  if (keymap.value != undefined) {
    mapDynamicKey(keymap.value, dynamic_keys.value);
  }
}

function editDynamicKey(index : number)
{
  edit_mode = true;
  dynamic_key_cache = JSON.parse(JSON.stringify(dynamic_keys.value[index]));
  dynamic_key.value = dynamic_keys.value[index];
  dynamic_key_index.value = index;
}

function createColumns({
  execute
}: {
    execute: (row: DynamicKeyRow) => void
}): DataTableColumns<DynamicKeyRow> {
  return [
    {
      title: 'Index',
      key: 'index'
    },
    {
      title: 'Type',
      key: 'type'
    },
    {
      title: 'Bindings',
      key: 'bindings',
      render(row) {
        const keys = row.bindings.map((binding, index) => {
          return h(
            Key,
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
      title: 'Action',
      key: 'actions',
      render(row) {
        return [h(
          NButton,
          {
            onClick: () => editDynamicKey(row.index)
          },
          { default: () => 'Edit' },
        ),
        h(
          NButton,
          {
            onClick: () => deleteDynamicKey(row.index)
          },
          { default: () => 'Delete' },
        )]
      }
    }
  ]
}

const action_options = [
        {
          label: 'Deactivate',
          value: 'deactivate'
        },
        {
          label: 'Activate once',
          value: 'activate_once'
        },
        {
          label: 'Keep activating',
          value: 'keep_activating'
        }
      ];

const columns = createColumns({
        execute(row: DynamicKeyRow) {
          message.info(`Play ${row.index}`)
        }
      });

function handleDynamicTypeSelection(key: string, item: MenuOption) 
{
  edit_mode = false;
  dynamic_key_index.value = dynamic_keys.value.findIndex(item => item.type == ekc.DynamicKeyType.DynamicKeyNone);
  switch (item.key) {
    case ekc.DynamicKeyType.DynamicKeyStroke:
      dynamic_key.value = new ekc.DynamicKeyStroke4x4();
      break;
    case ekc.DynamicKeyType.DynamicKeyModTap:
      dynamic_key.value = new ekc.DynamicKeyModTap();
      break;
    case ekc.DynamicKeyType.DynamicKeyToggleKey:
      dynamic_key.value = new ekc.DynamicKeyToggleKey();
      break;
    case ekc.DynamicKeyType.DynamicKeyMutex:
      dynamic_key.value = new ekc.DynamicKeyMutex();
      break;
    default:
      break;
  }
  dynamic_keys.value[dynamic_key_index.value] = dynamic_key.value;
}

function cancelDynamicKey() 
{
  if (edit_mode) {
    dynamic_keys.value[dynamic_key_index.value] = dynamic_key_cache;
  }
  else
  {
    deleteDynamicKey(dynamic_key_index.value);
  }
  dynamic_key.value = new ekc.DynamicKey();
  console.log(dynamic_key);
  if (keymap.value != undefined) {
    mapDynamicKey(keymap.value, dynamic_keys.value);
  }
}

function confirmDynamicKey() 
{
  dynamic_keys.value[dynamic_key_index.value] = dynamic_key.value;
  dynamic_key.value = new ekc.DynamicKey();
}

const data = computed<DynamicKeyRow[]>(
  ()=>{
    var dynamic_key_rows = new Array<DynamicKeyRow>();
    dynamic_keys.value.forEach((item,index)=>
    {
      switch (item.type) {
        case ekc.DynamicKeyType.DynamicKeyStroke:
          dynamic_key_rows.push({index: index,type: 'Dynamic Key Stroke', bindings: item.bindings});
          break;
        case ekc.DynamicKeyType.DynamicKeyModTap:
          dynamic_key_rows.push({index: index,type: 'Mod Tap', bindings: item.bindings});
          break;
        case ekc.DynamicKeyType.DynamicKeyToggleKey:
          dynamic_key_rows.push({index: index,type: 'Toggle Key', bindings: item.bindings});
          break;
        case ekc.DynamicKeyType.DynamicKeyMutex:
          dynamic_key_rows.push({index: index,type: 'Mutex', bindings: item.bindings});
          break;
        default:
          break;
      }
    });
    return dynamic_key_rows;
  }
);

const dynamic_key_mt = computed({
  get: () => dynamic_key.value as ekc.DynamicKeyModTap,
  set: (value) => dynamic_key.value = value
});
const dynamic_key_stroke = computed({
  get: () => dynamic_key.value as ekc.DynamicKeyStroke4x4,
  set: (value) => dynamic_key.value = value
});
const dynamic_key_tk = computed({
  get: () => dynamic_key.value as ekc.DynamicKeyToggleKey,
  set: (value) => dynamic_key.value = value
});
const dynamic_key_mutex= computed({
  get: () => dynamic_key.value as ekc.DynamicKeyMutex,
  set: (value) => dynamic_key.value = value
});

</script>
<template>
  <div style="flex: 1; display: flex; height: 100%;">
    <div style="flex: 1; display: flex; height: 100%;" v-if="dynamic_key?.type == ekc.DynamicKeyType.DynamicKeyNone">
      <n-card style="height: 100%; flex:400px;" title="Create a new dynamic key">
        <n-menu
          :options="dynamic_key_types" @update:value="handleDynamicTypeSelection">
        </n-menu>
      </n-card>
      <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;"
      title="Existing dynamic key">
        <n-scrollbar>
        <n-data-table
            :columns="columns" :data="data">
        </n-data-table>
        </n-scrollbar>
      </n-card>
    </div>
      <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyStroke"
        style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" title="Dynamic Key Stroke">
          <div style="flex: 1; display: flex; height: 100%;">
            <n-scrollbar style="flex: 1; overflow-y: auto;">
            <DynamicKeyStrokePanel v-model:dynamic_key="dynamic_key_stroke"></DynamicKeyStrokePanel>
            </n-scrollbar>
            <n-scrollbar style="flex: 1; overflow-y: auto;">
            <div>
              <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
              <n-divider></n-divider>
              <KeySelector v-model:binding="key_binding"></KeySelector>
            </div>
          </n-scrollbar>
          </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              Cancel
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              Confirm
          </n-button>
        </template>
      </n-card>
      <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyModTap"
        style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" title="Mod Tap">

        <div style="flex: 1; display: flex; height: 100%;">
          <n-scrollbar style="flex: 1; overflow-y: auto;">
            <DynamicKeyModTapPanel v-model:dynamic_key="dynamic_key_mt"></DynamicKeyModTapPanel>
          </n-scrollbar>
          <n-scrollbar style="flex: 1; overflow-y: auto;">
            <div>
              <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
              <n-divider></n-divider>
              <KeySelector v-model:binding="key_binding"></KeySelector>
            </div>
          </n-scrollbar>
        </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              Cancel
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              Confirm
          </n-button>
        </template>
      </n-card>
      <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyToggleKey"
        style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" title="Toggle Key">

        <div style="flex: 1; display: flex; height: 100%;">
          <n-scrollbar style="flex: 1; overflow-y: auto;">
            <DynamicKeyToggleKeyPanel v-model:dynamic_key="dynamic_key_tk"></DynamicKeyToggleKeyPanel>
          </n-scrollbar>
          <n-scrollbar style="flex: 1; overflow-y: auto;">
          <div style="flex: 1; overflow-y: auto;">
            <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
            <n-divider></n-divider>
            <KeySelector v-model:binding="key_binding"></KeySelector>
          </div>
          </n-scrollbar>
        </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              Cancel
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              Confirm
          </n-button>
        </template>
      </n-card>
      <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyMutex"
      style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;" title="Mutex Key">
      <div style="flex: 1; display: flex; height: 100%;">
        <n-scrollbar style="flex: 1; overflow-y: auto;">
          <DynamicKeyMutexPanel v-model:dynamic_key="dynamic_key_mutex"></DynamicKeyMutexPanel>
        </n-scrollbar>
        <n-scrollbar style="flex: 1; overflow-y: auto;">
          <div>
            <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
            <n-divider></n-divider>
            <KeySelector v-model:binding="key_binding"></KeySelector>
          </div>

        </n-scrollbar>
        </div>
        <template #header-extra>
          <n-button style="margin-left: 12px;" @click="cancelDynamicKey">
              Cancel
          </n-button>
          <n-button type="primary" style="margin-left: 12px;" @click="confirmDynamicKey">
              Confirm
          </n-button>
        </template>
      </n-card>
  </div>
</template>

<style scoped>

</style>