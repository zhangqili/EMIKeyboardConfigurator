<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { NSpace, NCard, NRadioGroup, NRadioButton, NForm, NFormItem, NInputNumber, NCollapse, NCollapseItem } from 'naive-ui'
import { useI18n } from "vue-i18n";
import * as ekc from 'emi-keyboard-controller';

const { t } = useI18n();

const props = defineProps({
  selectedKeys: { type: Array as () => number[], required: true }
});

interface KeyboardContext {
  advancedKeys: Ref<ekc.IAdvancedKey[]>;
}
const { advancedKeys } = inject<KeyboardContext>('keyboardContext')!;

function useSharedProperty(propName: keyof ekc.IAdvancedKey, isPercentage = true) {
  return computed<any>({
    get: () => {
      if (!props.selectedKeys || props.selectedKeys.length === 0) return null;
      
      // 取第一个选中的按键作为基准
      const firstVal = advancedKeys.value[props.selectedKeys[0]][propName];
      
      // 检查是否所有选中的按键该属性都相同
      const isAllSame = props.selectedKeys.every(id => advancedKeys.value[id][propName] === firstVal);

      // 如果不相同，返回 null（在 UI 上表现为“混合状态”或空输入框）
      if (!isAllSame) return null; 

      // 如果全部相同，则返回值（并处理百分比缩放）
      return isPercentage ? Math.round((firstVal as number) * 1000) / 10 : firstVal;
    },
    set: (val: any) => {
      // 如果用户没有输入有效值（清空了），则不覆盖原有数据
      if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return;

      const realVal = isPercentage ? Math.round(val * 10) / 1000 : val;

      // 批量将新值应用到所有被选中的按键上
      props.selectedKeys.forEach(id => {
        (advancedKeys.value[id] as any)[propName] = realVal;
      });
    }
  });
}

const mode = useSharedProperty('mode', false);
const activation_value = useSharedProperty('activation_value');
const deactivation_value = useSharedProperty('deactivation_value');
const trigger_distance = useSharedProperty('trigger_distance');
const release_distance = useSharedProperty('release_distance');
const trigger_speed = useSharedProperty('trigger_speed');
const release_speed = useSharedProperty('release_speed');
const upper_deadzone = useSharedProperty('upper_deadzone');
const lower_deadzone = useSharedProperty('lower_deadzone');

const modes = computed(()=> [
  { value: ekc.KeyMode.KeyDigitalMode, label: t('performance_panel_digital') },
  { value: ekc.KeyMode.KeyAnalogNormalMode, label: t('performance_panel_analog_normal') },
  { value: ekc.KeyMode.KeyAnalogRapidMode, label: t('performance_panel_analog_rapid') },
  { value: ekc.KeyMode.KeyAnalogSpeedMode, label: t('performance_panel_analog_speed') }
]);
</script>

<template>
  <n-card style="height: 100%;">
    <n-space vertical>
      
      <n-radio-group v-model:value="mode">
        <n-radio-button v-for="m in modes" :key="m.value" :value="m.value" :label="m.label" />
      </n-radio-group>
      
      <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
        
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogNormalMode" :label="t('performance_panel_activation_value')">
          <n-input-number 
            v-model:value="activation_value" 
            :placeholder="activation_value === null ? '多个不同值' : t('performance_panel_activation_value')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
        
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogNormalMode" :label="t('performance_panel_deactivation_value')">
          <n-input-number 
            v-model:value="deactivation_value" 
            :placeholder="deactivation_value === null ? '多个不同值' : t('performance_panel_deactivation_value')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>

        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode" :label="t('performance_panel_trigger_distance')">
          <n-input-number 
            v-model:value="trigger_distance" 
            :placeholder="trigger_distance === null ? '多个不同值' : t('performance_panel_trigger_distance')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
        
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogRapidMode" :label="t('performance_panel_release_distance')">
          <n-input-number 
            v-model:value="release_distance" 
            :placeholder="release_distance === null ? '多个不同值' : t('performance_panel_release_distance')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>

        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogSpeedMode" :label="t('performance_panel_trigger_speed')">
          <n-input-number 
            v-model:value="trigger_speed" 
            :placeholder="trigger_speed === null ? '多个不同值' : t('performance_panel_trigger_speed')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
        
        <n-form-item v-if="mode === ekc.KeyMode.KeyAnalogSpeedMode" :label="t('performance_panel_release_speed')">
          <n-input-number 
            v-model:value="release_speed" 
            :placeholder="release_speed === null ? '多个不同值' : t('performance_panel_release_speed')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>

        <n-form-item v-if="mode !== ekc.KeyMode.KeyDigitalMode && mode !== null" :label="t('performance_panel_upper_deadzone')">
          <n-input-number 
            v-model:value="upper_deadzone" 
            :placeholder="upper_deadzone === null ? '多个不同值' : t('performance_panel_upper_deadzone')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
        
        <n-form-item v-if="mode !== ekc.KeyMode.KeyDigitalMode && mode !== null" :label="t('performance_panel_lower_deadzone')">
          <n-input-number 
            v-model:value="lower_deadzone" 
            :placeholder="lower_deadzone === null ? '多个不同值' : t('performance_panel_lower_deadzone')" 
            :min="0" :max="100" 
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>

      </n-form>

      <n-collapse v-if="mode !== ekc.KeyMode.KeyDigitalMode && mode !== null">
        <n-collapse-item :title="t('performance_panel_advanced_options')">
          <n-form inline label-placement="top" label-width="auto" require-mark-placement="right-hanging">
            <n-form-item :label="t('performance_panel_upper_bound')">
              <n-input-number :placeholder="t('performance_panel_upper_bound')"/>
            </n-form-item>
            <n-form-item :label="t('performance_panel_lower_bound')">
              <n-input-number :placeholder="t('performance_panel_lower_bound')"/>
            </n-form-item>
          </n-form>
        </n-collapse-item>
      </n-collapse>

    </n-space>
  </n-card>
</template>

<style></style>