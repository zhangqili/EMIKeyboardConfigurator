<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { NCard, NH2, NForm, NFormItem, NSwitch, NDivider } from 'naive-ui';
import * as ekc from 'emi-keyboard-controller';

const { t } = useI18n();

const keyboardConfig = defineModel<ekc.KeyboardConfig>('keyboardConfig', { default: new ekc.KeyboardConfig() });

const props = defineProps<{
    controller: ekc.KeyboardController;
}>();
// 组件挂载时：获取当前配置并同步到 UI
onMounted(async () => {
});

// 当任何开关被拨动时：更新 Controller 数据并下发给下位机
async function syncConfig() {
}
</script>
<template>
  <n-card style="height: 100%; background: transparent;" content-style="padding: 24px; overflow-y: auto;" :bordered="false">
    
    <n-grid :x-gap="16" :y-gap="16" cols="1 s:2 m:3 xl:4" responsive="screen">
      
      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span>{{ t('setting_nkro') || '全键无冲 (NKRO)' }}</span>
            <n-switch v-model:value="keyboardConfig.nkro" @update:value="syncConfig" />
          </n-flex>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span>{{ t('setting_winlock') || '锁定 Win 键' }}</span>
            <n-switch v-model:value="keyboardConfig.winlock" @update:value="syncConfig" />
          </n-flex>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span>{{ t('setting_debug') || '调试模式' }}</span>
            <n-switch v-model:value="keyboardConfig.debug" @update:value="syncConfig" />
          </n-flex>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span>{{ t('setting_enable_report') || '启用数据上报' }}</span>
            <n-switch v-model:value="keyboardConfig.enable_report" @update:value="syncConfig" />
          </n-flex>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span>{{ t('setting_continuous_poll') || '持续轮询' }}</span>
            <n-switch v-model:value="keyboardConfig.continuous_poll" @update:value="syncConfig" />
          </n-flex>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span style="color: var(--n-error-color);">{{ t('setting_calibrate') || '校准' }}</span>
            <n-popconfirm @positive-click="controller.calibrate()" :positive-text="t('confirm')" :negative-text="t('cancel')">
              <template #trigger>
                <n-button type="warning" ghost size="small">{{ t('confirm') || '执行' }}</n-button>
              </template>
              {{ t('setting_calibrate') }}
            </n-popconfirm>
          </n-flex>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span style="color: var(--n-error-color);">{{ t('setting_enter_bootloader') || '进入Bootloader' }}</span>
            <n-popconfirm @positive-click="controller.enter_bootloader()" :positive-text="t('confirm')" :negative-text="t('cancel')">
              <template #trigger>
                <n-button type="warning" ghost size="small">{{ t('confirm') || '执行' }}</n-button>
              </template>
              {{ t('setting_enter_bootloader_confirm') }}
            </n-popconfirm>
          </n-flex>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span>{{ t('setting_device_reset') || '重启设备' }}</span>
            <n-popconfirm @positive-click="controller.system_reset()" :positive-text="t('confirm')" :negative-text="t('cancel')">
              <template #trigger>
                <n-button type="warning" ghost size="small">{{ t('confirm') || '执行' }}</n-button>
              </template>
              {{ t('setting_device_reset_confirm') }}
            </n-popconfirm>
          </n-flex>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card size="small" hoverable embedded>
          <n-flex justify="space-between" align="center">
            <span style="color: var(--n-error-color);">{{ t('setting_device_factory_reset') || '恢复出厂设置' }}</span>
            <n-popconfirm @positive-click="controller.factory_reset()" :positive-text="t('confirm')" :negative-text="t('cancel')">
              <template #trigger>
                <n-button type="error" ghost size="small">{{ t('confirm') || '执行' }}</n-button>
              </template>
              {{ t('setting_device_factory_reset_confirm') }}
            </n-popconfirm>
          </n-flex>
        </n-card>
      </n-grid-item>

    </n-grid>

  </n-card>
</template>