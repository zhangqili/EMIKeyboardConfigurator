import { Srgb } from "./interface";

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
    console.log(rgb);
    throw new Error('RGB values must be between 0 and 255');
  }

  // 将每个颜色分量转为两位的十六进制字符串，并拼接成最终的颜色字符串
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

  return `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;
}