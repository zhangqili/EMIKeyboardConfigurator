<script setup lang="ts">
import { computed, h, ref, nextTick, watch } from 'vue'
import { useI18n } from "vue-i18n";
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';
import * as ekc from 'emi-keyboard-controller';
import { NButton, NInputNumber, NSelect, NCard, NScrollbar, NCheckbox, NList, NListItem } from 'naive-ui'
import KeyEditCell from './KeyEditCell.vue';

const { t } = useI18n();
const store = useMainStore();
const { dynamic_key } = storeToRefs(store);

interface RowData {
  id: number;
  isVirtual: boolean;
  keyId: number;
  tick: number;
  event: number;
  binding: number;
}

// ==========================================
// 【新增】宏配置切换逻辑
// ==========================================

// 1. 下拉菜单选项
const macroOptions = [0, 1, 2, 3].map(i => ({
  label: `${t('key_selector_macro') || 'Macro'} ${i}`,
  value: i
}));

// 2. 当前选中的宏
const currentMacroIndex = ref(0);

// 3. 辅助函数：创建一个全新的占位行
const createPlaceholderRow = (): RowData => ({
  id: Date.now() + Math.random(), // 确保ID唯一
  isVirtual: true,
  keyId: 0,
  tick: 0,
  event: 3,
  binding: 0
});

// 4. 初始化数据仓库：4组独立数据
const macroStore = ref<RowData[][]>(
  Array.from({ length: 4 }, () => [createPlaceholderRow()])
);

// 5. data 作为当前显示数据的引用
// 初始化指向第 0 组
const data = ref<RowData[]>(macroStore.value[0]);

// 6. 监听切换，更新 data 指向
watch(currentMacroIndex, (newIndex) => {
  data.value = macroStore.value[newIndex];
});

// ==========================================

const sortOrder = ref<'asc' | 'desc'>('asc');

