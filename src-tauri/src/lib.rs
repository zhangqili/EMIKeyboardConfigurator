use ansi_104_sample_controller::ANSI104SampleController;
use keyboard_controller::{advancedkey::{self, AdvancedKey}, rgb::RGBConfig, KeyboardController};
use oholeo_keyboard_controller::OholeoKeyboardController;
use std::{sync::{Arc, Mutex}, thread};
use tauri::{Emitter, State};
use trinity_keypad_controller::TrinityKeypadController;
use zellia_80_controller::Zellia80Controller;

static DEVICES: [&'static str; 4] = [
    "Trinity Keypad",
    "Oholeo Keyboard",
    "Zellia80 HE",
    "ANSI 104 Sample",
];

#[tauri::command]
fn get_devices() -> Vec<String> {
    return DEVICES.iter().map(|&s| s.to_string()).collect();
}

#[tauri::command]
fn set_device(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, device: String) {
    if DEVICES.contains(&device.as_str()) {}
    match device.as_str() {
        "Trinity Keypad" => {
            *device_handle.lock().unwrap() = Some(Box::new(TrinityKeypadController::default()));
        }
        "Oholeo Keyboard" => {
            *device_handle.lock().unwrap() = Some(Box::new(OholeoKeyboardController::default()));
        }
        "Zellia80 HE" => {
            *device_handle.lock().unwrap() = Some(Box::new(Zellia80Controller::default()));
        }
        "ANSI 104 Sample" => {
            *device_handle.lock().unwrap() = Some(Box::new(ANSI104SampleController::default()));
        }
        _ => {
            *device_handle.lock().unwrap() = Some(Box::new(ANSI104SampleController::default()));
        }
    }
}

#[tauri::command]
fn get_advanced_keys(
    device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>,
) -> Vec<AdvancedKey> {
    return device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .get_advanced_keys();
}

#[tauri::command]
fn set_advanced_keys(
    device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>,
    keys: Vec<AdvancedKey>,
) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .set_advanced_keys(keys);
}

#[tauri::command]
fn get_rgb_switch(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> bool {
    return device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .get_rgb_switch();
}

#[tauri::command]
fn set_rgb_switch(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, switch: bool) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .set_rgb_switch(switch);
}

#[tauri::command]
fn get_rgb_configs(
    device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>,
) -> Vec<RGBConfig> {
    return device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .get_rgb_configs();
}

#[tauri::command]
fn set_rgb_configs(
    device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>,
    configs: Vec<RGBConfig>,
) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .set_rgb_configs(configs);
}

#[tauri::command]
fn get_keymap(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> Vec<Vec<u16>> {
    return device_handle.lock().unwrap().as_mut().unwrap().get_keymap();
}

#[tauri::command]
fn set_keymap(
    device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>,
    keymap: Vec<Vec<u16>>,
) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .set_keymap(keymap);
}

#[tauri::command]
fn connect_device(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> bool {
    let mut binding = device_handle.lock().unwrap(); // Create a variable for the lock
    let controller: &mut Box<dyn KeyboardController> = binding.as_mut().unwrap(); // Use as_mut() for mutable reference
    let paths = controller.detect();
    if paths.len() > 0 {
        controller.connect(&paths[0]); 
        return true;
    } else {
        return false;
    }
}

#[tauri::command]
fn fetch_config(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .fetch_config();
}

#[tauri::command]
fn save_config(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .save_config();
}

#[tauri::command]
fn flash_config(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .flash_config();
}

#[tauri::command]
fn system_reset(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .system_reset();
}

#[tauri::command]
fn factory_reset(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .factory_reset();
}

#[tauri::command]
fn start_debug(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .start_debug();

}

#[tauri::command]
fn stop_debug(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .stop_debug();
}

#[tauri::command]
fn receive_data(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> i32{
    let mut binding = device_handle.lock().unwrap(); // Create a variable for the lock
    let controller: &mut Box<dyn KeyboardController> = binding.as_mut().unwrap(); // Use as_mut() for mutable reference
    let mut buf = [0u8; 64];
    let res = controller.read_timeout(&mut buf[..], 10);
    controller.prase_buffer(&buf);
    return res as i32;
}

#[tauri::command]
fn receive_data_in_background(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>){

}

#[tauri::command]
fn get_layout_json(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> String {
    return device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .get_layout_json();
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("This is a message from the backend.");
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_devices,
            set_device,
            get_advanced_keys,
            set_advanced_keys,
            get_rgb_switch,
            set_rgb_switch,
            get_rgb_configs,
            set_rgb_configs,
            get_keymap,
            set_keymap,
            get_layout_json,
            connect_device,
            fetch_config,
            save_config,
            flash_config,
            system_reset,
            factory_reset,
            start_debug,
            stop_debug,
            receive_data,
            receive_data_in_background
        ])
        .manage::<Mutex<Option<Box<dyn KeyboardController>>>>(Mutex::new(None))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
