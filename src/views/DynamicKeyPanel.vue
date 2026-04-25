<script setup lang="ts">
import { computed, h, onMounted, inject, type Ref, ref, triggerRef, watch } from 'vue'
import { DataTableColumns, MenuOption, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import KeyTracker from '@/components/KeyTracker.vue';
import KeySelector from '@/components/KeySelector.vue';
import DynamicKeyStrokePanel from '@/views/DynamicKeyStrokePanel.vue';
import DynamicKeyModTapPanel from '@/views/DynamicKeyModTapPanel.vue';
import DynamicKeyMutexPanel from '@/views/DynamicKeyMutexPanel.vue';
import DynamicKeyToggleKeyPanel from '@/views/DynamicKeyToggleKeyPanel.vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '@/store/main';
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString, keyCodeToStringLabels, mapDynamicKey } from "@/apis/utils";
import { Keycode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import PlainKey from "@/components/PlainKey.vue";
import { cloneDeep } from 'lodash';
import KeyEditCell from '@/components/KeyEditCell.vue';

const { t } = useI18n();
const message = useMessage();
const store = useMainStore();

interface KeyboardContext {
  advancedKeys: Ref<ekc.IAdvancedKey[]>;
  rgbConfigs: Ref<ekc.IRGBConfig[]>;
  keymap: Ref<number[][]>;
  dynamicKeys: Ref<ekc.IDynamicKey[]>;
  currentLayerIndex: Ref<number>;
  tabSelection: Ref<string | null>;
}

const { 
  advancedKeys,
  rgbConfigs, 
  keymap, 
  currentLayerIndex, 
  tabSelection,
  dynamicKeys
} = inject<KeyboardContext>('keyboardContext')!;

const dynamicKey = defineModel<ekc.IDynamicKey>("dynamicKey",{ 
  default: new ekc.DynamicKey()
});

const dynamicKeyIndex = defineModel<number>("dynamicKeyIndex",{ 
  required: true
});

const selectedKeys = defineModel<number[]>("selectedKeys", { 
  default: () => [] 
});

const dynamic_key_types = [
    { value: ekc.DynamicKeyType.DynamicKeyStroke, key: ekc.DynamicKeyType.DynamicKeyStroke, label: t('dynamic_key_panel_dks') },
    { value: ekc.DynamicKeyType.DynamicKeyModTap, key: ekc.DynamicKeyType.DynamicKeyModTap, label: t('dynamic_key_panel_mt') },
    { value: ekc.DynamicKeyType.DynamicKeyToggleKey, key: ekc.DynamicKeyType.DynamicKeyToggleKey, label: t('dynamic_key_panel_tk') },
    { value: ekc.DynamicKeyType.DynamicKeyMutex, key: ekc.DynamicKeyType.DynamicKeyMutex, label: t('dynamic_key_panel_mutex') }
];

interface DynamicKeyRow {
  index: number
  type: string
  bindings: number[]
}

var edit_mode : boolean = false;
var dynamic_key_cache : ekc.IDynamicKey;

// 深度监听当前编辑项：实现点击按键即时发光的"所见即所得"
watch(() => dynamicKey.value, (newDk) => {
  if (newDk && newDk.type !== ekc.DynamicKeyType.DynamicKeyNone) {
    selectedKeys.value = (newDk.target_keys_location || []).map((loc: any) => loc.id);
  } else {
    selectedKeys.value = [];
  }
}, { deep: true });

// 数据表格行事件：悬浮时高亮对应的按键
const rowProps = (row: DynamicKeyRow) => {
  return {
    onMouseenter: () => {
      // 只有在未进行编辑的情况下才响应悬浮，防止干扰编辑状态
      if (dynamicKey.value.type === ekc.DynamicKeyType.DynamicKeyNone) {
        const dk = dynamicKeys.value[row.index];
        if (dk && dk.target_keys_location) {
          selectedKeys.value = dk.target_keys_location.map((loc: any) => loc.id);
        }
      }
    },
    onMouseleave: () => {
      // 离开时清空高亮
      if (dynamicKey.value.type === ekc.DynamicKeyType.DynamicKeyNone) {
        selectedKeys.value = [];
      }
    }
  }
};

function compactDynamicKeys() {
  const validKeys = dynamicKeys.value.filter(item => {
    const type = item?.type;
    return type !== undefined && type !== 0 && type !== ekc.DynamicKeyType.DynamicKeyNone;
  });

  const totalSlots = dynamicKeys.value.length; 

  for (let i = 0; i < totalSlots; i++) {
    if (i < validKeys.length) {
      dynamicKeys.value[i] = validKeys[i];
    } else {
      dynamicKeys.value[i] = new ekc.DynamicKey();
    }
  }
}

function deleteDynamicKey(index : number)
{
  const targetDk = dynamicKeys.value[index];
  targetDk.target_keys_location.forEach((item, loc_index)=>{
    if (keymap.value != undefined) {
      keymap.value[item.layer][item.id] = targetDk.bindings[loc_index] || 0;
    }
  });
  dynamicKeys.value[index] = new ekc.DynamicKey();
  compactDynamicKeys();
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

function createColumns(): DataTableColumns<DynamicKeyRow> {
  return [
    { title: t('dynamic_key_panel_index'), key: 'index' },
    { title: t('dynamic_key_panel_type'), key: 'type' },
    {
      title: t('dynamic_key_panel_bindings'),
      key: 'bindings',
      render(row) {
        const keys = row.bindings.map((binding, index) => {
          return h(PlainKey, { width:1, height:1, x:index, labels: keyCodeToStringLabels(binding) })
        })
        return h('div', { style: "height: 54px; width: 224px;" }, keys)
      }
    },
    {
      title: t('dynamic_key_panel_actions'),
      key: 'actions',
      render(row) {
        return [
          h(NButton, { onClick: () => editDynamicKey(row.index) }, { default: () => t('edit') }),
          h(NButton, { onClick: () => deleteDynamicKey(row.index) }, { default: () => t('delete') })
        ]
      }
    }
  ]
}

const columns = computed(()=> createColumns());

function handleDynamicTypeSelection(key: string, item: MenuOption) 
{
  edit_mode = false;
  let targetIndex = dynamicKeys.value.findIndex(item => item.type == ekc.DynamicKeyType.DynamicKeyNone);
  let tempDynamicKey = new ekc.DynamicKey();
  switch (item.key) {
    case ekc.DynamicKeyType.DynamicKeyStroke: dynamicKey.value = new ekc.DynamicKeyStroke4x4(); break;
    case ekc.DynamicKeyType.DynamicKeyModTap: dynamicKey.value = new ekc.DynamicKeyModTap(); break;
    case ekc.DynamicKeyType.DynamicKeyToggleKey: dynamicKey.value = new ekc.DynamicKeyToggleKey(); break;
    case ekc.DynamicKeyType.DynamicKeyMutex: dynamicKey.value = new ekc.DynamicKeyMutex(); break;
    default: break;
  }
  dynamicKeys.value[targetIndex] = dynamicKey.value;
  dynamicKeyIndex.value = targetIndex;
}

function cancelDynamicKey() 
{
  if (edit_mode) {
    dynamicKeys.value[dynamicKeyIndex.value] = dynamic_key_cache;
  }
  else {
    deleteDynamicKey(dynamicKeyIndex.value);
  }
  dynamicKey.value = new ekc.DynamicKey();
  if (keymap.value != undefined) {
    mapDynamicKey(keymap.value, dynamicKeys.value);
  }
}

function confirmDynamicKey() 
{
  dynamicKeys.value[dynamicKeyIndex.value] = dynamicKey.value;
  dynamicKey.value = new ekc.DynamicKey();
}

const data = computed<DynamicKeyRow[]>(() => {
    var dynamic_key_rows : Array<DynamicKeyRow> = [];
    dynamicKeys.value.forEach((item,index) => {
      switch (item.type) {
        case ekc.DynamicKeyType.DynamicKeyStroke: dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_dks'), bindings: item.bindings}); break;
        case ekc.DynamicKeyType.DynamicKeyModTap: dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_mt'), bindings: item.bindings}); break;
        case ekc.DynamicKeyType.DynamicKeyToggleKey: dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_tk'), bindings: item.bindings}); break;
        case ekc.DynamicKeyType.DynamicKeyMutex: dynamic_key_rows.push({index: index,type: t('dynamic_key_panel_mutex'), bindings: item.bindings}); break;
        default: break;
      }
    });
    return dynamic_key_rows;
});

const dynamic_key_mt = computed({ get: () => dynamicKey.value as ekc.DynamicKeyModTap, set: (value) => dynamicKey.value = value });
const dynamic_key_stroke = computed({ get: () => dynamicKey.value as ekc.DynamicKeyStroke4x4, set: (value) => dynamicKey.value = value });
const dynamic_key_tk = computed({ get: () => dynamicKey.value as ekc.DynamicKeyToggleKey, set: (value) => dynamicKey.value = value });
const dynamic_key_mutex = computed({ get: () => dynamicKey.value as ekc.DynamicKeyMutex, set: (value) => dynamicKey.value = value });

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
            :columns="columns" :data="data" :row-props="rowProps">
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