const columnsConfig = computed(() => [
  { title: t('macro_panel_tick'), width: '1fr', align: 'left' },
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

// 计算当前最大 Tick (用于占位行)
const maxTick = computed(() => {
  const validRows = data.value.filter(r => r.binding !== 0);
  if (validRows.length === 0) return 0;
  return Math.max(...validRows.map(r => r.tick));
});

// 排序逻辑
const displayData = computed(() => {
  const allRows = [...data.value];
  
  // 动态更新占位行的 tick 为最大值
  const placeholderRow = allRows.find(r => r.binding === 0);
  if (placeholderRow) {
    placeholderRow.tick = maxTick.value;
  }

  allRows.sort((a, b) => {
    const diff = a.tick - b.tick;
    if (diff !== 0) return sortOrder.value === 'asc' ? diff : -diff;
    // Tick 相同，按 ID 排序 (Tie-breaker)
    return sortOrder.value === 'asc' ? a.id - b.id : b.id - a.id;
  });

  return allRows;
});

const inputRefs = ref<Record<number, any>>({});
const setInputRef = (el: any, id: number) => { if (el) inputRefs.value[id] = el; };

function handleTickUpdate(row: RowData, val: number | null) {
  if (val !== null) {
    row.tick = val;
    nextTick(() => {
      const cmp = inputRefs.value[row.id];
      const nativeInput = cmp?.$el?.querySelector('input');
      const target = nativeInput || cmp;
      if (target?.focus) target.focus({ preventScroll: true });
    });
  }
}

function deleteRow(row: RowData) {
  const index = data.value.findIndex(item => item.id === row.id);
  if (index !== -1) { 
    delete inputRefs.value[row.id]; 
    data.value.splice(index, 1); 
  }
}

function toggleSort() { sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'; }

function handleBindingUpdate(row: RowData, newValue: number) {
  const oldValue = row.binding;
  row.binding = newValue;
  
  if (oldValue === 0 && newValue !== 0) {
    // 占位行转正，添加新的占位行
    // 新行 tick 默认为当前最大值，保持连贯
    data.value.push({
      ...createPlaceholderRow(),
      tick: row.tick 
    });
  } else if (newValue === 0) {
    deleteRow(row);
  }
}
</script>

<template>
  <div style="flex: 1; display: flex; height: 100%;">
    <div style="flex: 1; display: flex; height: 100%;" v-if="dynamic_key?.type == ekc.DynamicKeyType.DynamicKeyNone">
      <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
        
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-select 
                v-model:value="currentMacroIndex"
                :options="macroOptions"
                size="small" 
                style="width: 140px" 
              />
            </div>
            <n-button size="small" secondary @click="toggleSort">
              <template #icon>
                <span v-if="sortOrder === 'asc'" style="font-size: 12px;">▼</span>
                <span v-else style="font-size: 12px;">▲</span>
              </template>
              {{ sortOrder === 'asc' ? (t('sort_asc') || 'Tick Asc') : (t('sort_desc') || 'Tick Desc') }}
            </n-button>
          </div>
        </template>

        <div class="list-container" :style="gridStyle">
          <n-scrollbar>
            <n-list hoverable clickable bordered class="custom-list">
              
              <template #header>
                <div class="grid-row header-text">
                  <div 
                    v-for="(col, index) in columnsConfig" 
                    :key="index"
                    :style="{ justifyContent: col.align === 'center' ? 'center' : 'flex-start' }"
                    style="display: flex;"
                  >
                    {{ col.title }}
                  </div>
                </div>
              </template>

              <TransitionGroup name="list" tag="div" class="list-transition-group">
                <n-list-item v-for="row in displayData" :key="row.id" class="list-item-row">
                  
                  <div class="grid-row">
                    
                    <div>
                      <n-input-number 
                        :ref="(el) => setInputRef(el, row.id)"
                        :value="row.tick" 
                        @update:value="(v) => handleTickUpdate(row, v)"
                        :min="0" 
                        :show-button="false"
                        :placeholder="row.binding === 0 ? 'Auto' : ''"
                        :disabled="row.binding === 0" 
                      />
                      </div>

                    <div class="center-cell">
                      <n-checkbox v-model:checked="row.isVirtual" />
                    </div>

                    <div>
                      <n-input-number 
                        v-model:value="row.keyId" 
                        :min="0" 
                        :disabled="row.isVirtual"
                        :show-button="false"
                        placeholder=""
                      />
                    </div>

                    <div>
                      <n-select 
                        v-model:value="row.event" 
                        :options="[
                          { label: t('macro_panel_key_press') || 'Press', value: 3 },
                          { label: t('macro_panel_key_release') || 'Release', value: 1 }
                        ]"
                      />
                    </div>

                    <div>
                      <div style="height: 40px; display: flex; align-items: center;">
                        <div style="height: 54px;">
                          <KeyEditCell 
                            :value="row.binding" :x="0"
                            @update:value="(val) => handleBindingUpdate(row, val)" 
                          />
                        </div>
                      </div>
                    </div>

                    <div class="center-cell">
                      <n-button 
                        v-if="row.binding !== 0"
                        type="error" 
                        size="tiny" 
                        quaternary
                        @click="deleteRow(row)"
                      >
                        {{ t('delete') || 'Del' }}
                      </n-button>
                    </div>

                  </div>
                </n-list-item>
              </TransitionGroup>

            </n-list>
          </n-scrollbar>
        </div>

      </n-card>
    </div>
  </div>
</template>

<style scoped>
/* 样式与之前版本保持完全一致 */
.list-container { flex: 1; overflow: hidden; padding: 0; }
.custom-list { background: transparent; }
.grid-row { display: grid; grid-template-columns: var(--grid-cols); gap: var(--row-gap); align-items: center; }
.header-text { font-weight: 500; color: rgb(118, 124, 130); font-size: 13px; }
:global(.dark) .header-text { color: rgba(255, 255, 255, 0.8); }
.list-item-row { 
  background-color: var(--n-color); 
  transition: background-color 0.3s; 
  will-change: transform; 
  transform: translate3d(0, 0, 0); 
  backface-visibility: hidden;
  z-index: 1;
}
:deep(.n-list-item) { padding: 8px 16px; }
.center-cell { display: flex; justify-content: center; align-items: center; height: 100%; }
.n-input-number, .n-select { width: 100%; }
.list-transition-group { position: relative; min-height: 50px; }
.list-item-row:hover { z-index: 2; }

/* 动画 */
.list-move {
  transition: transform 0.5s cubic-bezier(0.2, 0, 0.2, 1);
  z-index: 100 !important;
  position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.list-enter-active, .list-leave-active { transition: all 0.5s cubic-bezier(0.2, 0, 0.2, 1); z-index: 0; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(30px); }
.list-leave-active { position: absolute; width: 100%; left: 0; right: 0; }
</style>
