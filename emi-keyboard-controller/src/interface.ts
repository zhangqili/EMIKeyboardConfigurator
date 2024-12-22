// Enum for KeyMode
export enum KeyMode {
    KeyDigitalMode = 0,
    KeyAnalogNormalMode = 1,
    KeyAnalogRapidMode = 2,
    KeyAnalogSpeedMode = 3,
}

// Enum for CalibrationMode
export enum CalibrationMode {
    KeyNoCalibration = 0,
    KeyAutoCalibrationPositive = 1,
    KeyAutoCalibrationNegative = 2,
    KeyAutoCalibrationUndefined = 3,
}

export enum RGBMode {
    RgbModeFixed = 0,
    RgbModeStatic = 1,
    RgbModeCycle = 2,
    RgbModeLinear = 3,
    RgbModeTrigger = 4,
    RgbModeString = 5,
    RgbModeFadingString = 6,
    RgbModeDiamondRipple = 7,
    RgbModeFadingDiamondRipple = 8,
    RgbModeJelly = 9,
}

// Interface for AdvancedKey
export interface IAdvancedKey {
    state: boolean;
    value: number;
    raw: number;
    maximum: number;
    minimum: number;

    mode: KeyMode;
    calibration_mode: CalibrationMode;
    activation_value: number;
    deactivation_value: number;
    trigger_distance: number;
    release_distance: number;
    trigger_speed: number;
    release_speed: number;
    upper_deadzone: number;
    lower_deadzone: number;
    upper_bound: number;
    lower_bound: number;
}
export class AdvancedKey implements IAdvancedKey {
    state: boolean;
    value: number;
    raw: number;
    maximum: number;
    minimum: number;

    mode: KeyMode;
    calibration_mode: CalibrationMode;
    activation_value: number;
    deactivation_value: number;
    trigger_distance: number;
    release_distance: number;
    trigger_speed: number;
    release_speed: number;
    upper_deadzone: number;
    lower_deadzone: number;
    upper_bound: number;
    lower_bound: number;

    constructor() {
        this.value = 0;
        this.state = false;
        this.raw = 0;
        this.maximum = 0;
        this.minimum = 0;
        this.mode = KeyMode.KeyAnalogRapidMode;
        this.calibration_mode = CalibrationMode.KeyNoCalibration;
        this.activation_value = 0.5;
        this.deactivation_value = 0.49;
        this.trigger_distance = 0.08;
        this.release_distance = 0.08;
        this.trigger_speed = 0.01;
        this.release_speed = 0.01;
        this.upper_deadzone = 0.04;
        this.lower_deadzone = 0.2;
        this.upper_bound = 4096.0;
        this.lower_bound = 0;
    }
}

export enum KeyCode {
    // Special Keys
    NoEvent = 0x00,
    ErrorOverflow = 0x01,
    PostFail = 0x02,
    ErrorUndefined = 0x03,

    // Alphabet Keys
    A = 0x04,
    B = 0x05,
    C = 0x06,
    D = 0x07,
    E = 0x08,
    F = 0x09,
    G = 0x0a,
    H = 0x0b,
    I = 0x0c,
    J = 0x0d,
    K = 0x0e,
    L = 0x0f,
    M = 0x10,
    N = 0x11,
    O = 0x12,
    P = 0x13,
    Q = 0x14,
    R = 0x15,
    S = 0x16,
    T = 0x17,
    U = 0x18,
    V = 0x19,
    W = 0x1a,
    X = 0x1b,
    Y = 0x1c,
    Z = 0x1d,

    // Numeric Keys
    Key1 = 0x1e, Key2 = 0x1f, Key3 = 0x20, Key4 = 0x21,
    Key5 = 0x22, Key6 = 0x23, Key7 = 0x24, Key8 = 0x25,
    Key9 = 0x26, Key0 = 0x27,

    // Control Keys
    Enter = 0x28, Escape = 0x29, Backspace = 0x2a, Tab = 0x2b,

    // Symbols
    Spacebar = 0x2c, Minus = 0x2d, Equal = 0x2e, LeftBrace = 0x2f, RightBrace = 0x30,
    Backslash = 0x31, NonUsHash = 0x32, Semicolon = 0x33, Apostrophe = 0x34,
    Grave = 0x35, Comma = 0x36, Dot = 0x37, Slash = 0x38,

    // Function Keys
    CapsLock = 0x39, F1 = 0x3a, F2 = 0x3b, F3 = 0x3c, F4 = 0x3d, F5 = 0x3e,
    F6 = 0x3f, F7 = 0x40, F8 = 0x41, F9 = 0x42, F10 = 0x43, F11 = 0x44, F12 = 0x45,
    PrintScreen = 0x46, ScrollLock = 0x47, Pause = 0x48,

    // Navigation Keys
    Insert = 0x49, Home = 0x4a, PageUp = 0x4b, Delete = 0x4c, End = 0x4d,
    PageDown = 0x4e, RightArrow = 0x4f, LeftArrow = 0x50, DownArrow = 0x51, UpArrow = 0x52,

    // Keypad
    NumLock = 0x53, KeypadDivide = 0x54, KeypadMultiply = 0x55, KeypadMinus = 0x56,
    KeypadPlus = 0x57, KeypadEnter = 0x58, Keypad1 = 0x59, Keypad2 = 0x5a, Keypad3 = 0x5b,
    Keypad4 = 0x5c, Keypad5 = 0x5d, Keypad6 = 0x5e, Keypad7 = 0x5f, Keypad8 = 0x60,
    Keypad9 = 0x61, Keypad0 = 0x62, KeypadDot = 0x63,

