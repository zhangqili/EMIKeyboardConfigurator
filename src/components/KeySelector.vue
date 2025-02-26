<script setup lang="ts">
import { ref } from 'vue';
import { keyboardEventToHidCodeMap, keyCodeToKeyName, keyModifierToKeyName, LayerControlToKeyName, MouseKeycodeToKeyName, KeyboardOperationToKeyName, ConsumerKeyToKeyName, SystemKeyToKeyName } from "../apis/utils"
import { Keycode, KeyModifier, LayerControlKeycode, MouseKeycode, KeyboardKeycode, ConsumerKeycode, SystemRawKeycode } from "emi-keyboard-controller"
import { SelectOption, useMessage } from 'naive-ui';

const message = useMessage();

const binding = defineModel("binding", {default : 0});

function handleKeyModifierClick(key: number | string | Keycode) {
    var modifier = (binding.value >> 8) & 0xFF;
    if ((modifier & key as number) > 0) {
        modifier &= ~(key as number);
    }
    else {
        modifier |= key as number;
    }
    binding.value = binding.value & 0xFF | (modifier << 8);
}

function handleKeycodeClick(key: number | string | Keycode) {
    binding.value = binding.value & 0xFF00 | key as number;
}

function handleFullKeycodeClick(key: number | string | Keycode) {
    binding.value = key as number;
}

function handleLayerNumber(n: number | null) {
    binding.value = ((Number(layer_control_value.value) << 12) | (n as number) << 8 | Keycode.LayerControl);
}

function handleUserNumber(n: number | null) {
    binding.value = ((n as number & 0xFF) << 8 | Keycode.KeyUser);
}

function handleLayerControl(value: string, option: SelectOption) {
    binding.value = (Number(value) << 12) | layer_value.value << 8 | Keycode.LayerControl;
}

const layer_options = Object.keys(LayerControlKeycode).slice(0,4).map((key) => {
    return {
        value: key,
        label: LayerControlToKeyName[key as unknown as LayerControlKeycode]
    };
});
const layer_value = ref(0);
const layer_control_value = ref((LayerControlKeycode.LayerMomentary as number).toString());

</script>
<template>
    <n-tabs type="segment" animated>
        <n-tab-pane name="Normal" title="Normal">
            <n-list vertical>
                <n-list-item>
                    <n-thing title="Modifiers">
                        <n-space vertical>
                            <n-button @click="() => { binding = binding & 0xFF; }">
                                Clear</n-button>
                            <n-button-group>
                                <n-button v-for="(key, index) in Object.keys(KeyModifier)
                                    .slice(1, 9)" @click="handleKeyModifierClick(key)"
                                    :type="((binding >> 8) & 0xFF & (key as unknown as number)) > 0 ? 'primary' : ''">
                                    {{ keyModifierToKeyName[key as unknown as KeyModifier] }}</n-button>
                            </n-button-group>
                        </n-space>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Event">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.NoEvent, Keycode.ErrorUndefined + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Alphabet Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.A, Keycode.Z + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Numbertic Keys">
                        <n-button-group>
                            <n-button v-for="(key, code) in Object.keys(Keycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(Keycode.Key1, Keycode.Key0 + 1)"
                                :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleKeycodeClick(key)">
                                {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                        </n-button-group>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Control Keys">
                        <n-button-group>
                            <n-button v-for="(key, code) in Object.keys(Keycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(Keycode.Enter, Keycode.Tab + 1)"
                                :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleKeycodeClick(key)">
                                {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                        </n-button-group>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Symbols">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.Spacebar, Keycode.Slash + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Function Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.CapsLock, Keycode.Pause + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Navigation Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.Insert, Keycode.UpArrow + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Keypad">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.NumLock, Keycode.KeypadDot + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Additional Symbols and Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.NonUsBackslash, Keycode.KeypadEqual + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Extended Function Keys">
                        <n-button-group>
                            <n-button v-for="(key, code) in Object.keys(Keycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(Keycode.F13, Keycode.F24 + 1)"
                                :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleKeycodeClick(key)">
                                {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                        </n-button-group>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Media and System Control Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.Execute, Keycode.VolumeDown + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Locking Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.LockingCapsLock, Keycode.LockingScrollLock + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="International and Language-Specific Keys">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.KeypadComma, Keycode.Lang9 + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Additional Commands and Editing">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.AlternateErase, Keycode.ExSel + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Mouse">
                        <n-button v-for="(key, code) in Object.keys(MouseKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(MouseKeycode.MouseLButton, MouseKeycode.MouseWheelDown + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ MouseKeycodeToKeyName[key as unknown as MouseKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
            </n-list>
        </n-tab-pane>
        <n-tab-pane name="Others" title="others">
            <n-list vertical>
                <n-list-item>
                    <n-thing title="Mouse">
                        <n-button v-for="(key, code) in Object.keys(MouseKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(MouseKeycode.MouseLButton, MouseKeycode.MouseWheelDown + 1)"
                            :type="((binding & 0xFF) == Keycode.MouseCollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MouseCollection)">
                            {{ MouseKeycodeToKeyName[key as unknown as MouseKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Consumer">
                        <n-button v-for="(key, code) in Object.keys(ConsumerKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(0, 0x31)"
                            :type="((binding & 0xFF) == Keycode.ConsumerCollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.ConsumerCollection)">
                            {{ ConsumerKeyToKeyName[key as unknown as ConsumerKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="System">
                        <n-button v-for="(key, code) in Object.keys(SystemRawKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(0, 5)"
                            :type="((binding & 0xFF) == Keycode.SystemCollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.SystemCollection)">
                            {{ SystemKeyToKeyName[key as unknown as SystemRawKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Layer">
                        <n-flex>
                            <n-grid :cols="4">
                                <n-gi :span="1">
                                    <n-select :options="layer_options" @update:value="handleLayerControl" v-model:value="layer_control_value" ></n-select>
                                </n-gi>
                                <n-gi :span="3">
                                    <n-input-number @update:value="handleLayerNumber" v-model:value="layer_value" max="15" min="0"></n-input-number>
                                </n-gi>
                            </n-grid>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Keyboard">
                        <n-button v-for="(key, code) in Object.keys(KeyboardKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(0, 10)"
                            :type="((binding & 0xFF) == Keycode.KeyboardOperation && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.KeyboardOperation)">
                            {{ KeyboardOperationToKeyName[key as unknown as KeyboardKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="User">
                        <n-flex>
                            <n-input-number @update:value="handleUserNumber" max="255" min="0"></n-input-number>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing title="Transparent">
                        <n-button :type="((binding & 0xFF) == Keycode.KeyTransparent) ? 'primary' : ''"
                            @click="handleFullKeycodeClick(Keycode.KeyTransparent)">
                            Transparent</n-button>
                    </n-thing>
                </n-list-item>
            </n-list>
        </n-tab-pane>
    </n-tabs>
</template>

<style scoped></style>
