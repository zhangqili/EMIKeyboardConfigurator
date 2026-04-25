<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { NRadioGroup, NRadioButton, NButtonGroup, NButton, NTooltip, NIcon } from "naive-ui";
import { CropOutline, BrushOutline, SwapHorizontalOutline } from '@vicons/ionicons5';
import { SelectAllFilled, DeselectFilled } from '@vicons/material';

const { t } = useI18n();

// 接收来自父组件的状态
const selectionTool = defineModel<'marquee' | 'swipe'>('tool');
const booleanMode = defineModel<'new' | 'toggle' | 'add' | 'subtract'>('mode');

defineEmits(['selectAll', 'deselectAll', 'invertSelection']);
</script>

<template>
    <div class="toolbar-container">
    
      <n-radio-group v-model:value="selectionTool" size="medium">
        <n-radio-button value="swipe">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><BrushOutline /></n-icon></div>
            </template>
            {{ t('keyboard_render_tool_swipe') }}
          </n-tooltip>
        </n-radio-button>
        <n-radio-button value="marquee">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><CropOutline /></n-icon></div>
            </template>
            {{ t('keyboard_render_tool_marquee') }}
          </n-tooltip>
        </n-radio-button>
      </n-radio-group>
    
      <n-radio-group v-model:value="booleanMode" size="medium">
        <n-radio-button value="new">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="14" height="14" fill="currentColor"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_new') }}
          </n-tooltip>
        </n-radio-button>
        
        <n-radio-button value="toggle">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M4 4H16V16H4V4ZM8 8H20V20H8V8Z" fill="currentColor"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_toggle') }}
          </n-tooltip>
        </n-radio-button>
        
        <n-radio-button value="add">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M4 4h12v4h4v12h-12v-4h-4z"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_add') }}
          </n-tooltip>
        </n-radio-button>
        
        <n-radio-button value="subtract">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M4 4h12v4H8v8H4z"/>
                    <rect x="8" y="8" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_subtract') }}
          </n-tooltip>
        </n-radio-button>
      </n-radio-group>
    
      <n-button-group size="medium">
        <n-button @click="$emit('selectAll')">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><SelectAllFilled /></n-icon></div>
            </template>
            {{ t('keyboard_render_action_select_all') }}
          </n-tooltip>
        </n-button>
        
        <n-button @click="$emit('deselectAll')">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><DeselectFilled /></n-icon></div>
            </template>
            {{ t('keyboard_render_action_clear') }}
          </n-tooltip>
        </n-button>
        
        <n-button @click="$emit('invertSelection')">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><SwapHorizontalOutline /></n-icon></div>
            </template>
            {{ t('keyboard_render_action_invert') }}
          </n-tooltip>
        </n-button>
      </n-button-group>
    
    </div>
</template>

<style scoped>
.toolbar-container { display: flex; flex-direction: row; gap: 8px; align-items: center; }

.toolbar-container :deep(.n-radio-group),
.toolbar-container :deep(.n-button-group) {
  display: flex !important;
  align-items: center !important;
}

.toolbar-container :deep(.n-radio-button),
.toolbar-container :deep(.n-button) {
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  position: relative !important;
}

.toolbar-container :deep(.n-radio-button__content),
.toolbar-container :deep(.n-button__content) {
  padding: 0 !important;
  margin: 0 !important;
}

.icon-wrapper {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 0 !important;
}
</style>