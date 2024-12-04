use advancedkey::{AdvancedKey, CalibrationMode, KeyMode};
use keyboard_controller::KeyboardController;
use keyboard_controller::*;
use log::debug;
use palette::Srgb;
use rgb::{RGBConfig, RGBMode};
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use std::{ffi::CString};

extern crate hidapi;

pub const VID: u16 = 1156;
pub const PID: u16 = 22319;

#[serde_as]
#[derive(Serialize, Deserialize)]
pub struct OholeoKeyboardController {
    #[serde(skip)]
    pub device: Option<hidapi::HidDevice>,
    #[serde_as(as = "[_; 64]")]
    pub advanced_keys: [AdvancedKey; 64],
    pub rgb_switch: bool,
    #[serde_as(as = "[_; 64]")]
    pub rgb_configs: [RGBConfig; 64],
    #[serde_as(as = "[[_; 64]; 5]")]
    pub keymap: [[u16; 64]; 5],
}

impl Clone for OholeoKeyboardController {
    fn clone(&self) -> Self {
        OholeoKeyboardController {
            device: None,
            advanced_keys: self.advanced_keys.clone(),
            rgb_switch: self.rgb_switch.clone(),
            rgb_configs: self.rgb_configs.clone(),
            keymap: self.keymap.clone(),
        }
    }
}

