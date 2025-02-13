<script setup lang="ts">
import { computed, h, ref } from 'vue'
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
import { keyBindingModifierToString, keyCodeToKeyName, keyModifierToKeyName, keyCodeToString } from "../apis/utils";
import { KeyCode } from 'emi-keyboard-controller';
import * as ekc from 'emi-keyboard-controller';
import Key from "./Key.vue";

const { t } = useI18n();

const message = useMessage();

const dynamic_key = ref<ekc.IDynamicKey>();

const store = useMainStore();
const { key_binding, selected_layer, keymap, advanced_keys } = storeToRefs(store);

const dynamic_key_type = ref<ekc.DynamicKeyType>(ekc.DynamicKeyType.DynamicKeyStroke);

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
  bindings: string[]
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
        const tags = row.bindings.map((tagKey) => {
          return h(
            NTag,
            {
              style: {
                marginRight: '6px'
              },
              type: 'info',
              bordered: false
            },
            {
              default: () => tagKey
            }
          )
        })
        return tags
      }
    },
    {
      title: 'Action',
      key: 'actions',
      render(row) {
        return h(
          NButton,
          {
            strong: true,
            tertiary: true,
            size: 'small',
            onClick: () => execute(row)
          },
          { default: () => 'Execute' }
        )
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
  switch (item.key) {
    case ekc.DynamicKeyType.DynamicKeyStroke:
      dynamic_key;
      break;
    case ekc.DynamicKeyType.DynamicKeyModTap:
      
      break;
    case ekc.DynamicKeyType.DynamicKeyToggleKey:
      
      break;
    case ekc.DynamicKeyType.DynamicKeyMutex:
      
      break;
  
    default:
      break;
  }
  dynamic_key.value = {type: item.key} as ekc.IDynamicKey;
}

function resetDynamicKey() 
{
  dynamic_key.value = undefined;
}

const trigger_begin_distance = computed<number>({
  get: () => (Math.round((dynamic_key.value as ekc.IDynamicKeyStroke4x4).press_begin_distance * 1000) / 10),
  set: (value: number) => {
    (dynamic_key.value as ekc.IDynamicKeyStroke4x4).press_begin_distance = isNaN(value) ? 0 : Math.round(value * 10) / 1000;
  },
});

</script>
<template>
<!--     <n-radio-group v-model:value="dynamic_key_type" name="radiobuttongroup1">
      <n-radio-button v-for="mode in dynamic_key_types" :key="mode.value" :value="mode.value" :label="mode.label" />
    </n-radio-group> -->
    <div style="flex: 1" v-if="dynamic_key?.type == ekc.DynamicKeyType.DynamicKeyNone || dynamic_key == undefined">
      <n-layout has-sider>
        <n-layout-sider>
          <n-card title="Create a new dynamic key">
            <n-menu
              :options="dynamic_key_types" @update:value="handleDynamicTypeSelection">
            </n-menu>
          </n-card>
        </n-layout-sider>
        <n-layout-content>
          <n-card title="Existing dynamic key">
            <n-data-table
                :columns="columns">
            </n-data-table>
          </n-card>
        </n-layout-content>
      </n-layout>
    </div>
    <div style="flex: 1; display: flex; flex-direction: column;" v-if="!(dynamic_key?.type == ekc.DynamicKeyType.DynamicKeyNone || dynamic_key == undefined)">
      <div style="flex: 1; display: flex; flex-direction: column;">
        <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyStroke"
            content-style="flex: 1; display: flex;" title="Dynamic Key Stroke">
            <DynamicKeyStrokePanel style="flex: 1;"></DynamicKeyStrokePanel>
            <div style="flex: 1;">
              <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
              <n-divider></n-divider>
              <KeySelector v-model:binding="key_binding"></KeySelector>
            </div>
          <template #header-extra>
            <n-button style="margin-left: 12px;" @click="resetDynamicKey">
                Cancel
            </n-button>
            <n-button style="margin-left: 12px;">
                Add
            </n-button>
          </template>
        </n-card>
        <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyModTap"
          content-style="flex: 1; display: flex;" title="Mod Tap">
          <DynamicKeyModTapPanel style="flex: 1;"></DynamicKeyModTapPanel>
          <div style="flex: 1;">
            <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
            <n-divider></n-divider>
            <KeySelector v-model:binding="key_binding"></KeySelector>
          </div>
          <template #header-extra>
            <n-button style="margin-left: 12px;" @click="resetDynamicKey">
                Cancel
            </n-button>
            <n-button style="margin-left: 12px;">
                Add
            </n-button>
          </template>
        </n-card>
        <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyToggleKey"
          content-style="flex: 1; display: flex;" title="Toggle Key">
          <DynamicKeyToggleKeyPanel style="flex: 1;"></DynamicKeyToggleKeyPanel>
          <div style="flex: 1;">
              <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
              <n-divider></n-divider>
              <KeySelector v-model:binding="key_binding"></KeySelector>
            </div>
          <template #header-extra>
            <n-button style="margin-left: 12px;" @click="resetDynamicKey">
                Cancel
            </n-button>
            <n-button style="margin-left: 12px;">
                Add
            </n-button>
          </template>
        </n-card>
        <n-card v-if="dynamic_key.type === ekc.DynamicKeyType.DynamicKeyMutex"
          content-style="flex: 1; display: flex;" title="Mutex Key">
          <DynamicKeyMutexPanel style="flex: 1;"></DynamicKeyMutexPanel>
          <div style="flex: 1;">
              <KeyboardTracker v-model:binding="key_binding"></KeyboardTracker>
              <n-divider></n-divider>
              <KeySelector v-model:binding="key_binding"></KeySelector>
            </div>
          <template #header-extra>
            <n-button style="margin-left: 12px;" @click="resetDynamicKey">
                Cancel
            </n-button>
            <n-button style="margin-left: 12px;">
                Add
            </n-button>
          </template>
        </n-card>
      </div>
    </div>
</template>

<style scoped>
.light-green {
  height: 108px;
  background-color: rgba(0, 128, 0, 0.12);
}
.green {
  height: 108px;
  background-color: rgba(0, 128, 0, 0.24);
}
</style>