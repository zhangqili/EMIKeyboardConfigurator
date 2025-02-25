import { Keycode, KeyMode, KeyModifier, MouseKeycode, KeyboardKeycode, RGBMode, Srgb, LayerControlKeycode, DynamicKeyType, IDynamicKey, IDynamicKeyMutex, DynamicKeyMutex, ConsumerKeycode, SystemRawKeycode} from "emi-keyboard-controller";
import * as kle from "@ijprest/kle-serial";

export const keyboardEventToHidCodeMap: Record<string, number> = {
  // 字母键
  KeyA: 0x04,
  KeyB: 0x05,
  KeyC: 0x06,
  KeyD: 0x07,
  KeyE: 0x08,
  KeyF: 0x09,
  KeyG: 0x0A,
  KeyH: 0x0B,
  KeyI: 0x0C,
  KeyJ: 0x0D,
  KeyK: 0x0E,
  KeyL: 0x0F,
  KeyM: 0x10,
  KeyN: 0x11,
  KeyO: 0x12,
  KeyP: 0x13,
  KeyQ: 0x14,
  KeyR: 0x15,
  KeyS: 0x16,
  KeyT: 0x17,
  KeyU: 0x18,
  KeyV: 0x19,
  KeyW: 0x1A,
  KeyX: 0x1B,
  KeyY: 0x1C,
  KeyZ: 0x1D,

  // 数字键 (顶部数字键盘)
  Digit1: 0x1E,
  Digit2: 0x1F,
  Digit3: 0x20,
  Digit4: 0x21,
  Digit5: 0x22,
  Digit6: 0x23,
  Digit7: 0x24,
  Digit8: 0x25,
  Digit9: 0x26,
  Digit0: 0x27,

  // 功能键
  Enter: 0x28,
  Escape: 0x29,
  Backspace: 0x2A,
  Tab: 0x2B,
  Space: 0x2C,

  // 符号键
  Minus: 0x2D, // '-'
  Equal: 0x2E, // '='
  BracketLeft: 0x2F, // '['
  BracketRight: 0x30, // ']'
  Backslash: 0x31, // '\'
  Semicolon: 0x33, // ';'
  Quote: 0x34, // "'"
  Backquote: 0x35, // '`'
  Comma: 0x36, // ','
  Period: 0x37, // '.'
  Slash: 0x38, // '/'

  // 功能键区
  CapsLock: 0x39,
  F1: 0x3A,
  F2: 0x3B,
  F3: 0x3C,
  F4: 0x3D,
  F5: 0x3E,
  F6: 0x3F,
  F7: 0x40,
  F8: 0x41,
  F9: 0x42,
  F10: 0x43,
  F11: 0x44,
  F12: 0x45,

  // 控制键
  PrintScreen: 0x46,
  ScrollLock: 0x47,
  Pause: 0x48,
  Insert: 0x49,
  Home: 0x4A,
  PageUp: 0x4B,
  Delete: 0x4C,
  End: 0x4D,
  PageDown: 0x4E,
  ArrowRight: 0x4F,
  ArrowLeft: 0x50,
  ArrowDown: 0x51,
  ArrowUp: 0x52,

  // 小键盘 (NumPad)
  NumLock: 0x53,
  NumpadDivide: 0x54,
  NumpadMultiply: 0x55,
  NumpadSubtract: 0x56,
  NumpadAdd: 0x57,
  NumpadEnter: 0x58,
  Numpad1: 0x59,
  Numpad2: 0x5A,
  Numpad3: 0x5B,
  Numpad4: 0x5C,
  Numpad5: 0x5D,
  Numpad6: 0x5E,
  Numpad7: 0x5F,
  Numpad8: 0x60,
  Numpad9: 0x61,
  Numpad0: 0x62,
  NumpadDecimal: 0x63,

  // 系统键
  ControlLeft: 0xE0,
  ShiftLeft: 0xE1,
  AltLeft: 0xE2,
  MetaLeft: 0xE3, // Windows/Command
  ControlRight: 0xE4,
  ShiftRight: 0xE5,
  AltRight: 0xE6,
  MetaRight: 0xE7,
};