    // Additional Symbols and Keys
    NonUsBackslash = 0x64, Application = 0x65, Power = 0x66, KeypadEqual = 0x67,

    // Extended Function Keys
    F13 = 0x68, F14 = 0x69, F15 = 0x6a, F16 = 0x6b, F17 = 0x6c, F18 = 0x6d,
    F19 = 0x6e, F20 = 0x6f, F21 = 0x70, F22 = 0x71, F23 = 0x72, F24 = 0x73,

    // Media and System Control Keys
    Execute = 0x74, Help = 0x75, Menu = 0x76, Select = 0x77, Stop = 0x78,
    Again = 0x79, Undo = 0x7a, Cut = 0x7b, Copy = 0x7c, Paste = 0x7d, Find = 0x7e,
    Mute = 0x7f, VolumeUp = 0x80, VolumeDown = 0x81,

    // Locking Keys
    LockingCapsLock = 0x82, LockingNumLock = 0x83, LockingScrollLock = 0x84,

    // International and Language-Specific Keys
    KeypadComma = 0x85, KeypadEqualSign = 0x86, Intl1 = 0x87, Intl2 = 0x88,
    Intl3 = 0x89, Intl4 = 0x8a, Intl5 = 0x8b, Intl6 = 0x8c, Intl7 = 0x8d,
    Intl8 = 0x8e, Intl9 = 0x8f, Lang1 = 0x90, Lang2 = 0x91, Lang3 = 0x92,
    Lang4 = 0x93, Lang5 = 0x94, Lang6 = 0x95, Lang7 = 0x96, Lang8 = 0x97, Lang9 = 0x98,

    // Additional Commands and Editing
    AlternateErase = 0x99, SysReqAttention = 0x9a, Cancel = 0x9b, Clear = 0x9c,
    Prior = 0x9d, Return = 0x9e, Separator = 0x9f, Out = 0xa0, Oper = 0xa1,
    ClearAgain = 0xa2, CrSelProps = 0xa3, ExSel = 0xa4,

    MouseLButton = 0xa5,
    MouseRButton = 0xa6,
    MouseMButton = 0xa7,
    MouseForward = 0xa8,
    MouseBack = 0xa9,
    MouseWheelUp = 0xaa,
    MouseWheelDown = 0xab,
    FN = 0xac,
}

export enum KeyModifier {
    // HID report data
    KeyNoModifier = 0,
    KeyLeftCtrl = 0x01,
    KeyLeftShift = 0x02,
    KeyLeftAlt = 0x04,
    KeyLeftGui = 0x08,
    KeyRightCtrl = 0x10,
    KeyRightShift = 0x20,
    KeyRightAlt = 0x40,
    KeyRightGui = 0x80,
}

// Generic color interfaces
export interface Srgb {
    red: number;
    green: number;
    blue: number;
}

// Interface for RGBConfig
export interface IRGBConfig {
    mode: RGBMode;
    rgb: Srgb;
    speed: number;
}

export class RGBConfig implements IRGBConfig {
    mode: RGBMode;
    rgb: Srgb;
    speed: number;
    constructor(){
        this.mode = RGBMode.RgbModeLinear;
        this.rgb = {
          red: 163,
          green: 55,
          blue: 252
        };
        this.speed = 0.02;
    }
}


export interface IKeyboardController{
    detect(): Promise<HIDDevice[]>;
    write(buf: Uint8Array) : number;
    read(buf: Uint8Array) : number ;
    read_timeout( buf: Uint8Array, timeout: number) : number;
    connect(device: HIDDevice) : Promise<boolean>;
    disconnect() : void;
    prase_buffer(buf: Uint8Array) : void;
    get_connection_state() : boolean;
    get_advanced_keys() : IAdvancedKey[];
    set_advanced_keys(keys : IAdvancedKey[]) : void;
    get_rgb_switch() : boolean;
    set_rgb_switch(s : boolean) : void;
    get_rgb_configs() : IRGBConfig[];
    set_rgb_configs(configs : IRGBConfig[]) : void;
    get_keymap() : number[][];
    set_keymap(keymap : number[][]) : void;
    fetch_config() : void;
    save_config() : void;
    flash_config() : void;
    system_reset() : void;
    factory_reset() : void;
    start_debug() : void;
    stop_debug() : void;
    get_layout_json() : string;
}


export function AdvancedKeyToBytes(key : IAdvancedKey): Uint8Array {
    const bytes = new Uint8Array(45); // 总共 45 字节
    bytes[0] = key.mode; // 写入 mode (1 字节)

    const fields = [
        key.activation_value,
        key.deactivation_value,
        key.trigger_distance,
        key.release_distance,
        key.trigger_speed,
        key.release_speed,
        key.upper_deadzone,
        key.lower_deadzone,
        key.upper_bound,
        key.lower_bound,
    ];

    let offset = 1; // 从第 2 个字节开始写入
    const dataView = new DataView(bytes.buffer);

    for (let field of fields) {
      dataView.setFloat32(offset, field, true); // 以小端序写入每个 f32 字段
      offset += 4; // 每个 f32 占用 4 个字节
    }

    return bytes;
  }
