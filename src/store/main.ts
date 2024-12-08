import { AdvancedKey, IAdvancedKey, IRGBConfig, RGBConfig } from 'emi-keyboard-controller'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMainStore = defineStore('main', 
    // 为了完整类型推理，推荐使用箭头函数
    () => {
        // 所有这些属性都将自动推断出它们的类型
        const selected_device = ref<string | undefined>(undefined);
        const advanced_key = ref<IAdvancedKey>(new AdvancedKey());
        const rgb_config = ref<IRGBConfig>(new RGBConfig());

        const advanced_keys = ref<IAdvancedKey[]>([]);
        const rgb_configs = ref<IRGBConfig[]>([]);
        const keymap = ref<number[][] | undefined>(undefined);

        const key_binding = ref<number>(0);
        const selected_layer = ref<number>(0);
        
        //keymap: [][] as number[][],
        //hasChanged: true,
        return {
            selected_device,
            advanced_key,
            rgb_config,

            advanced_keys,
            rgb_configs,
            keymap,

            key_binding,
            selected_layer
        }
    }
  );