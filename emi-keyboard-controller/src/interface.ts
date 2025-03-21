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

export enum DynamicKeyType{
    DynamicKeyNone = 0,
    DynamicKeyStroke = 1,
    DynamicKeyModTap = 2,
    DynamicKeyToggleKey = 3,
    DynamicKeyMutex = 4,
    DynamicKeyTypeNum = 5,    
}

export class KeyLocation{
    layer:number;
    id:number;
    constructor() {
        this.layer = -1;
        this.id = -1;
    }
}

export interface IDynamicKey {
    type : DynamicKeyType | number;
    target_keys_location : KeyLocation[];
    bindings : number[];
    get_primary_binding() : number;
    set_primary_binding(binding : number) : void;
}

export interface IDynamicKeyStroke4x4 extends IDynamicKey {
    key_control : number[];
    press_begin_distance : number;
    press_fully_distance : number;
    release_begin_distance : number;
    release_fully_distance : number;
}

export interface IDynamicKeyModTap extends IDynamicKey {
    duration : number;
}

export interface IDynamicKeyToggleKey extends IDynamicKey {
}

export enum DynamicKeyMutexMode{
    DKMutexDistancePriority = 0,
    DKMutexLastPriority = 1,
    DKMutexKey1Priority = 2,
    DKMutexKey2Priority = 3,
    DKMutexNeutral = 4,    
}

export interface IDynamicKeyToggleKey extends IDynamicKey {
}

export interface IDynamicKeyMutex extends IDynamicKey {
    key_id : number[];
    mode : (DynamicKeyMutexMode | number);
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
        this.upper_deadzone = 0.00;
        this.lower_deadzone = 0.2;
        this.upper_bound = 4096.0;
        this.lower_bound = 0;
    }
}

export class DynamicKey implements IDynamicKey {
    type: number;
    target_keys_location: KeyLocation[];
    bindings: number[];
    constructor()
    {
        this.type = DynamicKeyType.DynamicKeyNone;
        this.target_keys_location = [];
        this.bindings = Array<number>();
    }
    get_primary_binding(): number {
        return 0;
    }
    set_primary_binding(binding:number): void {
        
    }
}

export class DynamicKeyStroke4x4 implements IDynamicKeyStroke4x4{
    type: number;
    target_keys_location: KeyLocation[];
    bindings: number[];
    key_control: number[];
    press_begin_distance: number;
    press_fully_distance: number;
    release_begin_distance: number;
    release_fully_distance: number;
    constructor()
    {
        this.type = DynamicKeyType.DynamicKeyStroke;
        this.target_keys_location = [];
        this.bindings = [0,0,0,0];
        this.key_control = [0,0,0,0];
        this.press_begin_distance = 0.25;
        this.press_fully_distance = 0.75;
        this.release_begin_distance = 0.75;
        this.release_fully_distance = 0.25;
    }
    get_primary_binding(): number {
        return this.bindings[0];
    }
    set_primary_binding(binding:number): void {
        this.bindings[0] = binding;
    }
}

export class DynamicKeyModTap implements IDynamicKeyModTap {
    type: number;
    target_keys_location: KeyLocation[];
    bindings: number[];
    duration: number;
    constructor()
    {
        this.type = DynamicKeyType.DynamicKeyModTap;
        this.target_keys_location = [];
        this.bindings = [0,0];
        this.duration = 100;
    }
    get_primary_binding(): number {
        return this.bindings[0];
    }
    set_primary_binding(binding: number): void {
        this.bindings[0] = binding;
    }

}

export class DynamicKeyToggleKey implements IDynamicKeyToggleKey {
    type: number;
    target_keys_location: KeyLocation[];
    bindings: number[];
    constructor()
    {
        this.type = DynamicKeyType.DynamicKeyToggleKey;
        this.target_keys_location = [];
        this.bindings = [0];
    }
    get_primary_binding(): number {
        return this.bindings[0];
    }
    set_primary_binding(binding: number): void {
        this.bindings[0] = binding;
    }

}

export class DynamicKeyMutex implements IDynamicKeyMutex {
    key_id: number[];
    bindings: number[];
    mode: number;
    type: number;
    target_keys_location: KeyLocation[];
    is_key2_primary: boolean;
    constructor() 
    {
        this.type = DynamicKeyType.DynamicKeyMutex;
        this.target_keys_location = [];
        this.bindings = [0,0];
        this.key_id = [0,0];
        this.mode = DynamicKeyMutexMode.DKMutexDistancePriority;
        this.is_key2_primary = false;
    }
    get_primary_binding(): number {
        if (this.is_key2_primary) {
            return this.bindings[1];
        }
        else
        {
            return this.bindings[0];
        }
    }
    set_primary_binding(binding: number): void {
        if (this.is_key2_primary) {
            this.bindings[1] = binding;
        }
        else
        {
            this.bindings[0] = binding;
        }
        this.is_key2_primary = !this.is_key2_primary;
    }

}