export function rgbToHex(rgb: Srgb): string {
  // 检查每个颜色分量是否在有效范围内 (0-255)
  if (rgb.red < 0 || rgb.red > 255 || rgb.green < 0 || rgb.green > 255 || rgb.blue < 0 || rgb.blue > 255) {
    throw new Error('RGB values must be between 0 and 255');
  }

  // 将每个颜色分量转为两位的十六进制字符串，并拼接成最终的颜色字符串
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

  return `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;
}


export const keyModeDisplayMap: Record<KeyMode, string> = {
  [KeyMode.KeyDigitalMode]: "Digital",
  [KeyMode.KeyAnalogNormalMode]: "Trad",
  [KeyMode.KeyAnalogRapidMode]: "RT",
  [KeyMode.KeyAnalogSpeedMode]: "Speed",
};

export const rgbModeDisplayMap: Record<RGBMode, string> = {
  [RGBMode.RgbModeFixed]: "Fixed",
  [RGBMode.RgbModeStatic]: "Static",
  [RGBMode.RgbModeCycle]: "Cycle",
  [RGBMode.RgbModeLinear]: "Linear",
  [RGBMode.RgbModeTrigger]: "Trigger",
  [RGBMode.RgbModeString]: "String",
  [RGBMode.RgbModeFadingString]: "Fading\nString",
  [RGBMode.RgbModeDiamondRipple]: "Diamond\nRipple",
  [RGBMode.RgbModeFadingDiamondRipple]: "Fading\nDiamond\nRipple",
  [RGBMode.RgbModeJelly]: "Jelly",
};

export const keyCodeToKeyName: { [key in Keycode]: string } = {
  [Keycode.NoEvent]: 'No Event',
  [Keycode.ErrorOverflow]: 'Error Overflow',
  [Keycode.PostFail]: 'Post Fail',
  [Keycode.ErrorUndefined]: 'Error Undefined',

  [Keycode.A]: 'A',
  [Keycode.B]: 'B',
  [Keycode.C]: 'C',
  [Keycode.D]: 'D',
  [Keycode.E]: 'E',
  [Keycode.F]: 'F',
  [Keycode.G]: 'G',
  [Keycode.H]: 'H',
  [Keycode.I]: 'I',
  [Keycode.J]: 'J',
  [Keycode.K]: 'K',
  [Keycode.L]: 'L',
  [Keycode.M]: 'M',
  [Keycode.N]: 'N',
  [Keycode.O]: 'O',
  [Keycode.P]: 'P',
  [Keycode.Q]: 'Q',
  [Keycode.R]: 'R',
  [Keycode.S]: 'S',
  [Keycode.T]: 'T',
  [Keycode.U]: 'U',
  [Keycode.V]: 'V',
  [Keycode.W]: 'W',
  [Keycode.X]: 'X',
  [Keycode.Y]: 'Y',
  [Keycode.Z]: 'Z',

  [Keycode.Key1]: '1',
  [Keycode.Key2]: '2',
  [Keycode.Key3]: '3',
  [Keycode.Key4]: '4',
  [Keycode.Key5]: '5',
  [Keycode.Key6]: '6',
  [Keycode.Key7]: '7',
  [Keycode.Key8]: '8',
  [Keycode.Key9]: '9',
  [Keycode.Key0]: '0',

  [Keycode.Enter]: 'Enter',
  [Keycode.Escape]: 'Escape',
  [Keycode.Backspace]: 'Backspace',
  [Keycode.Tab]: 'Tab',

  [Keycode.Spacebar]: 'Spacebar',
  [Keycode.Minus]: '-',
  [Keycode.Equal]: '=',
  [Keycode.LeftBrace]: '[',
  [Keycode.RightBrace]: ']',
  [Keycode.Backslash]: '\\',
  [Keycode.NonUsHash]: '#',
  [Keycode.Semicolon]: ';',
  [Keycode.Apostrophe]: "'",
  [Keycode.Grave]: '`',
  [Keycode.Comma]: ',',
  [Keycode.Dot]: '.',
  [Keycode.Slash]: '/',

  [Keycode.CapsLock]: 'Caps Lock',
  [Keycode.F1]: 'F1',
  [Keycode.F2]: 'F2',
  [Keycode.F3]: 'F3',
  [Keycode.F4]: 'F4',
  [Keycode.F5]: 'F5',
  [Keycode.F6]: 'F6',
  [Keycode.F7]: 'F7',
  [Keycode.F8]: 'F8',
  [Keycode.F9]: 'F9',
  [Keycode.F10]: 'F10',
  [Keycode.F11]: 'F11',
  [Keycode.F12]: 'F12',
  [Keycode.PrintScreen]: 'Print Screen',
  [Keycode.ScrollLock]: 'Scroll Lock',
  [Keycode.Pause]: 'Pause',

  [Keycode.Insert]: 'Insert',
  [Keycode.Home]: 'Home',
  [Keycode.PageUp]: 'Page Up',
  [Keycode.Delete]: 'Delete',
  [Keycode.End]: 'End',
  [Keycode.PageDown]: 'Page Down',
  [Keycode.RightArrow]: '→',
  [Keycode.LeftArrow]: '←',
  [Keycode.DownArrow]: '↓',
  [Keycode.UpArrow]: '↑',

  [Keycode.NumLock]: 'Num Lock',
  [Keycode.KeypadDivide]: 'Keypad /',
  [Keycode.KeypadMultiply]: 'Keypad *',
  [Keycode.KeypadMinus]: 'Keypad -',
  [Keycode.KeypadPlus]: 'Keypad +',
  [Keycode.KeypadEnter]: 'Keypad Enter',
  [Keycode.Keypad1]: 'Keypad 1',
  [Keycode.Keypad2]: 'Keypad 2',
  [Keycode.Keypad3]: 'Keypad 3',
  [Keycode.Keypad4]: 'Keypad 4',
  [Keycode.Keypad5]: 'Keypad 5',
  [Keycode.Keypad6]: 'Keypad 6',
  [Keycode.Keypad7]: 'Keypad 7',
  [Keycode.Keypad8]: 'Keypad 8',
  [Keycode.Keypad9]: 'Keypad 9',
  [Keycode.Keypad0]: 'Keypad 0',
  [Keycode.KeypadDot]: 'Keypad .',

  [Keycode.NonUsBackslash]: 'Non US Backslash',
  [Keycode.Application]: 'Application',
  [Keycode.Power]: 'Power',
  [Keycode.KeypadEqual]: 'Keypad =',

  [Keycode.F13]: 'F13',
  [Keycode.F14]: 'F14',
  [Keycode.F15]: 'F15',
  [Keycode.F16]: 'F16',
  [Keycode.F17]: 'F17',
  [Keycode.F18]: 'F18',
  [Keycode.F19]: 'F19',
  [Keycode.F20]: 'F20',
  [Keycode.F21]: 'F21',
  [Keycode.F22]: 'F22',
  [Keycode.F23]: 'F23',
  [Keycode.F24]: 'F24',

  [Keycode.Execute]: 'Execute',
  [Keycode.Help]: 'Help',
  [Keycode.Menu]: 'Menu',
  [Keycode.Select]: 'Select',
  [Keycode.Stop]: 'Stop',
  [Keycode.Again]: 'Again',
  [Keycode.Undo]: 'Undo',
  [Keycode.Cut]: 'Cut',
  [Keycode.Copy]: 'Copy',
  [Keycode.Paste]: 'Paste',
  [Keycode.Find]: 'Find',
  [Keycode.Mute]: 'Mute',
  [Keycode.VolumeUp]: 'Volume Up',
  [Keycode.VolumeDown]: 'Volume Down',

  [Keycode.LockingCapsLock]: 'Locking Caps Lock',
  [Keycode.LockingNumLock]: 'Locking Num Lock',
  [Keycode.LockingScrollLock]: 'Locking Scroll Lock',

  [Keycode.KeypadComma]: 'Keypad ,',
  [Keycode.KeypadEqualSign]: 'Keypad =',
  [Keycode.Intl1]: 'Intl1',
  [Keycode.Intl2]: 'Intl2',
  [Keycode.Intl3]: 'Intl3',
  [Keycode.Intl4]: 'Intl4',
  [Keycode.Intl5]: 'Intl5',
  [Keycode.Intl6]: 'Intl6',
  [Keycode.Intl7]: 'Intl7',
  [Keycode.Intl8]: 'Intl8',
  [Keycode.Intl9]: 'Intl9',
  [Keycode.Lang1]: 'Lang1',
  [Keycode.Lang2]: 'Lang2',
  [Keycode.Lang3]: 'Lang3',
  [Keycode.Lang4]: 'Lang4',
  [Keycode.Lang5]: 'Lang5',
  [Keycode.Lang6]: 'Lang6',
  [Keycode.Lang7]: 'Lang7',
  [Keycode.Lang8]: 'Lang8',
  [Keycode.Lang9]: 'Lang9',

  [Keycode.AlternateErase]: 'Alternate Erase',
  [Keycode.SysReqAttention]: 'SysReq Attention',
  [Keycode.Cancel]: 'Cancel',
  [Keycode.Clear]: 'Clear',
  [Keycode.Prior]: 'Prior',
  [Keycode.Return]: 'Return',
  [Keycode.Separator]: 'Separator',
  [Keycode.Out]: 'Out',
  [Keycode.Oper]: 'Oper',
  [Keycode.ClearAgain]: 'Clear Again',
  [Keycode.CrSelProps]: 'CrSel Props',
  [Keycode.ExSel]: 'ExSel',
  [Keycode.MouseCollection]: 'Mouse',
  [Keycode.LayerControl]: 'Layer Ctrl',
  [Keycode.DynamicKey]: 'Dynamic Key',
  [Keycode.ConsumerCollection]: "Consumer",
  [Keycode.SystemCollection]: "System",
  [Keycode.FN]: 'FN',
  [Keycode.KeyUser]: 'User',
  [Keycode.KeyboardOperation]: 'Keyboard',
  [Keycode.KeyTransparent]: '∇',
};

