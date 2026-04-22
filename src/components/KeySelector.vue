<script setup lang="ts">
import { computed, ref, triggerRef } from 'vue';
import { keyboardEventToHidCodeMap, keyCodeToKeyName, keyModifierToKeyName, LayerControlToKeyName, MouseKeycodeToKeyName, KeyboardOperationToKeyName, ConsumerKeyToKeyName, SystemKeyToKeyName, JoystickKeycodeToKeyName, MIDIKeyToKeyName, MIDINoteName, KeyboardConfigToKeyName, MacroKeycodeToKeyName, GamepadKeycodeToKeyName, ScriptKeycodeToKeyName } from "@/apis/utils"
import { Keycode, KeyModifier, LayerControlKeycode, MouseKeycode, KeyboardKeycode, ConsumerKeycode, SystemRawKeycode, JoystickKeycode, MIDIKeycode, KeyboardConfigCode, MacroKeycode, GamepadKeycode, ScriptKeycode } from "emi-keyboard-controller"
import { SelectOption, useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { values } from 'lodash';
import KeyButtonGroup from './KeyButtonGroup.vue';

const { t } = useI18n();
const message = useMessage();

const binding = defineModel("binding", {default : 0});

const allSections = computed(() => [
  { id: 'key_selector_modifiers', title: t('key_selector_modifiers'), type: 'normal' },
  { id: 'key_selector_event', title: t('key_selector_event'), type: 'normal' },
  { id: 'key_selector_alphabet', title: t('key_selector_alphabet'), type: 'normal' },
  { id: 'key_selector_numbertic', title: t('key_selector_numbertic'), type: 'normal' },
  { id: 'key_selector_control', title: t('key_selector_control'), type: 'normal' },
  { id: 'key_selector_symbols', title: t('key_selector_symbols'), type: 'normal' },
  { id: 'key_selector_function', title: t('key_selector_function'), type: 'normal' },
  { id: 'key_selector_navigation', title: t('key_selector_navigation'), type: 'normal' },
  { id: 'key_selector_keypad', title: t('key_selector_keypad'), type: 'normal' },
  { id: 'key_selector_additional_symbols_and_keys', title: t('key_selector_additional_symbols_and_keys'), type: 'normal' },
  { id: 'key_selector_extended_function', title: t('key_selector_extended_function'), type: 'normal' },
  { id: 'key_selector_media_and_system_control', title: t('key_selector_media_and_system_control'), type: 'normal' },
  { id: 'key_selector_locking', title: t('key_selector_locking'), type: 'normal' },
  { id: 'key_selector_international', title: t('key_selector_international'), type: 'normal' },
  { id: 'key_selector_additional_command_and_editing', title: t('key_selector_additional_command_and_editing'), type: 'normal' },
  // ... 继续添加 Normal 部分的所有 ID
  { id: 'key_selector_mouse', title: t('key_selector_mouse'), type: 'others' },
  { id: 'key_selector_consumer', title: t('key_selector_consumer'), type: 'others' },
  { id: 'key_selector_system', title: t('key_selector_system'), type: 'others' },
  { id: 'key_selector_joystick', title: t('key_selector_joystick'), type: 'others' },
  { id: 'key_selector_script', title: t('key_selector_script'), type: 'others' },
  { id: 'key_selector_gamepad', title: t('key_selector_gamepad'), type: 'others' },
  { id: 'key_selector_midi', title: t('key_selector_midi'), type: 'others' },
  { id: 'key_selector_midi_note', title: t('key_selector_midi_note'), type: 'others' },
  { id: 'key_selector_macro', title: t('key_selector_macro'), type: 'others' },
  { id: 'key_selector_layer', title: t('key_selector_layer'), type: 'others' },
  { id: 'key_selector_keyboard', title: t('key_selector_keyboard'), type: 'others' },
  { id: 'key_selector_keyboard_profile', title: t('key_selector_keyboard_profile'), type: 'others' },
  { id: 'key_selector_user', title: t('key_selector_user'), type: 'others' },
  { id: 'key_selector_transparent', title: t('key_selector_transparent'), type: 'others' },
]);

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
    binding.value = (binding.value & 0xf0ff) | ((n as number) & 0x0f) << 8 | Keycode.MacroCollection;
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

const keyboard_config_options = Object.keys(KeyboardConfigCode).slice(0,4).map((key) => {
    return {
        value: key,
        label: KeyboardConfigToKeyName[key as unknown as KeyboardConfigCode]
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
const keyboard_config_value = ref((KeyboardConfigCode.KeyboardConfigDebug as number).toString());
const scrollContainerRef = ref<HTMLElement | null>(null);
const handleAnchorClick = (e: MouseEvent) => {
  const link = (e.target as HTMLElement).closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (href && href.startsWith('#')) {
    e.preventDefault(); 
    
    const targetId = href.slice(1);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      // 呼叫原生 API，结合我们刚写的 scroll-margin-top，完美精准对齐！
      // block: 'start' 意思是让元素的顶部对齐滚动容器的顶部
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
};
const rightPanelRef = ref<HTMLElement | null>(null);
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
const syncRightScroll = () => {
  if (scrollTimeout) return; 
  
  scrollTimeout = setTimeout(() => {
    if (rightPanelRef.value) {
      // 找到当前右侧处于激活状态的锚点
      const activeLink = rightPanelRef.value.querySelector('.n-anchor-link--active');
      
      if (activeLink) {
        // 使用原生 API 滚动到可视区域
        // block: 'nearest' 非常智能：如果元素已经在视野内，它不会乱动；如果超出了视野，它会以最小距离把它拉回边缘
        activeLink.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }
    scrollTimeout = null;
  }, 100); // 100ms 的延迟既能保证视觉跟随，又不会卡顿
};
</script>
<template>
    <div style="display: flex; height: 100%; width: 100%; overflow: hidden;"  @wheel.stop>
        
        <div ref="scrollContainerRef" id="key-selector-scroll-container" style="flex: 1; height: 100%; position: relative;">
            
            <n-scrollbar id="left-key-scrollbar" @scroll="syncRightScroll">
                <n-list vertical clickable>
                    <KeyButtonGroup id="key_selector_modifiers" :title="t('key_selector_modifiers')">
                      <n-space vertical>
                        <n-button @click="() => { binding = binding & 0xFF; }">Clear</n-button>
                        <n-button-group>
                          <n-button 
                            v-for="key in Object.keys(KeyModifier).slice(1, 9)" 
                            :key="key"
                            @click="handleKeyModifierClick(key)"
                            :type="(((binding >> 8) & 0xFF & Number(key)) > 0) ? 'primary' : ''"
                          >
                            {{ keyModifierToKeyName[Number(key) as KeyModifier] }}
                          </n-button>
                        </n-button-group>
                      </n-space>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_event" :title="t('key_selector_event')"
                      :keys="Object.keys(Keycode).slice(Keycode.NoEvent, Keycode.ErrorUndefined + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_alphabet" :title="t('key_selector_alphabet')"
                      :keys="Object.keys(Keycode).slice(Keycode.A, Keycode.Z + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_numbertic" :title="t('key_selector_numbertic')"
                      :keys="Object.keys(Keycode).slice(Keycode.Key1, Keycode.Key0 + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_control" :title="t('key_selector_control')"
                      :keys="Object.keys(Keycode).slice(Keycode.Enter, Keycode.Tab + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_symbols" :title="t('key_selector_symbols')"
                      :keys="Object.keys(Keycode).slice(Keycode.Spacebar, Keycode.Slash + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_function" :title="t('key_selector_function')"
                      :keys="Object.keys(Keycode).slice(Keycode.CapsLock, Keycode.Pause + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_navigation" :title="t('key_selector_navigation')"
                      :keys="Object.keys(Keycode).slice(Keycode.Insert, Keycode.UpArrow + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_keypad" :title="t('key_selector_keypad')"
                      :keys="Object.keys(Keycode).slice(Keycode.NumLock, Keycode.KeypadDot + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_additional_symbols_and_keys" :title="t('key_selector_additional_symbols_and_keys')"
                      :keys="Object.keys(Keycode).slice(Keycode.NonUsBackslash, Keycode.KeypadEqual + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_extended_function" :title="t('key_selector_extended_function')"
                      :keys="Object.keys(Keycode).slice(Keycode.F13, Keycode.F24 + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_media_and_system_control" :title="t('key_selector_media_and_system_control')"
                      :keys="Object.keys(Keycode).slice(Keycode.Execute, Keycode.VolumeDown + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_locking" :title="t('key_selector_locking')"
                      :keys="Object.keys(Keycode).slice(Keycode.LockingCapsLock, Keycode.LockingScrollLock + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_international" :title="t('key_selector_international')"
                      :keys="Object.keys(Keycode).slice(Keycode.KeypadComma, Keycode.Lang9 + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_additional_command_and_editing" :title="t('key_selector_additional_command_and_editing')"
                      :keys="Object.keys(Keycode).slice(Keycode.AlternateErase, Keycode.ExSel + 1)"
                      :active-fn="(k) => (binding & 0xFF) == Number(k)"
                      :label-fn="(k) => keyCodeToKeyName[Number(k) as Keycode]"
                      @click-key="handleKeycodeClick" />
                
                    <KeyButtonGroup id="key_selector_mouse" :title="t('key_selector_mouse')"
                      :keys="Object.keys(MouseKeycode).slice(MouseKeycode.MouseLButton, MouseKeycode.MouseWheelRight + 5)"
                      :active-fn="(k) => (binding & 0xFF) == Keycode.MouseCollection && ((binding >> 8) & 0xFF) == Number(k)"
                      :label-fn="(k) => MouseKeycodeToKeyName[Number(k) as MouseKeycode]"
                      @click-key="(k) => handleFullKeycodeClick(Number(k) << 8 | Keycode.MouseCollection)" />
                
                    <KeyButtonGroup id="key_selector_consumer" :title="t('key_selector_consumer')"
                      :keys="Object.keys(ConsumerKeycode).slice(0, 0x31)"
                      :active-fn="(k) => (binding & 0xFF) == Keycode.ConsumerCollection && ((binding >> 8) & 0xFF) == Number(k)"
                      :label-fn="(k) => ConsumerKeyToKeyName[Number(k) as ConsumerKeycode]"
                      @click-key="(k) => handleFullKeycodeClick(Number(k) << 8 | Keycode.ConsumerCollection)" />
                
                    <KeyButtonGroup id="key_selector_system" :title="t('key_selector_system')"
                      :keys="Object.keys(SystemRawKeycode).slice(0, 5)"
                      :active-fn="(k) => (binding & 0xFF) == Keycode.SystemCollection && ((binding >> 8) & 0xFF) == Number(k)"
                      :label-fn="(k) => SystemKeyToKeyName[Number(k) as SystemRawKeycode]"
                      @click-key="(k) => handleFullKeycodeClick(Number(k) << 8 | Keycode.SystemCollection)" />
                
                    <KeyButtonGroup id="key_selector_script" :title="t('key_selector_script')"
                      :keys="Object.keys(ScriptKeycode).slice(0, 6)"
                      :active-fn="(k) => (binding & 0xFF) == Keycode.ScriptCollection && ((binding >> 8) & 0xFF) == Number(k)"
                      :label-fn="(k) => ScriptKeycodeToKeyName[Number(k) as ScriptKeycode]"
                      @click-key="(k) => handleFullKeycodeClick(Number(k) << 8 | Keycode.ScriptCollection)" />
                
                    <KeyButtonGroup id="key_selector_gamepad" :title="t('key_selector_gamepad')"
                      :keys="Object.keys(GamepadKeycode).slice(0, 28)"
                      :active-fn="(k) => (binding & 0xFF) == Keycode.GamepadCollection && ((binding >> 8) & 0xFF) == Number(k)"
                      :label-fn="(k) => GamepadKeycodeToKeyName[Number(k) as GamepadKeycode]"
                      @click-key="(k) => handleFullKeycodeClick(Number(k) << 8 | Keycode.GamepadCollection)" />
                
                    <KeyButtonGroup id="key_selector_keyboard" :title="t('key_selector_keyboard')"
                      :keys="Object.keys(KeyboardKeycode).slice(0, 13)"
                      :active-fn="(k) => (binding & 0xFF) == Keycode.KeyboardOperation && (((binding >> 8) & 0x3F) < 0x20) && ((binding >> 8) & 0x3F) == Number(k)"
                      :label-fn="(k) => KeyboardOperationToKeyName[Number(k) as KeyboardKeycode]"
                      @click-key="(k) => handleFullKeycodeClick(Number(k) << 8 | Keycode.KeyboardOperation)" />
                
                    <KeyButtonGroup id="key_selector_joystick" :title="t('key_selector_joystick')">
                      <n-button :type="((binding & 0xFF) == Keycode.JoystickCollection) ? 'primary' : ''" @click="handleKeycodeClick(Keycode.JoystickCollection)">
                        {{ keyCodeToKeyName[Keycode.JoystickCollection] }}
                      </n-button>
                      <n-grid :cols="4" style="width: 100%; margin-top: 8px;">
                        <n-gi :span="1">
                          <n-select :options="joystick_options" @update:value="handleJoystickControl" v-model:value="joystick_collection_value"></n-select>
                        </n-gi>
                        <n-gi :span="3">
                          <n-input-number @update:value="handleJoystickNumber" v-model:value="joystick_value" max="15" min="0"></n-input-number>
                        </n-gi>
                      </n-grid>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_midi" :title="t('key_selector_midi')">
                      <n-flex vertical style="gap: 8px; margin-top: 8px;">
                        <n-flex v-for="sliceArgs in [
                          [MIDIKeycode.On, MIDIKeycode.Toggle + 1],
                          [MIDIKeycode.NoteC0, MIDIKeycode.NoteB0 + 1],
                          [MIDIKeycode.NoteC1, MIDIKeycode.NoteB1 + 1],
                          [MIDIKeycode.NoteC2, MIDIKeycode.NoteB2 + 1],
                          [MIDIKeycode.NoteC3, MIDIKeycode.NoteB3 + 1],
                          [MIDIKeycode.NoteC4, MIDIKeycode.NoteB4 + 1],
                          [MIDIKeycode.OctaveN2, MIDIKeycode.OctaveUp + 1],
                          [MIDIKeycode.TransposeN6, MIDIKeycode.TransposeUp + 1],
                          [MIDIKeycode.Velocity0, MIDIKeycode.VelocityUp + 1],
                          [MIDIKeycode.Channel1, MIDIKeycode.ChannelUp + 1],
                          [MIDIKeycode.AllNotesOff, MIDIKeycode.PitchBendUp + 1]
                        ]" :key="sliceArgs[0]">
                          <n-button v-for="key in Object.keys(MIDIKeycode).slice(sliceArgs[0], sliceArgs[1])" :key="key"
                            :type="((binding & 0xFF) == Keycode.MIDICollection && ((binding >> 8) & 0xFF) == Number(key)) ? 'primary' : ''"
                            @click="handleFullKeycodeClick(Number(key) << 8 | Keycode.MIDICollection)">
                            {{ MIDIKeyToKeyName[Number(key) as MIDIKeycode] }}
                          </n-button>
                        </n-flex>
                      </n-flex>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_midi_note" :title="t('key_selector_midi_note')">
                      <n-button :type="((binding & 0xFF) == Keycode.MIDINote) ? 'primary' : ''" @click="handleKeycodeClick(Keycode.MIDINote)">
                        {{ keyCodeToKeyName[Keycode.MIDINote] }}
                      </n-button>
                      <n-grid :cols="4" style="width: 100%; margin-top: 8px;">
                        <n-gi :span="1">
                          <n-select :options="midi_note_options" @update:value="handleMIDINote" v-model:value="midi_note_value"></n-select>
                        </n-gi>
                        <n-gi :span="3">
                          <n-input-number @update:value="handleMIDINoteNumber" v-model:value="midi_value" max="10" min="0"></n-input-number>
                        </n-gi>
                      </n-grid>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_macro" :title="t('key_selector_macro')">
                      <n-button v-for="key in Object.keys(MacroKeycode).slice(MacroKeycode.MacroRecordingStart, MacroKeycode.MacroPlayingPause + 1)" :key="key"
                        :type="((binding & 0xFF) == Keycode.MacroCollection && ((binding >> 12) & 0xF) == Number(key)) ? 'primary' : ''"
                        @click="handleFullKeycodeClick((Number(key) << 12) | (macro_index & 0x0f) << 8 | Keycode.MacroCollection)">
                        {{ MacroKeycodeToKeyName[Number(key) as MacroKeycode] }}
                      </n-button>
                      <n-input-number style="width: 100%; margin-top: 8px;" @update:value="handleMacroIndex" v-model:value="macro_index" max="3" min="0"></n-input-number>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_layer" :title="t('key_selector_layer')">
                      <n-button :type="((binding & 0xFF) == Keycode.LayerControl) ? 'primary' : ''" @click="handleKeycodeClick(Keycode.LayerControl)">
                        {{ keyCodeToKeyName[Keycode.LayerControl] }}
                      </n-button>
                      <n-grid :cols="4" style="width: 100%; margin-top: 8px;">
                        <n-gi :span="1">
                          <n-select :options="layer_options" @update:value="handleLayerControl" v-model:value="layer_control_value"></n-select>
                        </n-gi>
                        <n-gi :span="3">
                          <n-input-number @update:value="handleLayerNumber" v-model:value="layer_value" max="15" min="0"></n-input-number>
                        </n-gi>
                      </n-grid>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_keyboard_profile" :title="t('key_selector_keyboard_profile')">
                      <n-button
                        :type="(((binding & 0xFF) == Keycode.KeyboardOperation) && (((binding >> 8) & 0x3F) >= KeyboardKeycode.KeyboardConfigBase)) ? 'primary' : ''"
                        @click="handleFullKeycodeClick((keyboard_config_control_value << 14) | (Number(keyboard_config_value) + KeyboardKeycode.KeyboardConfigBase) << 8 | Keycode.KeyboardOperation)">
                        Keyboard Profile
                      </n-button>
                      <n-grid :cols="4" style="width: 100%; margin-top: 8px;">
                        <n-gi :span="1">
                          <n-select :options="keyboard_config_control_options" @update:value="handleKeyboardConfigControl" v-model:value="keyboard_config_control_value"></n-select>
                        </n-gi>
                        <n-gi :span="3">
                          <n-select :options="keyboard_config_options" @update:value="handleKeyboardConfig" v-model:value="keyboard_config_value"></n-select>
                        </n-gi>
                      </n-grid>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_user" :title="t('key_selector_user')">
                      <n-button :type="((binding & 0xFF) == Keycode.KeyUser) ? 'primary' : ''" @click="handleKeycodeClick(Keycode.KeyUser)">
                        {{ keyCodeToKeyName[Keycode.KeyUser] }}
                      </n-button>
                      <n-input-number style="width: 100%; margin-top: 8px;" @update:value="handleUserNumber" max="255" min="0"></n-input-number>
                    </KeyButtonGroup>
                
                    <KeyButtonGroup id="key_selector_transparent" :title="t('key_selector_transparent')">
                      <n-button :type="((binding & 0xFF) == Keycode.KeyTransparent) ? 'primary' : ''" @click="handleFullKeycodeClick(Keycode.KeyTransparent)">
                        Transparent
                      </n-button>
                    </KeyButtonGroup>
                </n-list>
                
                </n-scrollbar>
            
                <n-back-top 
                        to="#key-selector-scroll-container"  listen-to="#left-key-scrollbar .n-scrollbar-container"
                        style="
                            position: absolute; 
                        " 
                    />
            
        </div>

        <div ref="rightPanelRef" style="width: 180px; flex-shrink: 0; overflow-y: auto;">
            <n-scrollbar>
                <div @click="handleAnchorClick">
                    <n-anchor :offset-target="'#left-key-scrollbar .n-scrollbar-container'" :bound="32" ignore-gap
                        :type="'block'">
                        <n-anchor-link v-for="item in allSections" :key="item.id" :title="item.title"
                            :href="'#' + item.id" />
                    </n-anchor>
                </div>
            </n-scrollbar>
        </div>

    </div>
</template>

<style scoped>
#left-key-scrollbar .n-list-item {
    scroll-margin-top: 0px;
}
</style>
