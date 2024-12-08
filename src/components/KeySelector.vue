<script setup lang="ts">
import { ref } from 'vue';
import { keyboardEventToHidCodeMap, keyCodeToKeyName, keyModifierToKeyName } from "../apis/utils"
import { KeyCode, KeyModifier } from "emi-keyboard-controller"
import { useMessage } from 'naive-ui';

const message = useMessage();

const props = defineProps<{ binding: number }>();
const emit = defineEmits(['update:binding']);

function handleKeyModifierClick(key : number | string | KeyCode)
{
    var modifier = (props.binding>>8)&0xFF;
    if ((modifier & key as number) > 0) {
        modifier &= ~(key as number);
    }
    else
    {
        modifier |= key as number;
    }
    emit('update:binding', props.binding & 0xFF | (modifier << 8));
}

function handleKeyCodeClick(key : number | string | KeyCode)
{
    emit('update:binding', (props.binding & 0xFF00 | key as number));
}

console.log(Object.keys(KeyCode));

</script>
<template>
    <n-list vertical>
        <n-list-item>
            <n-thing title="Modifiers">
                <n-button v-for="(key, index) in Object.keys(KeyModifier)
                    .slice(1, 9)"
                    @click="handleKeyModifierClick(key)"
                    :type="((props.binding >> 8) & 0xFF & (key as unknown as number)) > 0 ? 'primary' : ''">
                    {{ keyModifierToKeyName[key as unknown as KeyModifier] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Event">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.NoEvent, KeyCode.ErrorUndefined + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Alphabet Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.A, KeyCode.Z + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Numbertic Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.Key1, KeyCode.Key0 + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Control Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.Enter, KeyCode.Tab + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Symbols">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.Spacebar, KeyCode.Slash + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Function Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.CapsLock, KeyCode.Pause + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Navigation Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.Insert, KeyCode.UpArrow + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Keypad">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.NumLock, KeyCode.KeypadDot + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Additional Symbols and Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.NonUsBackslash, KeyCode.KeypadEqual + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Extended Function Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.F13, KeyCode.F24 + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Media and System Control Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.Execute, KeyCode.VolumeDown + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Locking Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.LockingCapsLock, KeyCode.LockingScrollLock + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="International and Language-Specific Keys">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.KeypadComma, KeyCode.Lang9 + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Additional Commands and Editing">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.AlternateErase, KeyCode.ExSel + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Mouse">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.MouseLButton, KeyCode.MouseWheelDown + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
        <n-list-item>
            <n-thing title="Function">
                <n-button v-for="(key, code) in Object.keys(KeyCode)
                    //.filter(key => isNaN(Number(key)))
                    .slice(KeyCode.FN, KeyCode.FN + 1)"
                    :type="((props.binding & 0xFF) == (key as unknown as number))? 'primary' : ''"
                    @click="handleKeyCodeClick(key)">
                    {{ keyCodeToKeyName[key as unknown as KeyCode] }}</n-button>
            </n-thing>
        </n-list-item>
    </n-list>
</template>

<style scoped></style>
