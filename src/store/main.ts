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

        const keyboardKeys = ref<KeyConfig[]>([]);

        const advancedKeys = ref<IAdvancedKey[]>([]);
        const rgbConfigs = ref<IRGBConfig[]>([]);
        const keymap = ref<number[][]>([new Array<number>]);
        const dynamicKeys = ref<IDynamicKey[]>([]);
        const macros = ref<IMacroAction[][]>([new Array<IMacroAction>]);

        const currentLayerIndex = ref<number>(0);
        
        const tabSelection = ref<string | null>("PerformancePanel");

        //keymap: [][] as number[][],
        //hasChanged: true,
        return {
            themeName,

            keyboardKeys,

            advancedKeys,
            rgbConfigs,
            keymap,
            dynamicKeys,
            macros,

            tabSelection,
            
            currentLayerIndex,
        }
    }
  );