export const keyModifierToKeyName: { [key in KeyModifier]: string } = {
  [KeyModifier.KeyNoModifier]: 'No Modifier',
  [KeyModifier.KeyLeftCtrl]: 'Left Ctrl',
  [KeyModifier.KeyLeftShift]: 'Left Shift',
  [KeyModifier.KeyLeftAlt]: 'Left Alt',
  [KeyModifier.KeyLeftGui]: 'Left GUI',
  [KeyModifier.KeyRightCtrl]: 'Right Ctrl',
  [KeyModifier.KeyRightShift]: 'Right Shift',
  [KeyModifier.KeyRightAlt]: 'Right Alt',
  [KeyModifier.KeyRightGui]: 'Right GUI',
};

export const MouseKeycodeToKeyName: { [key in MouseKeycode]: string } = {
  [MouseKeycode.MouseLButton]: 'Mouse Left Button',
  [MouseKeycode.MouseRButton]: 'Mouse Right Button',
  [MouseKeycode.MouseMButton]: 'Mouse Middle Button',
  [MouseKeycode.MouseForward]: 'Mouse Forward',
  [MouseKeycode.MouseBack]: 'Mouse Back',
  [MouseKeycode.MouseWheelUp]: 'Mouse Wheel Up',
  [MouseKeycode.MouseWheelDown]: 'Mouse Wheel Down',
};

