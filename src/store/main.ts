import { AdvancedKey, DynamicKey, DynamicKeyType, IAdvancedKey, IDynamicKey, IRGBConfig, RGBConfig } from 'emi-keyboard-controller'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugDataItem } from '../apis/utils';
import { LineSeriesOption, SeriesOption } from 'echarts';

export const useMainStore = defineStore('main', 
    // 为了完整类型推理，推荐使用箭头函数
    () => {
        // 所有这些属性都将自动推断出它们的类型
        const selected_device = ref<string | undefined>(undefined);
        const advanced_key = ref<IAdvancedKey>(new AdvancedKey());
        const rgb_config = ref<IRGBConfig>(new RGBConfig());
        const dynamic_key = ref<IDynamicKey>(new DynamicKey());;
        const dynamic_key_index = ref<number>(-1);;

        const advanced_keys = ref<IAdvancedKey[]>([]);
        const rgb_configs = ref<IRGBConfig[]>([]);
        const keymap = ref<number[][] | undefined>(undefined);
        const dynamic_keys = ref<IDynamicKey[]>([]);

        const key_binding = ref<number>(0);
        const current_layer = ref<number>(0);

        const config_files = ref<string[]>([]);
        const selected_config_file_index = ref<number | undefined>(undefined);
        const debug_switch = ref(false);
        const debug_raw_chart_option = ref({
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
        const debug_value_chart_option = ref({
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
        

        //keymap: [][] as number[][],
        //hasChanged: true,
        return {
            selected_device,
            advanced_key,
            rgb_config,
            dynamic_key,
            dynamic_key_index,

            advanced_keys,
            rgb_configs,
            keymap,
            dynamic_keys,

            config_files,
            selected_config_file_index,

            key_binding,
            current_layer,

            debug_raw_chart_option,
            debug_value_chart_option,
            debug_switch
        }
    }
  );