export enum Keycode {
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

    MouseCollection = 0xa5,
    LayerControl = 0xa6,
    DynamicKey = 0xa7,
    ConsumerCollection = 0xa8,
    SystemCollection = 0xa9,
    JoystickCollection = 0xaa,
    FN = 0xac,
    KeyUser = 0xFD,
    KeyboardOperation = 0xFE,
    KeyTransparent = 0xFF,
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

export enum MouseKeycode {
    MouseLButton = 0,
    MouseRButton = 1,
    MouseMButton = 2,
    MouseForward = 3,
    MouseBack = 4,
    MouseWheelUp = 5,
    MouseWheelDown = 6,
}
export enum KeyboardKeycode {
    KeyboardReboot = 0,
    KeyboardFactoryReset = 1,
    KeyboardSave = 2,
    KeyboardBootloader = 3,
    KeyboardToggleDebug = 4,
    KeyboardResetToDefault = 5,
    KeyboardToggleNKRO = 6,
    KeyboardConfig0 = 0x10,
    KeyboardConfig1 = 0x11,
    KeyboardConfig2 = 0x12,
    KeyboardConfig3 = 0x13,
}
export enum LayerControlKeycode {
    LayerMomentary = 0,
    LayerTurnOn = 1,
    LayerTurnOff = 2,
    LayerToggle = 3,
}

export enum JoystickKeycode {
    JoystickButton = 0x00,
    JoystickPositive = 0x01,
    JoystickNegative = 0x02,
    JoystickWhole = 0x03,
    JoystickWholeInvert = 0x07,
}

export enum ConsumerKeycode {
    // 15.5 Display Controls
    ConsumerSnapshot = 0x01,
    ConsumerBrightnessUp = 0x02,
    ConsumerBrightnessDown = 0x03,
    
    // 15.7 Transport Controls
    ConsumerTransportRecord = 0x04,
    ConsumerTransportFastForward = 0x05,
    ConsumerTransportRewind = 0x06,
    ConsumerTransportNextTrack = 0x07,
    ConsumerTransportPrevTrack = 0x08,
    ConsumerTransportStop = 0x09,
    ConsumerTransportEject = 0x0A,
    ConsumerTransportRandomPlay = 0x0B,
    ConsumerTransportStopEject = 0x0C,
    ConsumerTransportPlayPause = 0x0D,
    
    // 15.9.1 Audio Controls - Volume
    ConsumerAudioMute = 0x0E,
    ConsumerAudioVolUp = 0x0F,
    ConsumerAudioVolDown = 0x10,
    
    // 15.15 Application Launch Buttons
    ConsumerAlCcConfig = 0x11,
    ConsumerAlEmail = 0x12,
    ConsumerAlCalculator = 0x13,
    ConsumerAlLocalBrowser = 0x14,
    ConsumerAlLock = 0x15,
    ConsumerAlControlPanel = 0x16,
    ConsumerAlAssistant = 0x17,
    ConsumerAlKeyboardLayout = 0x18,
    
    // 15.16 Generic GUI Application Controls
    ConsumerAcNew = 0x19,
    ConsumerAcOpen = 0x1A,
    ConsumerAcClose = 0x1B,
    ConsumerAcExit = 0x1C,
    ConsumerAcMaximize = 0x1D,
    ConsumerAcMinimize = 0x1E,
    ConsumerAcSave = 0x1F,
    ConsumerAcPrint = 0x20,
    ConsumerAcProperties = 0x21,
    ConsumerAcUndo = 0x22,
    ConsumerAcCopy = 0x23,
    ConsumerAcCut = 0x24,
    ConsumerAcPaste = 0x25,
    ConsumerAcSelectAll = 0x26,
    ConsumerAcFind = 0x27,
    ConsumerAcSearch = 0x28,
    ConsumerAcHome = 0x29,
    ConsumerAcBack = 0x2A,
    ConsumerAcForward = 0x2B,
    ConsumerAcStop = 0x2C,
    ConsumerAcRefresh = 0x2D,
    ConsumerAcBookmarks = 0x2E,
    ConsumerAcNextKeyboardLayoutSelect = 0x2F,
    ConsumerAcDesktopShowAllWindows = 0x30,
    ConsumerAcSoftKeyLeft = 0x31,
};
  

export enum SystemRawKeycode {
    SystemPowerDown           = 0x81,
    SystemSleep               = 0x82,
    SystemWakeUp              = 0x83,
    SystemRestart             = 0x8F,
    SystemDisplayToggleIntExt = 0xB5,
};


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
    get_dynamic_keys(): IDynamicKey[];
    set_dynamic_keys(dynamic_keys: IDynamicKey[]): void;
    reset_to_default() : void;
    fetch_config() : void;
    save_config() : void;
    flash_config() : void;
    system_reset() : void;
    factory_reset() : void;
    request_config() : void;
    start_debug() : void;
    stop_debug() : void;
    get_layout_json() : string;
    get_config_file_num() : number;
    get_config_file_index(): number;
    set_config_file_index(index: number) : void;
}