export const KeyboardOperationToKeyName: { [key in KeyboardKeycode]: string } = {
  [KeyboardKeycode.KeyboardReboot]: 'Reboot',
  [KeyboardKeycode.KeyboardFactoryReset]: 'Factory Reset',
  [KeyboardKeycode.KeyboardSave]: 'Save to flash',
  [KeyboardKeycode.KeyboardBootloader]: 'Jump to Bootloader',
  [KeyboardKeycode.KeyboardToggleDebug]: 'Debug',
  [KeyboardKeycode.KeyboardResetToDefault]: 'Reset to Default',
  [KeyboardKeycode.KeyboardToggleNKRO]: 'Toggle NKRO',
  [KeyboardKeycode.KeyboardConfig0]: 'Config 0',
  [KeyboardKeycode.KeyboardConfig1]: 'Config 1',
  [KeyboardKeycode.KeyboardConfig2]: 'Config 2',
  [KeyboardKeycode.KeyboardConfig3]: 'Config 3',
};

export const LayerControlToKeyName: { [key in LayerControlKeycode]: string } = {
  [LayerControlKeycode.LayerMomentary]: 'Temporarily switch to',
  [LayerControlKeycode.LayerTurnOn]: 'Turn on',
  [LayerControlKeycode.LayerTurnOff]: 'Turn off',
  [LayerControlKeycode.LayerToggle]: 'Toggle',
};

export const DynamicKeyToKeyName: { [key in DynamicKeyType]: string } = {
  [DynamicKeyType.DynamicKeyNone]: "None",
  [DynamicKeyType.DynamicKeyStroke]: 'Dynamic Key Stroke',
  [DynamicKeyType.DynamicKeyModTap]: 'Mod Tap',
  [DynamicKeyType.DynamicKeyToggleKey]: 'Toggle Key',
  [DynamicKeyType.DynamicKeyMutex]: 'Mutex',
  [DynamicKeyType.DynamicKeyTypeNum]: ""
};

