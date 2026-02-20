<script setup lang="ts">
import { computed, h, ref, nextTick, watch, onMounted } from 'vue'
import { useI18n } from "vue-i18n";
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import * as ekc from 'emi-keyboard-controller';
import { NButton, NInputNumber, NSelect, NCard, NScrollbar, NCheckbox, NList, NListItem, useMessage, NTooltip } from 'naive-ui'
import KeyEditCell from './KeyEditCell.vue';

const { t } = useI18n();
const message = useMessage();
const store = useMainStore();
const { macros } = storeToRefs(store);

export interface IMacroAction {
    delay: number;
    keycode: number;
    event: number;
    is_virtual: boolean;
    key_id: number;
}

interface UIMacroRow extends IMacroAction {
  uuid: number;
}

const MAX_MACRO_LENGTH = 128;
const isInternalUpdate = ref(false);
// ... (宏数据管理逻辑保持不变) ...
const macroOptions = [0, 1, 2, 3].map(i => ({
  label: `${t('key_selector_macro') || 'Macro'} ${i}`,
  value: i
}));
const currentMacroIndex = ref(0);
const createPlaceholderRow = (tickValue: number = 0): UIMacroRow => ({
  uuid: Date.now() + Math.random(),
  delay: tickValue,
  keycode: 0,
  event: 3,
  is_virtual: true,
  key_id: 0
});
const localMacroStore = ref<UIMacroRow[][]>(Array.from({ length: 4 }, () => []));
const currentRows = ref<UIMacroRow[]>([]);

function syncFromStore() {
  if (!macros.value) return;
  
  for (let i = 0; i < 4; i++) {
    const sourceActions = macros.value[i] || [];
    
    // 1. 寻找结束符的位置
    // 固件执行宏时，遇到 keycode=0 会停止。
    // 所以我们只关心数组开头到第一个 keycode=0 之间的部分。
    let validLength = sourceActions.findIndex(a => a.keycode === 0);
    
    // 如果没找到 0 (说明宏写满了 128 项)，则取全部
    if (validLength === -1) validLength = sourceActions.length;

    // 2. 截取有效数据
    const validActions = sourceActions.slice(0, validLength);

    // 3. 转换为 UI 格式
    const uiRows: UIMacroRow[] = validActions.map(action => ({
      ...action,
      uuid: Date.now() + Math.random() // 生成唯一ID
    }));
    
    // 4. 计算占位行的 delay (延续最后一个有效行的 delay)
    // 如果列表是空的，delay 为 0
    const maxDelay = uiRows.length > 0 ? Math.max(...uiRows.map(r => r.delay)) : 0;

    // 5. 始终在末尾添加一个占位行 (用于添加新动作)
    // 除非已经达到 128 满额限制 (128 = 127有效 + 1结束符，或者纯粹 UI 显示限制)
    // 这里我们允许显示占位行，但在编辑时通过 handleKeycodeUpdate 限制长度
    uiRows.push(createPlaceholderRow(maxDelay));
    
    localMacroStore.value[i] = uiRows;
  }
  
  currentRows.value = localMacroStore.value[currentMacroIndex.value];
}

// ... (syncToStore 保持不变) ...
function syncToStore() {
  // 1. 上锁
  isInternalUpdate.value = true;

  const cleanMacros: IMacroAction[][] = localMacroStore.value.map(rows => {
    const placeholder = rows.find(r => r.keycode === 0);
    let validRows = rows
      .filter(r => r.keycode !== 0)
      .map(({ uuid, ...rest }) => ({ ...rest }));

    validRows.sort((a, b) => a.delay - b.delay);

    if (validRows.length >= MAX_MACRO_LENGTH) {
      validRows = validRows.slice(0, MAX_MACRO_LENGTH - 1);
    }

    const lastValidDelay = validRows.length > 0 ? validRows[validRows.length - 1].delay : 0;
    let terminatorDelay = placeholder ? placeholder.delay : lastValidDelay;
    
    if (terminatorDelay < lastValidDelay) {
      terminatorDelay = lastValidDelay;
    }

    validRows.push({
      delay: terminatorDelay,
      keycode: 0, 
      event: 1,
      is_virtual: false,
      key_id: 0
    });

    return validRows;
  });
  
  // 2. 写入 Store
  macros.value = cleanMacros;

  // 3. 【关键修改】解锁：使用 setTimeout 代替 nextTick
  // nextTick 太快了，会导致 watch(macros) 在解锁后才触发，从而导致死循环和 UUID 重生
  // 50ms 足够覆盖 Pinia 的传播延迟
  setTimeout(() => {
    isInternalUpdate.value = false;
  }, 50);
}

