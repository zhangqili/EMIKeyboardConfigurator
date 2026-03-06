import { AdvancedKey, DynamicKey, DynamicKeyType, Feature, FirmwareVersion, IAdvancedKey, IDynamicKey, IMacroAction, IRGBBaseConfig, IRGBConfig, RGBBaseConfig, RGBConfig } from 'emi-keyboard-controller'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugDataItem, demoScriptSource, KeyConfig } from '@/apis/utils';
import { LineSeriesOption, SeriesOption } from 'echarts';

export const useMainStore = defineStore('main', 
    // 为了完整类型推理，推荐使用箭头函数
    () => {
        // 所有这些属性都将自动推断出它们的类型
        const themeName = ref<string>('dark');
        return {
            themeName,
        }
    }
  );