export const ConsumerKeyToKeyName: { [key in ConsumerKeycode]: string } = {
  [ConsumerKeycode.ConsumerSnapshot]: "Snapshot",
  [ConsumerKeycode.ConsumerBrightnessUp]: "Brightness Up",
  [ConsumerKeycode.ConsumerBrightnessDown]: "Brightness Down",
  [ConsumerKeycode.ConsumerTransportRecord]: "Record",
  [ConsumerKeycode.ConsumerTransportFastForward]: "Fast Forward",
  [ConsumerKeycode.ConsumerTransportRewind]: "Rewind",
  [ConsumerKeycode.ConsumerTransportNextTrack]: "Next Track",
  [ConsumerKeycode.ConsumerTransportPrevTrack]: "Previous Track",
  [ConsumerKeycode.ConsumerTransportStop]: "Stop",
  [ConsumerKeycode.ConsumerTransportEject]: "Eject",
  [ConsumerKeycode.ConsumerTransportRandomPlay]: "Random Play",
  [ConsumerKeycode.ConsumerTransportStopEject]: "Stop and Eject",
  [ConsumerKeycode.ConsumerTransportPlayPause]: "Play/Pause",
  [ConsumerKeycode.ConsumerAudioMute]: "Mute",
  [ConsumerKeycode.ConsumerAudioVolUp]: "Volume Up",
  [ConsumerKeycode.ConsumerAudioVolDown]: "Volume Down",
  [ConsumerKeycode.ConsumerAlCcConfig]: "Consumer Control Configuration",
  [ConsumerKeycode.ConsumerAlEmail]: "Email",
  [ConsumerKeycode.ConsumerAlCalculator]: "Calculator",
  [ConsumerKeycode.ConsumerAlLocalBrowser]: "Local Browser",
  [ConsumerKeycode.ConsumerAlLock]: "Lock",
  [ConsumerKeycode.ConsumerAlControlPanel]: "Control Panel",
  [ConsumerKeycode.ConsumerAlAssistant]: "Assistant",
  [ConsumerKeycode.ConsumerAlKeyboardLayout]: "Keyboard Layout",
  [ConsumerKeycode.ConsumerAcNew]: "New",
  [ConsumerKeycode.ConsumerAcOpen]: "Open",
  [ConsumerKeycode.ConsumerAcClose]: "Close",
  [ConsumerKeycode.ConsumerAcExit]: "Exit",
  [ConsumerKeycode.ConsumerAcMaximize]: "Maximize",
  [ConsumerKeycode.ConsumerAcMinimize]: "Minimize",
  [ConsumerKeycode.ConsumerAcSave]: "Save",
  [ConsumerKeycode.ConsumerAcPrint]: "Print",
  [ConsumerKeycode.ConsumerAcProperties]: "Properties",
  [ConsumerKeycode.ConsumerAcUndo]: "Undo",
  [ConsumerKeycode.ConsumerAcCopy]: "Copy",
  [ConsumerKeycode.ConsumerAcCut]: "Cut",
  [ConsumerKeycode.ConsumerAcPaste]: "Paste",
  [ConsumerKeycode.ConsumerAcSelectAll]: "Select All",
  [ConsumerKeycode.ConsumerAcFind]: "Find",
  [ConsumerKeycode.ConsumerAcSearch]: "Search",
  [ConsumerKeycode.ConsumerAcHome]: "Home",
  [ConsumerKeycode.ConsumerAcBack]: "Back",
  [ConsumerKeycode.ConsumerAcForward]: "Forward",
  [ConsumerKeycode.ConsumerAcStop]: "Stop",
  [ConsumerKeycode.ConsumerAcRefresh]: "Refresh",
  [ConsumerKeycode.ConsumerAcBookmarks]: "Bookmarks",
  [ConsumerKeycode.ConsumerAcNextKeyboardLayoutSelect]: "Next Keyboard Layout",
  [ConsumerKeycode.ConsumerAcDesktopShowAllWindows]: "Show All Windows",
  [ConsumerKeycode.ConsumerAcSoftKeyLeft]: "Soft Key Left"
};