const maxValidDelay = computed(() => {
  const valid = currentRows.value.filter(r => r.keycode !== 0);
  return valid.length > 0 ? Math.max(...valid.map(r => r.delay)) : 0;
});
onMounted(() => { syncFromStore(); });
watch(currentMacroIndex, (newIndex) => {
  if (!localMacroStore.value[newIndex]) {
    localMacroStore.value[newIndex] = [createPlaceholderRow()];
  }
  currentRows.value = localMacroStore.value[newIndex];
});
watch(localMacroStore, () => { syncToStore(); }, { deep: true });
watch(maxValidDelay, (newMax) => {
  const placeholder = currentRows.value.find(r => r.keycode === 0);
  if (placeholder) {
    if (placeholder.delay < newMax) {
      placeholder.delay = newMax;
    }
  }
});
watch(macros, () => {
  // 如果是 UI 刚刚写入导致的 Store 变化，直接忽略，避免死循环
  if (isInternalUpdate.value) return;
  
  // 如果是外部（如下位机读取）导致的变化，执行同步
  syncFromStore();
}, { deep: true });

// ... (排序相关逻辑保持不变) ...
const sortOrder = ref<'asc' | 'desc'>('asc');
const columnsConfig = computed(() => [
  { title: t('macro_panel_tick') || 'Delay', width: '1fr', align: 'left' },
  { title: t('macro_panel_is_virtual') || 'Virtual', width: '60px', align: 'center' },
  { title: t('macro_panel_key_id'), width: '1fr', align: 'left' },
  { title: t('macro_panel_event'), width: '1fr', align: 'left' },
  { title: t('macro_panel_binding'), width: '54px', align: 'left' },
  { title: t('action') || 'Action', width: '70px', align: 'center' }
]);
const gridStyle = computed(() => ({
  '--grid-cols': columnsConfig.value.map(c => c.width).join(' '),
  '--row-gap': '12px'
}));


const displayData = computed(() => {
  const allRows = [...currentRows.value];
  
  allRows.sort((a, b) => {
    // 1. 优先按 Delay 排序
    const diff = a.delay - b.delay;
    if (diff !== 0) return sortOrder.value === 'asc' ? diff : -diff;
    
    // 2. 【核心修改】Delay 相同，占位行 (keycode 0) 必须排在最后 (Asc) 或最前 (Desc)
    // 假设是升序(asc)，我们希望占位行在底部 -> 权重最大
    const isAPlaceholder = a.keycode === 0;
    const isBPlaceholder = b.keycode === 0;
    
    if (isAPlaceholder && !isBPlaceholder) return sortOrder.value === 'asc' ? 1 : -1;
    if (!isAPlaceholder && isBPlaceholder) return sortOrder.value === 'asc' ? -1 : 1;

    // 3. 最后的兜底：按 UUID 排序，保证稳定性
    return sortOrder.value === 'asc' ? a.uuid - b.uuid : b.uuid - a.uuid;
  });

  return allRows;
});

// 【核心新增】判断列表是否已满
const isListFull = computed(() => currentRows.value.length >= MAX_MACRO_LENGTH);

const inputRefs = ref<Record<number, any>>({});
const setInputRef = (el: any, uuid: number) => { if (el) inputRefs.value[uuid] = el; };

// ... (helper functions) ...
function handleDelayUpdate(row: UIMacroRow, val: number | null) {
  if (val !== null) {
    // 如果是占位行，不允许小于最大有效值
    if (row.keycode === 0 && val < maxValidDelay.value) {
      row.delay = maxValidDelay.value;
    } else {
      row.delay = val;
    }
    
    nextTick(() => {
      const cmp = inputRefs.value[row.uuid];
      const nativeInput = cmp?.$el?.querySelector('input');
      const target = nativeInput || cmp;
      if (target?.focus) target.focus({ preventScroll: true });
    });
  }
}

