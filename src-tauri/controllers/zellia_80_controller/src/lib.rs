use advancedkey::{AdvancedKey, CalibrationMode, KeyMode};
use keyboard_controller::KeyboardController;
use keyboard_controller::*;
use log::debug;
use rgb::RGBConfig;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use std::ffi::CString;

extern crate hidapi;

pub const VID: u16 = 0xFFFF;
pub const PID: u16 = 0xFFFF;

#[serde_as]
#[derive(Serialize, Deserialize)]
pub struct Zellia80Controller {
    #[serde(skip)]
    pub device: Option<hidapi::HidDevice>,
    #[serde_as(as = "[_; 88]")]
    pub advanced_keys: [AdvancedKey; 88],
    pub rgb_switch: bool,
    #[serde_as(as = "[_; 88]")]
    pub rgb_configs: [RGBConfig; 88],
    #[serde_as(as = "[[_; 88]; 5]")]
    pub keymap: [[u16; 88]; 5],
}

impl Clone for Zellia80Controller {
    fn clone(&self) -> Self {
        Zellia80Controller {
            device: None,
            advanced_keys: self.advanced_keys.clone(),
            rgb_switch: self.rgb_switch.clone(),
            rgb_configs: self.rgb_configs.clone(),
            keymap: self.keymap.clone(),
        }
    }
}

impl Default for Zellia80Controller {
    fn default() -> Self {
        Self {
            device: None, // 没有具体设备句柄时设置为 None
            advanced_keys: [AdvancedKey {
                state: false,
                value: 0.0,
                raw: 0.0,
                mode: KeyMode::KeyAnalogRapidMode,
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
            }; 88], // 使用 `Default` 初始化数组
            rgb_switch: true,
            rgb_configs: std::array::from_fn(|_| RGBConfig::default()),
            keymap: [[0 as u16; 88]; 5],
        }
    }
}

impl KeyboardController for Zellia80Controller {
    fn detect(&self) -> Vec<CString> {
        let mut _paths: Vec<CString> = Vec::new();
        return _paths;
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
        return include_str!("zellia-80-layout.json").to_string();
    }
    
    fn fetch_config(&self) {
        todo!()
    }
    
    fn save_config(&self) {
        todo!()
    }
    
    fn flash_config(&self) {
        todo!()
    }
    
    fn system_reset(&self) {
        todo!()
    }
    
    fn factory_reset(&self) {
        todo!()
    }
    
    fn start_debug(&self) {
        todo!()
    }
    
    fn stop_debug(&self) {
        todo!()
    }
    
    fn prase_buffer(&mut self, _buf: &[u8]) {
        todo!()
    }
}

impl Zellia80Controller {
    pub fn send_advanced_keys(&self) {

    }

    pub fn send_rgb_configs(&self) {

    }

    pub fn send_keymap(&self) {

    }

    pub fn save(&self) {

    }

    pub fn system_reset(&self) {

    }

    pub fn factory_reset(&self) {

    }

    pub fn prase_buffer(&mut self, _buf: &[u8]) {
        
    }
}