impl Default for OholeoKeyboardController {
    fn default() -> Self {
        Self {
            device: None, // 没有具体设备句柄时设置为 None
            advanced_keys: [AdvancedKey {
                state: false,
                value: 0.0,
                raw: 0.0,
                mode: KeyMode::KeyAnalogNormalMode,
                calibration_mode: CalibrationMode::KeyAutoCalibrationNegative,
                maximum: 0.0,
                minimum: 0.0,
                activation_value: 0.5,
                phantom_lower_deadzone: 0.2,
                trigger_distance: 0.08,
                release_distance: 0.08,
                schmitt_parameter: 0.01,
                trigger_speed: 0.01,
                release_speed: 0.01,
                upper_deadzone: 0.04,
                lower_deadzone: 0.2,
                upper_bound: 4096.0,
                lower_bound: 0.0,
            }; 64], // 使用 `Default` 初始化数组
            rgb_switch: true,
            rgb_configs: [
                RGBConfig{
                    mode: RGBMode::RgbModeLinear,
                    rgb: Srgb::from_components((163,55,252)),
                    speed: 0.02
                }; 64
            ],
            keymap: [
                [
                    KeyCode::Escape/*0*/ as u16, KeyCode::Key1/*1*/ as u16, KeyCode::Key2/*2*/ as u16, KeyCode::Key3/*3*/ as u16, KeyCode::Key4/*4*/ as u16, KeyCode::Key5/*5*/ as u16, KeyCode::Key6/*6*/ as u16, KeyCode::Key7/*7*/ as u16, KeyCode::Key8/*8*/ as u16, KeyCode::Key9/*9*/ as u16, KeyCode::Key0/*10*/ as u16, KeyCode::Minus/*11*/ as u16, KeyCode::Equal/*12*/ as u16, KeyCode::Backspace/*13*/ as u16,
                    KeyCode::Tab/*14*/ as u16, KeyCode::Q/*15*/ as u16, KeyCode::W/*16*/ as u16, KeyCode::E/*17*/ as u16, KeyCode::R/*18*/ as u16, KeyCode::T/*19*/ as u16, KeyCode::Y/*20*/ as u16, KeyCode::U/*21*/ as u16, KeyCode::I/*22*/ as u16, KeyCode::O/*23*/ as u16, KeyCode::P/*24*/ as u16, KeyCode::LeftBrace/*25*/ as u16, KeyCode::RightBrace/*26*/ as u16, KeyCode::Backslash/*27*/ as u16,
                    KeyCode::CapsLock/*28*/ as u16, KeyCode::A/*29*/ as u16, KeyCode::S/*30*/ as u16, KeyCode::D/*31*/ as u16, KeyCode::F/*32*/ as u16, KeyCode::G/*33*/ as u16, KeyCode::H/*34*/ as u16, KeyCode::J/*35*/ as u16, KeyCode::K/*36*/ as u16, KeyCode::L/*37*/ as u16, KeyCode::Semicolon/*38*/ as u16, KeyCode::Apostrophe/*39*/ as u16, KeyCode::Enter/*40*/ as u16,
                    ((KeyModifier::KeyLeftShift as u16) << 8)/*41*/ as u16, KeyCode::Z/*42*/ as u16, KeyCode::X/*43*/ as u16, KeyCode::C/*44*/ as u16, KeyCode::V/*45*/ as u16, KeyCode::B/*46*/ as u16, KeyCode::N/*47*/ as u16, KeyCode::M/*48*/ as u16, KeyCode::Comma/*49*/ as u16, KeyCode::Dot/*50*/ as u16, KeyCode::Slash/*51*/ as u16, ((KeyModifier::KeyRightShift as u16) << 8)/*52*/ as u16, KeyCode::UpArrow/*53*/ as u16, KeyCode::Delete/*54*/ as u16,
                    ((KeyModifier::KeyLeftCtrl as u16) << 8)/*55*/ as u16, ((KeyModifier::KeyLeftGui as u16) << 8)/*56*/ as u16, ((KeyModifier::KeyLeftAlt as u16) << 8)/*57*/ as u16, KeyCode::Spacebar/*58*/ as u16, ((KeyModifier::KeyRightAlt as u16) << 8)/*59*/ as u16, KeyCode::FN/*60*/ as u16, KeyCode::LeftArrow/*61*/ as u16, KeyCode::DownArrow/*62*/ as u16, KeyCode::RightArrow/*63*/ as u16,
                ],
                [ 
                    KeyCode::Grave as u16, KeyCode::F1 as u16, KeyCode::F2 as u16, KeyCode::F3 as u16, KeyCode::F4 as u16, KeyCode::F5 as u16, KeyCode::F6 as u16, KeyCode::F7 as u16, KeyCode::F8 as u16, KeyCode::F9 as u16, KeyCode::F10 as u16, KeyCode::F11 as u16, KeyCode::F12 as u16, KeyCode::Backspace as u16,
                    KeyCode::Tab as u16, KeyCode::Q as u16, KeyCode::W as u16, KeyCode::E as u16, KeyCode::R as u16, KeyCode::T as u16, KeyCode::Y as u16, KeyCode::U as u16, KeyCode::I as u16, KeyCode::O as u16, KeyCode::P as u16, KeyCode::LeftBrace as u16, KeyCode::RightBrace as u16, KeyCode::Backslash as u16,
                    KeyCode::CapsLock as u16, KeyCode::A as u16, KeyCode::S as u16, KeyCode::D as u16, KeyCode::F as u16, KeyCode::G as u16, KeyCode::H as u16, KeyCode::J as u16, KeyCode::K as u16, KeyCode::L as u16, KeyCode::Semicolon as u16, KeyCode::Apostrophe as u16, KeyCode::Enter as u16,
                    ((KeyModifier::KeyLeftShift as u16) << 8) as u16, KeyCode::Z as u16, KeyCode::X as u16, KeyCode::C as u16, KeyCode::V as u16, KeyCode::B as u16, KeyCode::N as u16, KeyCode::M as u16, KeyCode::Comma as u16, KeyCode::Dot as u16, KeyCode::Slash as u16, ((KeyModifier::KeyRightShift as u16) << 8) as u16, KeyCode::UpArrow as u16, KeyCode::Delete as u16,
                    ((KeyModifier::KeyLeftCtrl as u16) << 8) as u16, ((KeyModifier::KeyLeftGui as u16) << 8) as u16, ((KeyModifier::KeyLeftAlt as u16) << 8) as u16, KeyCode::Spacebar as u16, ((KeyModifier::KeyRightAlt as u16) << 8) as u16, KeyCode::FN as u16, KeyCode::LeftArrow as u16, KeyCode::DownArrow as u16, KeyCode::RightArrow as u16,
                ],
                [0 as u16; 64],
                [0 as u16; 64],
                [0 as u16; 64]
            ],
        }
    }
}

