import { KeyCode, KeyMode, KeyModifier, MouseKeycode, SystemKeycode, RGBMode, Srgb, LayerControlKeycode } from "emi-keyboard-controller";
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
    //console.log(rgb);
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

export const keyCodeToKeyName: { [key in KeyCode]: string } = {
  [KeyCode.NoEvent]: 'No Event',
  [KeyCode.ErrorOverflow]: 'Error Overflow',
  [KeyCode.PostFail]: 'Post Fail',
  [KeyCode.ErrorUndefined]: 'Error Undefined',

  [KeyCode.A]: 'A',
  [KeyCode.B]: 'B',
  [KeyCode.C]: 'C',
  [KeyCode.D]: 'D',
  [KeyCode.E]: 'E',
  [KeyCode.F]: 'F',
  [KeyCode.G]: 'G',
  [KeyCode.H]: 'H',
  [KeyCode.I]: 'I',
  [KeyCode.J]: 'J',
  [KeyCode.K]: 'K',
  [KeyCode.L]: 'L',
  [KeyCode.M]: 'M',
  [KeyCode.N]: 'N',
  [KeyCode.O]: 'O',
  [KeyCode.P]: 'P',
  [KeyCode.Q]: 'Q',
  [KeyCode.R]: 'R',
  [KeyCode.S]: 'S',
  [KeyCode.T]: 'T',
  [KeyCode.U]: 'U',
  [KeyCode.V]: 'V',
  [KeyCode.W]: 'W',
  [KeyCode.X]: 'X',
  [KeyCode.Y]: 'Y',
  [KeyCode.Z]: 'Z',

  [KeyCode.Key1]: '1',
  [KeyCode.Key2]: '2',
  [KeyCode.Key3]: '3',
  [KeyCode.Key4]: '4',
  [KeyCode.Key5]: '5',
  [KeyCode.Key6]: '6',
  [KeyCode.Key7]: '7',
  [KeyCode.Key8]: '8',
  [KeyCode.Key9]: '9',
  [KeyCode.Key0]: '0',

  [KeyCode.Enter]: 'Enter',
  [KeyCode.Escape]: 'Escape',
  [KeyCode.Backspace]: 'Backspace',
  [KeyCode.Tab]: 'Tab',

  [KeyCode.Spacebar]: 'Spacebar',
  [KeyCode.Minus]: '-',
  [KeyCode.Equal]: '=',
  [KeyCode.LeftBrace]: '[',
  [KeyCode.RightBrace]: ']',
  [KeyCode.Backslash]: '\\',
  [KeyCode.NonUsHash]: '#',
  [KeyCode.Semicolon]: ';',
  [KeyCode.Apostrophe]: "'",
  [KeyCode.Grave]: '`',
  [KeyCode.Comma]: ',',
  [KeyCode.Dot]: '.',
  [KeyCode.Slash]: '/',

  [KeyCode.CapsLock]: 'Caps Lock',
  [KeyCode.F1]: 'F1',
  [KeyCode.F2]: 'F2',
  [KeyCode.F3]: 'F3',
  [KeyCode.F4]: 'F4',
  [KeyCode.F5]: 'F5',
  [KeyCode.F6]: 'F6',
  [KeyCode.F7]: 'F7',
  [KeyCode.F8]: 'F8',
  [KeyCode.F9]: 'F9',
  [KeyCode.F10]: 'F10',
  [KeyCode.F11]: 'F11',
  [KeyCode.F12]: 'F12',
  [KeyCode.PrintScreen]: 'Print Screen',
  [KeyCode.ScrollLock]: 'Scroll Lock',
  [KeyCode.Pause]: 'Pause',

  [KeyCode.Insert]: 'Insert',
  [KeyCode.Home]: 'Home',
  [KeyCode.PageUp]: 'Page Up',
  [KeyCode.Delete]: 'Delete',
  [KeyCode.End]: 'End',
  [KeyCode.PageDown]: 'Page Down',
  [KeyCode.RightArrow]: '→',
  [KeyCode.LeftArrow]: '←',
  [KeyCode.DownArrow]: '↓',
  [KeyCode.UpArrow]: '↑',

  [KeyCode.NumLock]: 'Num Lock',
  [KeyCode.KeypadDivide]: 'Keypad /',
  [KeyCode.KeypadMultiply]: 'Keypad *',
  [KeyCode.KeypadMinus]: 'Keypad -',
  [KeyCode.KeypadPlus]: 'Keypad +',
  [KeyCode.KeypadEnter]: 'Keypad Enter',
  [KeyCode.Keypad1]: 'Keypad 1',
  [KeyCode.Keypad2]: 'Keypad 2',
  [KeyCode.Keypad3]: 'Keypad 3',
  [KeyCode.Keypad4]: 'Keypad 4',
  [KeyCode.Keypad5]: 'Keypad 5',
  [KeyCode.Keypad6]: 'Keypad 6',
  [KeyCode.Keypad7]: 'Keypad 7',
  [KeyCode.Keypad8]: 'Keypad 8',
  [KeyCode.Keypad9]: 'Keypad 9',
  [KeyCode.Keypad0]: 'Keypad 0',
  [KeyCode.KeypadDot]: 'Keypad .',

  [KeyCode.NonUsBackslash]: 'Non US Backslash',
  [KeyCode.Application]: 'Application',
  [KeyCode.Power]: 'Power',
  [KeyCode.KeypadEqual]: 'Keypad =',

  [KeyCode.F13]: 'F13',
  [KeyCode.F14]: 'F14',
  [KeyCode.F15]: 'F15',
  [KeyCode.F16]: 'F16',
  [KeyCode.F17]: 'F17',
  [KeyCode.F18]: 'F18',
  [KeyCode.F19]: 'F19',
  [KeyCode.F20]: 'F20',
  [KeyCode.F21]: 'F21',
  [KeyCode.F22]: 'F22',
  [KeyCode.F23]: 'F23',
  [KeyCode.F24]: 'F24',

  [KeyCode.Execute]: 'Execute',
  [KeyCode.Help]: 'Help',
  [KeyCode.Menu]: 'Menu',
  [KeyCode.Select]: 'Select',
  [KeyCode.Stop]: 'Stop',
  [KeyCode.Again]: 'Again',
  [KeyCode.Undo]: 'Undo',
  [KeyCode.Cut]: 'Cut',
  [KeyCode.Copy]: 'Copy',
  [KeyCode.Paste]: 'Paste',
  [KeyCode.Find]: 'Find',
  [KeyCode.Mute]: 'Mute',
  [KeyCode.VolumeUp]: 'Volume Up',
  [KeyCode.VolumeDown]: 'Volume Down',

  [KeyCode.LockingCapsLock]: 'Locking Caps Lock',
  [KeyCode.LockingNumLock]: 'Locking Num Lock',
  [KeyCode.LockingScrollLock]: 'Locking Scroll Lock',

  [KeyCode.KeypadComma]: 'Keypad ,',
  [KeyCode.KeypadEqualSign]: 'Keypad =',
  [KeyCode.Intl1]: 'Intl1',
  [KeyCode.Intl2]: 'Intl2',
  [KeyCode.Intl3]: 'Intl3',
  [KeyCode.Intl4]: 'Intl4',
  [KeyCode.Intl5]: 'Intl5',
  [KeyCode.Intl6]: 'Intl6',
  [KeyCode.Intl7]: 'Intl7',
  [KeyCode.Intl8]: 'Intl8',
  [KeyCode.Intl9]: 'Intl9',
  [KeyCode.Lang1]: 'Lang1',
  [KeyCode.Lang2]: 'Lang2',
  [KeyCode.Lang3]: 'Lang3',
  [KeyCode.Lang4]: 'Lang4',
  [KeyCode.Lang5]: 'Lang5',
  [KeyCode.Lang6]: 'Lang6',
  [KeyCode.Lang7]: 'Lang7',
  [KeyCode.Lang8]: 'Lang8',
  [KeyCode.Lang9]: 'Lang9',

  [KeyCode.AlternateErase]: 'Alternate Erase',
  [KeyCode.SysReqAttention]: 'SysReq Attention',
  [KeyCode.Cancel]: 'Cancel',
  [KeyCode.Clear]: 'Clear',
  [KeyCode.Prior]: 'Prior',
  [KeyCode.Return]: 'Return',
  [KeyCode.Separator]: 'Separator',
  [KeyCode.Out]: 'Out',
  [KeyCode.Oper]: 'Oper',
  [KeyCode.ClearAgain]: 'Clear Again',
  [KeyCode.CrSelProps]: 'CrSel Props',
  [KeyCode.ExSel]: 'ExSel',
  [KeyCode.MouseCollection]: 'Mouse',
  [KeyCode.LayerControl]: 'Layer Ctrl',
  [KeyCode.FN]: 'FN',
  [KeyCode.KeyUser]: 'User',
  [KeyCode.KeySystem]: 'System',
  [KeyCode.KeyTransparent]: '∇',
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

export const SystemCodeToKeyName: { [key in SystemKeycode]: string } = {
  [SystemKeycode.SystemReset]: 'System Reset',
  [SystemKeycode.SystemFactoryReset]: 'Factory Reset',
  [SystemKeycode.SystemSave]: 'Save to flash',
  [SystemKeycode.SystemBootloader]: 'Jump to Bootloader',
  [SystemKeycode.SystemDebug]: 'Debug',
  [SystemKeycode.SystemResetToDefault]: 'Reset to Default',
  [SystemKeycode.SystemConfig0]: 'Config 0',
  [SystemKeycode.SystemConfig1]: 'Config 1',
  [SystemKeycode.SystemConfig2]: 'Config 2',
  [SystemKeycode.SystemConfig3]: 'Config 3',
};

export const LayerControlToKeyName: { [key in LayerControlKeycode]: string } = {
  [LayerControlKeycode.LayerMomentary]: 'Temporarily switch to',
  [LayerControlKeycode.LayerTurnOn]: 'Turn on',
  [LayerControlKeycode.LayerTurnOff]: 'Turn off',
  [LayerControlKeycode.LayerToggle]: 'Toggle',
};

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
  if (code < KeyCode.ExSel || code == KeyCode.KeyTransparent) 
  {
    mainString = keyCodeToKeyName[code as KeyCode];
    subString = keyBindingModifierToString(keycode);
  }
  else
  {
    switch (code)
    {
      case KeyCode.MouseCollection:
        mainString = MouseKeycodeToKeyName[modifier as MouseKeycode];
        break;
      case KeyCode.LayerControl:
        subString = LayerControlToKeyName[((modifier >> 4) & 0x0F) as LayerControlKeycode];
        mainString = "Layer" + ((modifier) & 0x0F).toString();
        break;
      case KeyCode.KeySystem:
        mainString = SystemCodeToKeyName[modifier as SystemKeycode];
        break;
      case KeyCode.KeyUser:
        mainString = "User " + modifier.toString();
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

export class KeyConfig extends kle.Key {
  declare color: string;
}