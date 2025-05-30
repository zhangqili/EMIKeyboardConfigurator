use advancedkey::{AdvancedKey, CalibrationMode, KeyMode};
use keyboard_controller::KeyboardController;
use keyboard_controller::*;
use log::debug;
use palette::Srgb;
use rgb::{RGBConfig, RGBMode};
use serde::{Deserialize, Serialize};
use std::ffi::CString;

extern crate hidapi;

pub const VID: u16 = 0xFFFF;
pub const PID: u16 = 0xFFFF;

#[derive(Serialize, Deserialize)]
pub struct TrinityPadController {
    #[serde(skip)]
    pub device: Option<hidapi::HidDevice>,
    pub advanced_keys: [AdvancedKey; 4],
    pub rgb_switch: bool,
    pub rgb_configs: [RGBConfig; 4],
    pub keymap: [[u16; 13]; 3],
}

impl Clone for TrinityPadController {
    fn clone(&self) -> Self {
        TrinityPadController {
            //device: Some(hidapi::HidApi::new().unwrap().open_path(self.device.as_ref().unwrap().get_device_info().unwrap().path()).unwrap()),
            device: None,
            advanced_keys: self.advanced_keys.clone(),
            rgb_switch: self.rgb_switch.clone(),
            rgb_configs: self.rgb_configs.clone(),
            keymap: self.keymap.clone()
        }
    }
}

impl Default for TrinityPadController {
    fn default() -> Self {
        Self {
            device: None, // 没有具体设备句柄时设置为 None
            advanced_keys: [AdvancedKey {
                state: false,
                value: 0.0,
                raw: 0.0,
                mode: KeyMode::KeyAnalogRapidMode,
                calibration_mode: CalibrationMode::KeyAutoCalibrationPositive,
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
                upper_bound: 2600.0,
                lower_bound: 140.0,
            }; 4], // 使用 `Default` 初始化数组
            rgb_switch: true,
            rgb_configs: [
                RGBConfig{
                    mode: RGBMode::RgbModeLinear,
                    rgb: Srgb::from_components((163,55,252)),
                    speed: 0.02
                }; 4
            ],
            keymap: [
                [
                    Keycode::Z as u16,
                    Keycode::X as u16,
                    Keycode::C as u16,
                    Keycode::V as u16,
                    Keycode::F8 as u16,
                    Keycode::F12 as u16,
                    (Keycode::F2 as u16 | ((KeyModifier::KeyLeftShift as u16) << 8)),
                    Keycode::F2 as u16,
                    0,
                    0,
                    Keycode::Escape as u16,
                    Keycode::MouseWheelUp as u16,
                    Keycode::MouseWheelDown as u16,
                ],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
        }
    }
}

impl KeyboardController for TrinityPadController {
    fn detect(&self) -> Vec<CString> {
        let mut paths: Vec<CString> = Vec::new();
        let api = hidapi::HidApi::new().unwrap();

        for device in api.device_list() {
            if device.product_id() == PID
                && device.vendor_id() == VID
                && device.interface_number() == 2
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

    fn get_rgb_base_config(&self) -> bool {
        return self.rgb_switch;
    }

    fn set_rgb_base_config(&mut self, switch: bool) {
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
        send_buf[0] = 0x01;
        send_buf[1] = 0x80;
        let res = self.write(&send_buf);
        debug!("Wrote Save Command: {:?} byte(s)", res);
    }

    fn system_reset(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x01;
        send_buf[1] = 0x81;
        let res = self.write(&send_buf);
        debug!("Wrote System Reset Command: {:?} byte(s)", res);
    }

    fn factory_reset(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x01;
        send_buf[1] = 0x82;
        let res = self.write(&send_buf);
        debug!("Wrote Factory Reset Command: {:?} byte(s)", res);
    }

    fn get_layout_json(&mut self) -> String {
        return include_str!("trinity-keypad-layout.json").to_string();
    }

    fn start_debug(&self) {
        let mut buf = [0u8; 64];
        buf[0] = 0x01;
        buf[1] = 0xB0;
        buf[2] = 0x01;
        self.write(&buf);
    }

    fn stop_debug(&self) {
        let mut buf = [0u8; 64];
        buf[0] = 0x01;
        buf[1] = 0xB0;
        buf[2] = 0x00;
        self.write(&buf);
    }
    
    fn prase_buffer(&mut self, buf: &[u8]) {
        match buf[1] {
            1 => {}
            0xFF => {

                for i in 0..4 {
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

impl TrinityPadController {
    pub fn send_advanced_keys(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x01;
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
        send_buf[0] = 0x01;
        send_buf[1] = 0xFF;
        send_buf[2] = 0x01;
        send_buf[3] = self.rgb_switch as u8;
        {
            let res = self.write(&send_buf);
            debug!("Wrote RGB Configs: {:?} byte(s)", res);
        }
        send_buf[2] = 0x02;
        for (i, item) in self.rgb_configs.iter().enumerate() {
            send_buf[3 + 8 * i] = item.mode as u8;
            send_buf[4 + 8 * i] = item.rgb.red;
            send_buf[5 + 8 * i] = item.rgb.green;
            send_buf[6 + 8 * i] = item.rgb.blue;
            send_buf[7 + 8 * i] = (item.speed * 100.0) as u8;
        }
        {
            let res = self.write(&send_buf);
            debug!("Wrote RGB Configs: {:?} byte(s)", res);
        }
    }

    pub fn send_keymap(&self) {
        let mut send_buf = [0u8; 64];
        send_buf[0] = 0x01;
        send_buf[1] = 0xFF;
        send_buf[2] = 0x03;
        for (i, layer) in self.keymap.iter().enumerate() {
            send_buf[3] = i as u8;
            for (j, &value) in layer.iter().enumerate() {
                let bytes = value.to_le_bytes(); // 转换 `u16` 为 `u8` 数组（小端序）
                send_buf[4 + j * 2] = bytes[0];
                send_buf[4 + j * 2 + 1] = bytes[1];
            }
            let res = self.write(&send_buf);
            debug!("Wrote Keymap: {:?} byte(s)", res);
        }
    }

}
