<script setup lang="ts">
import { ref, triggerRef } from 'vue';
import { keyboardEventToHidCodeMap, keyCodeToKeyName, keyModifierToKeyName, LayerControlToKeyName, MouseKeycodeToKeyName, KeyboardOperationToKeyName, ConsumerKeyToKeyName, SystemKeyToKeyName, JoystickKeycodeToKeyName, MIDIKeyToKeyName, MIDINoteName, KeyboardConfigToKeyName, MacroKeycodeToKeyName } from "../apis/utils"
import { Keycode, KeyModifier, LayerControlKeycode, MouseKeycode, KeyboardKeycode, ConsumerKeycode, SystemRawKeycode, JoystickKeycode, MIDIKeycode, KeyboardConfig, MacroKeycode } from "emi-keyboard-controller"
import { SelectOption, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { values } from 'lodash';

const { t } = useI18n();
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


function handleUserNumber(n: number | null) {
    binding.value = ((n as number & 0xFF) << 8 | Keycode.KeyUser);
}

function handleLayerControl(value: string, option: SelectOption) {
    binding.value = (Number(value) << 12) | layer_value.value << 8 | Keycode.LayerControl;
}

function handleLayerNumber(n: number | null) {
    binding.value = ((Number(layer_control_value.value) << 12) | (n as number) << 8 | Keycode.LayerControl);
}

function handleJoystickControl(value: string, option: SelectOption) {
    binding.value = (Number(value) << 13) | joystick_value.value << 8 | Keycode.JoystickCollection;
}

function handleJoystickNumber(n: number | null) {
    binding.value = ((Number(joystick_collection_value.value) << 13) | (n as number) << 8 | Keycode.JoystickCollection);
}

function handleMIDINote(value: string, option: SelectOption) {
    let temp_value = (Number(value) + midi_value.value * 12);
    if (temp_value > 127) {
        temp_value = 127;
        midi_note_value.value = temp_value % 12;
        midi_value.value = (temp_value - temp_value % 12)/12;
    }
    binding.value = temp_value << 8 | Keycode.MIDINote;
}

function handleMIDINoteNumber(n: number | null) {
    let temp_value = ((midi_note_value.value as number) + (n as number)*12);
    if (temp_value > 127) {
        temp_value = 127;
        midi_note_value.value = temp_value % 12;
        midi_value.value = (temp_value - temp_value % 12)/12;
    }
    binding.value =  temp_value << 8 | Keycode.MIDINote;
}

function handleMacroIndex(n: number | null) {
    binding.value = (binding.value & 0xf0ff) | (macro_index.value & 0x0f) << 8 | Keycode.MacroCollection;
}

function handleKeyboardConfigControl(value: string, option: SelectOption) {
    //console.log(value);
    binding.value = (Number(value) << 14) | (Number(keyboard_config_value.value) + KeyboardKeycode.KeyboardConfigBase) << 8 | Keycode.KeyboardOperation;
}

function handleKeyboardConfig(value: string, option: SelectOption) {
    binding.value = (keyboard_config_control_value.value << 14) | (Number(value) + KeyboardKeycode.KeyboardConfigBase) << 8 | Keycode.KeyboardOperation;
}

const layer_options = Object.keys(LayerControlKeycode).slice(0,4).map((key) => {
    return {
        value: key,
        label: LayerControlToKeyName[key as unknown as LayerControlKeycode]
    };
});

const keyboard_config_control_options = [
    {
        value : 0,
        label : "Turn off"
    },
    {
        value : 1,
        label : "Turn on"
    },
    {
        value : 2,
        label : "Toggle"
    },
]

const keyboard_config_options = Object.keys(KeyboardConfig).slice(0,4).map((key) => {
    return {
        value: key,
        label: KeyboardConfigToKeyName[key as unknown as KeyboardConfig]
    };
});

const joystick_options = Object.keys(JoystickKeycode).slice(0,5).map((key) => {
    return {
        value: key,
        label: JoystickKeycodeToKeyName[key as unknown as JoystickKeycode]
    };
});

const midi_note_options = MIDINoteName.map((key,index) => {
    return {
        value: index,
        label: key
    };
});

const layer_value = ref(0);
const layer_control_value = ref((LayerControlKeycode.LayerMomentary as number).toString());
const joystick_value = ref(0);
const joystick_collection_value = ref((JoystickKeycode.JoystickButton as number).toString());
const midi_value = ref(0);
const midi_note_value = ref(0);
const macro_index = ref(0);
const keyboard_config_control_value = ref(2);
const keyboard_config_value = ref((KeyboardConfig.KeyboardConfigDebug as number).toString());

</script>
<template>
    <n-tabs type="segment" animated>
        <n-tab-pane :name="t('key_selector_normal')" title="Normal">
            <n-list vertical>
                <n-list-item>
                    <n-thing :title="t('key_selector_modifiers')">
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
                    <n-thing :title="t('key_selector_event')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.NoEvent, Keycode.ErrorUndefined + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_alphabet')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.A, Keycode.Z + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_numbertic')">
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
                    <n-thing :title="t('key_selector_control')">
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
                    <n-thing :title="t('key_selector_symbols')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.Spacebar, Keycode.Slash + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_function')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.CapsLock, Keycode.Pause + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_navigation')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.Insert, Keycode.UpArrow + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_keypad')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.NumLock, Keycode.KeypadDot + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_additional_symbols_and_keys')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.NonUsBackslash, Keycode.KeypadEqual + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_extended_function')">
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
                    <n-thing :title="t('key_selector_media_and_system_control')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.Execute, Keycode.VolumeDown + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_locking')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.LockingCapsLock, Keycode.LockingScrollLock + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_international')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.KeypadComma, Keycode.Lang9 + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_additional_command_and_editing')">
                        <n-button v-for="(key, code) in Object.keys(Keycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(Keycode.AlternateErase, Keycode.ExSel + 1)"
                            :type="((binding & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleKeycodeClick(key)">
                            {{ keyCodeToKeyName[key as unknown as Keycode] }}</n-button>
                    </n-thing>
                </n-list-item>
            </n-list>
        </n-tab-pane>
        <n-tab-pane :name="t('key_selector_others')" title="others">
            <n-list vertical>
                <n-list-item>
                    <n-thing :title="t('key_selector_mouse')">
                        <n-button v-for="(key, code) in Object.keys(MouseKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(MouseKeycode.MouseLButton, MouseKeycode.MouseWheelRight + 5)"
                            :type="((binding & 0xFF) == Keycode.MouseCollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MouseCollection)">
                            {{ MouseKeycodeToKeyName[key as unknown as MouseKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_consumer')">
                        <n-button v-for="(key, code) in Object.keys(ConsumerKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(0, 0x31)"
                            :type="((binding & 0xFF) == Keycode.ConsumerCollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.ConsumerCollection)">
                            {{ ConsumerKeyToKeyName[key as unknown as ConsumerKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_system')">
                        <n-button v-for="(key, code) in Object.keys(SystemRawKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(0, 5)"
                            :type="((binding & 0xFF) == Keycode.SystemCollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.SystemCollection)">
                            {{ SystemKeyToKeyName[key as unknown as SystemRawKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_joystick')">
                        <n-button :type="((binding & 0xFF) == Keycode.JoystickCollection) ? 'primary' : ''"
                            @click="handleKeycodeClick(Keycode.JoystickCollection)">
                            {{ keyCodeToKeyName[Keycode.JoystickCollection] }}</n-button>
                        <n-grid :cols="4">
                            <n-gi :span="1">
                                <n-select :options="joystick_options" @update:value="handleJoystickControl" v-model:value="joystick_collection_value" ></n-select>
                            </n-gi>
                            <n-gi :span="3">
                                <n-input-number @update:value="handleJoystickNumber" v-model:value="joystick_value" max="15" min="0"></n-input-number>
                            </n-gi>
                        </n-grid>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_midi')">
                        <n-flex vertical>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.On, MIDIKeycode.Toggle + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.NoteC0, MIDIKeycode.NoteB0 + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.NoteC1, MIDIKeycode.NoteB1 + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.NoteC2, MIDIKeycode.NoteB2 + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.NoteC3, MIDIKeycode.NoteB3 + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.NoteC4, MIDIKeycode.NoteB4 + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.OctaveN2, MIDIKeycode.OctaveUp + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.TransposeN6, MIDIKeycode.TransposeUp + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.Velocity0, MIDIKeycode.VelocityUp + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.Channel1, MIDIKeycode.ChannelUp + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                            <n-flex>
                                <n-button v-for="(key, code) in Object.keys(MIDIKeycode)
                                //.filter(key => isNaN(Number(key)))
                                .slice(MIDIKeycode.AllNotesOff, MIDIKeycode.PitchBendUp + 1)"
                                :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == (key as unknown as number)) ? 'primary' : ''"
                                @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.MIDICollection)">
                                {{ MIDIKeyToKeyName[key as unknown as MIDIKeycode] }}</n-button>
                            </n-flex>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_midi_note')">
                        <n-button :type="((binding & 0xFF) == Keycode.MIDINote) ? 'primary' : ''"
                            @click="handleKeycodeClick(Keycode.MIDINote)">
                            {{ keyCodeToKeyName[Keycode.MIDINote] }}</n-button>
                        <n-flex>
                            <n-grid :cols="4">
                                <n-gi :span="1">
                                    <n-select :options="midi_note_options" @update:value="handleMIDINote" v-model:value="midi_note_value" ></n-select>
                                </n-gi>
                                <n-gi :span="3">
                                    <n-input-number @update:value="handleMIDINoteNumber" v-model:value="midi_value" max="10" min="0"></n-input-number>
                                </n-gi>
                            </n-grid>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_macro')">
                        <n-button v-for="(key, code) in Object.keys(MacroKeycode)
                        //.filter(key => isNaN(Number(key)))
                        .slice(MacroKeycode.MacroRecordingStart, MacroKeycode.MacroPlayingPause + 1)"
                        :type="((binding & 0xFF) == Keycode.MacroCollection && ((binding >> 12) & 0xF) == (key as unknown as number)) ? 'primary' : ''"
                        @click="handleFullKeycodeClick(((key as unknown as number) << 12) | (macro_index & 0x0f) << 8 | Keycode.MacroCollection)">
                        {{ MacroKeycodeToKeyName[key as unknown as MacroKeycode] }}</n-button>
                        <n-flex>
                            <n-grid :cols="4">
                                <n-gi :span="4">
                                    <n-input-number @update:value="handleMacroIndex" v-model:value="macro_index" max="3" min="0"></n-input-number>
                                </n-gi>
                            </n-grid>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_layer')">
                        <n-button :type="((binding & 0xFF) == Keycode.LayerControl) ? 'primary' : ''"
                            @click="handleKeycodeClick(Keycode.LayerControl)">
                            {{ keyCodeToKeyName[Keycode.LayerControl] }}</n-button>
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
                    <n-thing :title="t('key_selector_keyboard')">
                        <n-button v-for="(key, code) in Object.keys(KeyboardKeycode)
                            //.filter(key => isNaN(Number(key)))
                            .slice(0, 11)"
                            :type="((binding & 0xFF) == Keycode.KeyboardOperation && (((binding >> 8) & 0x3F) < 0x20) &&((binding >> 8) & 0x3F) == (key as unknown as number)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick((key as unknown as number) << 8 | Keycode.KeyboardOperation)">
                            {{ KeyboardOperationToKeyName[key as unknown as KeyboardKeycode] }}</n-button>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing :title="t('key_selector_keyboard_config')">
                        <n-button :type="(((binding & 0xFF) == Keycode.KeyboardOperation) && (((binding >> 8) & 0x3F) >= KeyboardKeycode.KeyboardConfigBase)) ? 'primary' : ''"
                            @click="{handleFullKeycodeClick((keyboard_config_control_value << 14) | (Number(keyboard_config_value) + KeyboardKeycode.KeyboardConfigBase) << 8 | Keycode.KeyboardOperation); console.log(keyboard_config_control_value, keyboard_config_value)}">
                            {{ "Keyboard Config" }}</n-button>
                        <n-flex>
                            <n-grid :cols="4">
                                <n-gi :span="1">
                                    <n-select :options="keyboard_config_control_options" @update:value="handleKeyboardConfigControl" v-model:value="keyboard_config_control_value" ></n-select>
                                </n-gi>
                                <n-gi :span="3">
                                    <n-select :options="keyboard_config_options" @update:value="handleKeyboardConfig" v-model:value="keyboard_config_value" max="15" min="0"></n-select>
                                </n-gi>
                            </n-grid>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing  :title="t('key_selector_user')">
                        <n-button :type="((binding & 0xFF) == Keycode.KeyUser) ? 'primary' : ''"
                            @click="handleKeycodeClick(Keycode.KeyUser)">
                            {{ keyCodeToKeyName[Keycode.KeyUser] }}</n-button>
                        <n-flex>
                            <n-input-number @update:value="handleUserNumber" max="255" min="0"></n-input-number>
                        </n-flex>
                    </n-thing>
                </n-list-item>
                <n-list-item>
                    <n-thing  :title="t('key_selector_transparent')">
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