export const SystemKeyToKeyName: { [key in SystemRawKeycode]: string } = {
  [SystemRawKeycode.SystemPowerDown]: "Power Down",
  [SystemRawKeycode.SystemSleep]: "Sleep",
  [SystemRawKeycode.SystemWakeUp]: "Wake Up",
  [SystemRawKeycode.SystemRestart]: "Restart",
  [SystemRawKeycode.SystemDisplayToggleIntExt]: "Display Toggle Int Ext"
}
export function layoutControlToString(keybinding: number): string {
  var desc = "";
  for (let i = 0; i < 8; i++) {
    if (((keybinding >> 8) & (1 << i)) > 0) {
      desc += keyModifierToKeyName[(1 << i) as KeyModifier] + " ";
    }
  }
  return desc;
}

export function keyBindingModifierToString(keybinding: number): string {
  var desc = "";
  for (let i = 0; i < 8; i++) {
    if (((keybinding >> 8) & (1 << i)) > 0) {
      desc += keyModifierToKeyName[(1 << i) as KeyModifier] + " ";
    }
  }
  return desc;
}

export function keyCodeToString(keycode: number): {mainString: string, subString: string} {
  var mainString = "";
  var subString = "";
  var modifier = (keycode >> 8) & 0xFF;
  var code = (keycode) & 0xFF;
  if (code < Keycode.ExSel || code == Keycode.KeyTransparent) 
  {
    mainString = keyCodeToKeyName[code as Keycode];
    subString = keyBindingModifierToString(keycode);
  }
  else
  {
    switch (code)
    {
      case Keycode.MouseCollection:
        mainString = MouseKeycodeToKeyName[modifier as MouseKeycode];
        break;
      case Keycode.LayerControl:
        subString = LayerControlToKeyName[((modifier >> 4) & 0x0F) as LayerControlKeycode];
        mainString = "Layer" + ((modifier) & 0x0F).toString();
        break;
      case Keycode.KeyboardOperation:
        mainString = KeyboardOperationToKeyName[modifier as KeyboardKeycode];
        break;
      case Keycode.KeyUser:
        mainString = "User " + modifier.toString();
        break;
      case Keycode.DynamicKey:
        subString = "Dynamic Key"
        mainString = modifier.toString();
        break;
      case Keycode.ConsumerCollection:
        mainString = ConsumerKeyToKeyName[modifier as ConsumerKeycode];
        break;
      case Keycode.SystemCollection:
        mainString = SystemKeyToKeyName[modifier as SystemRawKeycode];
        break;
    }
  }
  return {mainString: mainString, subString: subString};
}


export function keyCodeToStringLabels(keycode: number): string[] {
  const label_item = keyCodeToString(keycode)
  return [label_item.subString,,,,,,label_item.mainString] as string[];
}
export interface DebugDataItem {
    name: string;
    value: [number, number];
}

export function mapDynamicKey(keymap : number[][],dynamic_keys : IDynamicKey[]) : void{
  keymap.forEach((layer,layer_index)=>{
    layer.forEach((item,item_index)=>{
      if ((item & 0xFF) == Keycode.DynamicKey) {
        keymap[layer_index][item_index] = Keycode.NoEvent;
      }
    })
  })
  dynamic_keys.forEach((item,index)=>{
    if (item.type != DynamicKeyType.DynamicKeyNone) {
      item.target_keys_location.forEach((location)=>{
        keymap[location.layer][location.id] = (Keycode.DynamicKey & 0xFF | ((index & 0xFF) << 8));
      });
    }
  });
};

export function mapBackDynamicKey(keymap : number[][],dynamic_keys : IDynamicKey[]) : void{
  keymap.forEach((layer,layer_index)=>{
    layer.forEach((item,item_index)=>{
      if ((item & 0xFF) == Keycode.DynamicKey) {
        const index = ((item >> 8) & 0xFF);
        if (dynamic_keys[index].type == DynamicKeyType.DynamicKeyMutex) {
          dynamic_keys[index].target_keys_location[(dynamic_keys[index] as DynamicKeyMutex).is_key2_primary ? 1 : 0]={layer: layer_index, id: item_index};
          (dynamic_keys[index] as DynamicKeyMutex).is_key2_primary = !(dynamic_keys[index] as DynamicKeyMutex).is_key2_primary;
        }
        else
        {
          dynamic_keys[index].target_keys_location[0]={layer: layer_index, id: item_index};
        }
      }
    })
  });
};

export class KeyConfig extends kle.Key {
  declare color: string;
}