impl KeyboardController for OholeoKeyboardController {
    fn detect(&self) -> Vec<CString> {
        let mut paths: Vec<CString> = Vec::new();
        let api = hidapi::HidApi::new().unwrap();

        for device in api.device_list() {
            if device.product_id() == PID
                && device.vendor_id() == VID
                && device.usage() == 0x0C00
            {
                paths.push(CString::from(device.path()));
            }
        }
        return paths;
    }
    fn connect(&mut self, path: &CString) {
        let api = hidapi::HidApi::new().unwrap();
        self.device = Some(api.open_path(path).unwrap());
        if let Some(ref dev) = self.device {
            debug!("{:?}", dev.get_device_info());
        }
    }
    fn disconnect(&mut self) {
        self.device = None;
    }

    fn read(&self, buf: &mut [u8]) -> usize {
        let mut res = 0;
        if let Some(ref dev) = self.device {
            res = dev.read_timeout(&mut buf[..], -1).unwrap();
        }
        return res;
    }

    fn read_timeout(&self, buf: &mut [u8], timeout: i32) -> usize {
        let mut res = 0;
        if let Some(ref dev) = self.device {
            res = dev.read_timeout(&mut buf[..], timeout).unwrap();
        }
        return res;
    }

    fn write(&self, buf: &[u8]) -> usize {
        let mut res = 0;
        if let Some(ref dev) = self.device {
            res = dev.write(&buf).unwrap();
        }
        return res;
    }

    fn get_advanced_keys(&self) -> Vec<AdvancedKey> {
        return self.advanced_keys.to_vec();
    }

    fn set_advanced_keys(&mut self, keys: Vec<AdvancedKey>) {
        self.advanced_keys.copy_from_slice(&keys);
    }

    fn get_rgb_switch(&self) -> bool {
        return self.rgb_switch;
    }

    fn set_rgb_switch(&mut self, switch: bool) {
        self.rgb_switch = switch;
    }

    fn get_rgb_configs(&self) -> Vec<RGBConfig> {
        return self.rgb_configs.to_vec();
    }

    fn set_rgb_configs(&mut self, configs: Vec<RGBConfig>) {
        self.rgb_configs.copy_from_slice(&configs);
    }

    fn get_keymap(&self) -> Vec<Vec<u16>> {
        return self.keymap.iter().map(|layer| layer.to_vec()).collect();
    }

    fn set_keymap(&mut self, keymap: Vec<Vec<u16>>) {
        for (i, layer) in keymap.iter().enumerate() {
            self.keymap[i].copy_from_slice(&layer);
        }
    }

    fn get_layout_json(&mut self) -> String {
        return include_str!("oholeo-keyboard-layout.json").to_string();
    }
    
    fn fetch_config(&self) {
        todo!()
    }
    
    fn save_config(&self) {
        self.send_advanced_keys();
        self.send_rgb_configs();
        self.send_keymap();
    }
    
    fn flash_config(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x02;
        send_buf[1] = 0x80;
        let res = self.write(&send_buf);
        debug!("Wrote Save Command: {:?} byte(s)", res);
    }
    
    fn system_reset(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x02;
        send_buf[1] = 0x81;
        let res = self.write(&send_buf);
        debug!("Wrote System Reset Command: {:?} byte(s)", res);
    }
    
    fn factory_reset(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x02;
        send_buf[1] = 0x82;
        let res = self.write(&send_buf);
        debug!("Wrote Factory Reset Command: {:?} byte(s)", res);
    }
    
    fn start_debug(&self) {
        let mut buf = [0u8; 64];
        buf[0] = 0x02;
        buf[1] = 0xB0;
        buf[2] = 0x01;
        self.write(&buf);
    }
    
