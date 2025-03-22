<script setup lang="ts">
import { ref, triggerRef } from 'vue';
import { keyboardEventToHidCodeMap, keyCodeToKeyName, keyModifierToKeyName, LayerControlToKeyName, MouseKeycodeToKeyName, KeyboardOperationToKeyName, ConsumerKeyToKeyName, SystemKeyToKeyName, JoystickKeycodeToKeyName, MIDIKeyToKeyName, MIDINoteName } from "../apis/utils"
import { Keycode, KeyModifier, LayerControlKeycode, MouseKeycode, KeyboardKeycode, ConsumerKeycode, SystemRawKeycode, JoystickKeycode, MIDIKeycode } from "emi-keyboard-controller"
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

const layer_options = Object.keys(LayerControlKeycode).slice(0,4).map((key) => {
    return {
        value: key,
        label: LayerControlToKeyName[key as unknown as LayerControlKeycode]
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
                    <n-thing title="Joystick">
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
                    <n-thing title="MIDI">
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
                    <n-thing title="MIDI Note">
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
                    <n-thing title="Layer">
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
                        <n-button :type="((binding & 0xFF) == Keycode.KeyUser) ? 'primary' : ''"
                            @click="handleKeycodeClick(Keycode.KeyUser)">
                            {{ keyCodeToKeyName[Keycode.KeyUser] }}</n-button>
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
