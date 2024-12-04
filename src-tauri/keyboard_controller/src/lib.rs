use std::ffi::CString;
use advancedkey::AdvancedKey;
use rgb::RGBConfig;

pub mod advancedkey;
pub mod rgb;

pub trait KeyboardController : Send{
    fn detect(&self) -> Vec<CString>;
    fn write(&self, buf: &[u8]) -> usize;
    fn read(&self, buf: &mut [u8]) -> usize ;
    fn read_timeout(&self, buf: &mut [u8], timeout: i32) -> usize;
    fn connect(&mut self, path: &CString);
    fn disconnect(&mut self);
    fn prase_buffer(&mut self, buf: &[u8]);
    fn get_connection_state(&self) -> bool;

    fn get_advanced_keys(&self) -> Vec<AdvancedKey>;
    fn set_advanced_keys(&mut self, keys : Vec<AdvancedKey>);
    fn get_rgb_switch(&self) -> bool;
    fn set_rgb_switch(&mut self, switch : bool);
    fn get_rgb_configs(&self) -> Vec<RGBConfig>;
    fn set_rgb_configs(&mut self, configs : Vec<RGBConfig>);
    fn get_keymap(&self) -> Vec<Vec<u16>>;
    fn set_keymap(&mut self, keymap : Vec<Vec<u16>>);

    
    fn fetch_config(&self);
    fn save_config(&self);
    fn flash_config(&self);
    fn system_reset(&self);
    fn factory_reset(&self);
    fn start_debug(&self);
    fn stop_debug(&self);
    fn get_layout_json(&mut self) -> String;
}

#[derive(Debug)]
pub enum KeyCode {
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
    Enter = 0x28, Escape = 0x29, Backspace = 0x2a, Tab = 0x2b, Spacebar = 0x2c,

    // Symbols
    Minus = 0x2d, Equal = 0x2e, LeftBrace = 0x2f, RightBrace = 0x30,
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

pub enum KeyModifier
{
    /*------------------------- HID report data -------------------------*/
    KeyNoModifier=0,
    KeyLeftCtrl = 0x01,KeyLeftShift = 0x02,KeyLeftAlt = 0x04,KeyLeftGui = 0x08,
    KeyRightCtrl = 0x10,KeyRightShift = 0x20,KeyRightAlt = 0x40,KeyRightGui = 0x80,
    /*------------------------- HID report data -------------------------*/
}

#[cfg(test)]
mod tests {

    #[test]
    fn it_works() {
        //let result = add(2, 2);
        //assert_eq!(result, 4);
    }
}