    fn stop_debug(&self) {
        let mut buf = [0u8; 64];
        buf[0] = 0x02;
        buf[1] = 0xB0;
        buf[2] = 0x00;
        self.write(&buf);
    }
    
    fn prase_buffer(&mut self, buf: &[u8]) {
        match buf[1] {
            1 => {}
            0xFF => {
                for i in 0..6 {
                    let key_index = buf[2 + 10 * i] as usize;
                    if key_index >= self.advanced_keys.len() {
                        continue;
                    }
                    self.advanced_keys[key_index].state = buf[3 + 10 * i] > 0;
                    let raw_bytes = [
                        buf[4 + 0 + 10 * i],
                        buf[4 + 1 + 10 * i],
                        buf[4 + 2 + 10 * i],
                        buf[4 + 3 + 10 * i],
                    ];
                    let value_bytes = [
                        buf[4 + 4 + 10 * i],
                        buf[4 + 5 + 10 * i],
                        buf[4 + 6 + 10 * i],
                        buf[4 + 7 + 10 * i],
                    ];
                    self.advanced_keys[key_index].raw = f32::from_le_bytes(raw_bytes);
                    self.advanced_keys[key_index].value = f32::from_le_bytes(value_bytes);
                }
            }
            _default => {}
        }
    }
    
    fn get_connection_state(&self) -> bool {
        return self.device.is_some();
    }
}

impl OholeoKeyboardController {
    pub fn send_advanced_keys(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x02;
        send_buf[1] = 0xFF;
        send_buf[2] = 0x00;
        for (i, item) in self.advanced_keys.iter().enumerate() {
            send_buf[3] = i as u8;
            let key_bytes = item.to_bytes();
            send_buf[4..(4 + 45)].copy_from_slice(&key_bytes);
            let res = self.write(&send_buf);
            debug!("Wrote Advanced Key: {:?} byte(s)", res);
        }
    }

    pub fn send_rgb_configs(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x02;
        send_buf[1] = 0xFF;
        send_buf[2] = 0x01;
        send_buf[3] = self.rgb_switch as u8;
        {
            let res = self.write(&send_buf);
            debug!("Wrote RGB Switch: {:?} byte(s)", res);
        }
        send_buf[2] = 0x02;
        for i in 0..10 {
            for j in 0..7 {
                send_buf[3] = (i * 7) as u8;
                let index = i * 7 + j;
                if index < self.rgb_configs.len(){
                    let item = self.rgb_configs[index];
                    send_buf[4 + 0 + 8 * j] = item.mode as u8;
                    send_buf[4 + 1 + 8 * j] = item.rgb.red;
                    send_buf[4 + 2 + 8 * j] = item.rgb.green;
                    send_buf[4 + 3 + 8 * j] = item.rgb.blue;
                    send_buf[(4 + 4 + 8 * j)..(4 + 8 + 8 * j)].copy_from_slice(&item.speed.to_ne_bytes());    
                }
            }
            let res: usize = self.write(&send_buf);
            debug!("Wrote RGB Configs: {:?} byte(s)", res);
        }
    }

    pub fn send_keymap(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x02;
        send_buf[1] = 0xFF;
        send_buf[2] = 0x03;
        for (i, layer) in self.keymap.iter().enumerate() {
            println!("{:?}",layer);
            send_buf[3] = i as u8; //layer_index
            for j in 0..4 {
                let layer_seg = layer[(j*16)..((j+1)*16)].to_vec(); // 转换 `u16` 为 `u8` 数组（小端序）
                send_buf[4] = j as u8;//layer_page_index
                for (k, value) in layer_seg.iter().enumerate() {
                    let bytes = value.to_le_bytes();
                    send_buf[5 + k * 2] = bytes[0];
                    send_buf[5 + k * 2 + 1] = bytes[1];
                }
                println!("{:?}",layer_seg);
                println!("{:?}",send_buf);
                let res = self.write(&send_buf);
                debug!("Wrote Keymap: {:?} byte(s)", res);
            }
        }
    }
}
