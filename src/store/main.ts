import { AdvancedKey, DynamicKey, DynamicKeyType, Feature, FirmwareVersion, IAdvancedKey, IDynamicKey, IMacroAction, IRGBBaseConfig, IRGBConfig, RGBBaseConfig, RGBConfig } from 'emi-keyboard-controller'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugDataItem, KeyConfig } from '../apis/utils';
import { LineSeriesOption, SeriesOption } from 'echarts';

export const useMainStore = defineStore('main', 
    // 为了完整类型推理，推荐使用箭头函数
    () => {
        // 所有这些属性都将自动推断出它们的类型
        const lang = ref<string>('en');
        const themeName = ref<string>('dark');

        const keyboardKeys = ref<KeyConfig[]>([]);

        const selectedDevice = ref<string | undefined>(undefined);
        const advancedKey = ref<IAdvancedKey>(new AdvancedKey());
        const rgbConfig = ref<IRGBConfig>(new RGBConfig());
        const dynamicKey = ref<IDynamicKey>(new DynamicKey());;
        const dynamicKeyIndex = ref<number>(-1);;

        const advancedKeys = ref<IAdvancedKey[]>([]);
        const rgbBaseConfig = ref<IRGBBaseConfig>(new RGBBaseConfig());
        const rgbConfigs = ref<IRGBConfig[]>([]);
        const keymap = ref<number[][]>([new Array<number>]);
        const dynamicKeys = ref<IDynamicKey[]>([]);
        const macros = ref<IMacroAction[][]>([new Array<IMacroAction>]);

        const keyBinding = ref<number>(0);
        const currentLayerIndex = ref<number>(0);
        
        const tabSelection = ref<string | null>("PerformancePanel");
        const profiles = ref<string[]>([]);
        const selectedProfileIndex = ref<number | undefined>(undefined);
        const debugSwitch = ref(false);
        const debugRawChartOption = ref({
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    animation: false
                }
            },
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                left: 'left',
            },
            xAxis: {
              type: 'time',
              splitLine: {
                show: true
              },
              //maxInterval: 1000 * 3600 * 24
            },
            yAxis: {
              type: 'value',
              splitLine: {
                show: true
              },
              max: 4096
            },
            series: Array<SeriesOption>()
        
        });
        const debugValueChartOption = ref({
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    animation: false
                }
            },
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                left: 'left',
            },
            xAxis: {
              type: 'time',
              splitLine: {
                show: true
              },
              //maxInterval: 1000 * 3600 * 24
            },
            yAxis: {
              type: 'value',
              splitLine: {
                show: true
              },
              max: 1.1,
              min: -0.1,
              inverse: true,
            },
            series: Array<SeriesOption>()
        
        });
        const firmwareVersion = ref<FirmwareVersion>({ major: 0, minor: 0, patch: 0, info: "" });
        const readmeMarkdown = ref("");
        const firmwareFeature = ref(new Feature());

        //keymap: [][] as number[][],
        //hasChanged: true,
        return {
            lang,
            themeName,

            keyboardKeys,

            selectedDevice,
            advancedKey,
            rgbConfig,
            dynamicKey,
            dynamicKeyIndex,

            advancedKeys,
            rgbBaseConfig,
            rgbConfigs,
            keymap,
            dynamicKeys,
            macros,

            tabSelection,
            profiles,
            selectedProfileIndex,

            keyBinding,
            currentLayerIndex,

            debugRawChartOption,
            debugValueChartOption,
            debugSwitch,
            firmwareVersion,
            readmeMarkdown,
            firmwareFeature
        }
    }
  );