export abstract class KeyboardController implements IKeyboardController, EventTarget{
    device: HIDDevice | undefined;
    advanced_keys!: AdvancedKey[];
    rgb_switch!: boolean;
    rgb_configs!: IRGBConfig[];
    keymap!: number[][];
    dynamic_keys!: IDynamicKey[];
    config_index!: number;
    private listeners: { [key: string]: EventListener[] } = {};

    constructor() {
        this.device = undefined;
        this.reset_to_default();
    }

    // 添加事件监听
    addEventListener(type: string, listener: EventListener): void {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(listener);
    }
  
    // 移除事件监听
    removeEventListener(type: string, listener: EventListener): void {
      const listeners = this.listeners[type];
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  
    // 触发事件
    dispatchEvent(event: Event): boolean {
      const listeners = this.listeners[event.type];
      if (listeners) {
        for (const listener of listeners) {
          listener(event);
        }
        return true;
      }
      return false;
    }
    
    async detect(): Promise<HIDDevice[]>
    {        
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 0xFFFF, productId: 0xFFFF, usagePage:0xFFC0}]
        });;
    }

    write(buf: Uint8Array) : number
    {
        return 0;
    }
    read(buf: Uint8Array) : number 
    {
        return 0;
    }
    read_timeout( buf: Uint8Array, timeout: number) : number
    {
        return 0;
    }
    async connect(device: HIDDevice) : Promise<boolean>
    {
        return false;
    }
    disconnect() : void
    {

    }
    prase_buffer(buf: Uint8Array) : void
    {
        
    }
    get_connection_state() : boolean
    {
        return false;
    }
    get_advanced_keys(): IAdvancedKey[] {
        return this.advanced_keys;
    }
    set_advanced_keys(keys: IAdvancedKey[]): void {
        this.advanced_keys = keys;
    }
    get_rgb_switch(): boolean {
        return this.rgb_switch;
    }
    set_rgb_switch(s: boolean): void {
        this.rgb_switch = s;
    }
    get_rgb_configs(): IRGBConfig[] {
        return this.rgb_configs;
    }
    set_rgb_configs(configs: IRGBConfig[]): void {
        this.rgb_configs = configs;
    }
    get_keymap(): number[][] {
        return this.keymap;
    }
    set_keymap(keymap: number[][]): void {
        this.keymap = keymap;
    }
    get_dynamic_keys(): IDynamicKey[] {
        return this.dynamic_keys;

    }
    set_dynamic_keys(dynamic_keys: IDynamicKey[]): void {
        this.dynamic_keys = dynamic_keys;
    }
    reset_to_default() : void
    {
        this.advanced_keys = new Array<IAdvancedKey>();
        this.rgb_switch = false;
        this.rgb_configs = new Array<IRGBConfig>();
        this.keymap = new Array<Array<number>>();
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;
        this.config_index = 0;
    }
    fetch_config() : void
    {

    }
    save_config() : void
    {

    }
    flash_config() : void
    {

    }
    system_reset() : void
    {

    }
    factory_reset() : void
    {

    }
    request_config() : void
    {

    }
    start_debug() : void
    {

    }
    stop_debug() : void
    {

    }
    get_layout_json() : string
    {
        return "[]";
    }
    get_config_file_num() : number
    {
        return 0;
    }
    get_config_file_index(): number
    {
        return 0;
    }
    set_config_file_index(index: number) : void {
        this.config_index = index;
    }
}


export function AdvancedKeyToBytes(key : IAdvancedKey): Uint8Array {
    const bytes = new Uint8Array(48); // 总共 45 字节
    bytes[0] = key.mode; // 写入 mode (1 字节)
    bytes[1] = key.calibration_mode;
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

    let offset = 4; // 从第 2 个字节开始写入
    const dataView = new DataView(bytes.buffer);

    for (let field of fields) {
      dataView.setFloat32(offset, field, true); // 以小端序写入每个 f32 字段
      offset += 4; // 每个 f32 占用 4 个字节
    }

    return bytes;
  }