function deleteRow(row: UIMacroRow) {
  const index = currentRows.value.findIndex(item => item.uuid === row.uuid);
  if (index !== -1) { delete inputRefs.value[row.uuid]; currentRows.value.splice(index, 1); }
}
function toggleSort() { sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'; }
function handleKeycodeUpdate(row: UIMacroRow, newValue: number) {
  const oldValue = row.keycode;
  if (oldValue === 0 && newValue !== 0) {
    // 双重保险：虽然UI禁用了，但逻辑层也检查一下
    if (currentRows.value.length >= MAX_MACRO_LENGTH) {
      message.warning(t('macro_limit_reached') || `Max ${MAX_MACRO_LENGTH} actions allowed`);
      nextTick(() => { row.keycode = 0; });
      return;
    }
    row.keycode = newValue;
    currentRows.value.push(createPlaceholderRow(row.delay));
  } else if (newValue === 0 && oldValue !== 0) {
    deleteRow(row);
  } else {
    row.keycode = newValue;
  }
}

function handleClear() {
  // 重置为单个占位行，且默认勾选 Virtual
  const newRow = createPlaceholderRow(0);
  // 确保重置的数组是全新的引用
  localMacroStore.value[currentMacroIndex.value] = [newRow];
  // 强制更新当前视图引用
  currentRows.value = localMacroStore.value[currentMacroIndex.value];
}
</script>

<template>
  <div style="flex: 1; display: flex; height: 100%;">
      <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-select v-model:value="currentMacroIndex" :options="macroOptions" size="small" style="width: 140px" />
              <span style="font-size: 12px; opacity: 0.6;">
                {{ currentRows.length - (currentRows[currentRows.length-1]?.keycode === 0 ? 1 : 0) }} / {{ MAX_MACRO_LENGTH - 1 }}
              </span>
            </div>
            <div style="display: flex; gap: 8px;">
              <n-button size="small" type="warning" secondary @click="handleClear">
                {{ t('clear') || 'Clear' }}
              </n-button>
              <n-button size="small" secondary @click="toggleSort">
                <template #icon>
                  <span v-if="sortOrder === 'asc'" style="font-size: 12px;">▼</span>
                  <span v-else style="font-size: 12px;">▲</span>
                </template>
                {{ sortOrder === 'asc' ? (t('sort_asc') || 'Delay Asc') : (t('sort_desc') || 'Delay Desc') }}
              </n-button>
            </div>
          </div>
        </template>

        <div class="list-container" :style="gridStyle">
          <n-scrollbar>
            <n-list hoverable clickable bordered class="custom-list">
              <template #header>
                <div class="grid-row header-text">
                  <div v-for="(col, index) in columnsConfig" :key="index" :style="{ justifyContent: col.align === 'center' ? 'center' : 'flex-start' }" style="display: flex;">
                    {{ col.title }}
                  </div>
                </div>
              </template>

              <TransitionGroup name="list" tag="div" class="list-transition-group">
                <n-list-item v-for="row in displayData" :key="row.uuid" class="list-item-row"
                  :style="{ opacity: (row.keycode === 0 && isListFull) ? 0.8 : 1 }"
                >
                  
                  <div class="grid-row">
                    
                    <div>
                      <n-input-number 
                        :ref="(el) => setInputRef(el, row.uuid)"
                        :value="row.delay" 
                        @update:value="(v) => handleDelayUpdate(row, v)"
                        size="small" :step="50"
                        :placeholder="row.keycode === 0 ? 'End' : ''"
                        :min="row.keycode === 0 ? maxValidDelay : 0"
                        :disabled="false" 
                      />
                    </div>

                    <div class="center-cell">
                      <n-checkbox 
                        v-model:checked="row.is_virtual" 
                        :disabled="row.keycode === 0" 
                      />
                    </div>

                    <div>
                      <n-input-number 
                        v-model:value="row.key_id" 
                        size="small" :min="0" placeholder=""
                        :disabled="row.is_virtual || row.keycode === 0"
                      />
                    </div>

                    <div>
                      <n-select 
                        v-model:value="row.event" 
                        size="small" 
                        :options="[{ label: t('macro_panel_key_press') || 'Press', value: 3 }, { label: t('macro_panel_key_release') || 'Release', value: 1 }]"
                        :disabled="row.keycode === 0"
                      />
                    </div>

                    <div>
                      <div style="height: 40px; display: flex; align-items: center;">
                        <div style="height: 54px;" 
                             :style="(row.keycode === 0 && isListFull) ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(1)' } : {}"
                             :title="(row.keycode === 0 && isListFull) ? (t('macro_full') || 'Max length reached') : ''"
                        >
                            <KeyEditCell 
                              :value="row.keycode" :x="0"
                              @update:value="(val) => handleKeycodeUpdate(row, val)" 
                            />
                        </div>
                      </div>
                    </div>

                    <div class="center-cell">
                      <n-button v-if="row.keycode !== 0" type="error" size="tiny" quaternary @click="deleteRow(row)">
                        {{ t('delete') || 'Del' }}
                      </n-button>
                      <span v-else-if="isListFull" style="font-size: 10px; color: #999;">
                        END
                      </span>
                    </div>

                  </div>
                </n-list-item>
              </TransitionGroup>

            </n-list>
          </n-scrollbar>
        </div>
      </n-card>
  </div>
</template>

<style scoped>
/* 保持原有样式 */
.list-container { flex: 1; overflow: hidden; padding: 0; }
.custom-list { background: transparent; }
.grid-row { display: grid; grid-template-columns: var(--grid-cols); gap: var(--row-gap); align-items: center; }
.header-text { font-weight: 500; color: rgb(118, 124, 130); font-size: 13px; }
:global(.dark) .header-text { color: rgba(255, 255, 255, 0.8); }
.list-item-row { background-color: var(--n-color); transition: background-color 0.3s; will-change: transform; transform: translate3d(0, 0, 0); backface-visibility: hidden; z-index: 1; }
:deep(.n-list-item) { padding: 8px 16px; }
.center-cell { display: flex; justify-content: center; align-items: center; height: 100%; }
.n-input-number, .n-select { width: 100%; }
.list-transition-group { position: relative; min-height: 50px; }
.list-item-row:hover { z-index: 2; }
.list-move { transition: transform 0.5s cubic-bezier(0.2, 0, 0.2, 1); z-index: 100 !important; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.list-enter-active, .list-leave-active { transition: all 0.5s cubic-bezier(0.2, 0, 0.2, 1); z-index: 0; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(30px); }
.list-leave-active { position: absolute; width: 100%; left: 0; right: 0; }
</style>