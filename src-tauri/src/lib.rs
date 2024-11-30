
use std::sync::Mutex;
use ansi_104_sample_controller::ANSI104SampleController;
use keyboard_controller::{advancedkey::AdvancedKey, rgb::RGBConfig, KeyboardController};
use oholeo_keyboard_controller::OholeoKeyboardController;
use tauri::State;
use trinity_keypad_controller::TrinityKeypadController;
use zellia_80_controller::Zellia80Controller;

static DEVICES: [&'static str; 4] = ["Trinity Keypad","Oholeo Keyboard","Zellia80 HE", "ANSI 104 Sample"];

#[tauri::command]
fn connect_device(
    device_handle: State<'_, Mutex<Option<TrinityKeypadController>>>
) -> bool {
    *device_handle.lock().unwrap() = Some(TrinityKeypadController::default());
    true
}

#[tauri::command]
fn get_devices() -> Vec<String> {
    return DEVICES.iter().map(|&s| s.to_string()).collect();
}

#[tauri::command]
fn set_device(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, device : String){
    if DEVICES.contains(&device.as_str()) {
        
    }
    match device.as_str() {
        "Trinity Keypad" => {*device_handle.lock().unwrap() = Some(Box::new(TrinityKeypadController::default()));}
        "Oholeo Keyboard" => {*device_handle.lock().unwrap() = Some(Box::new(OholeoKeyboardController::default()));}
        "Zellia80 HE" => {*device_handle.lock().unwrap() = Some(Box::new(Zellia80Controller::default()));}
        "ANSI 104 Sample" => {*device_handle.lock().unwrap() = Some(Box::new(ANSI104SampleController::default()));}
        _ => {*device_handle.lock().unwrap() = Some(Box::new(ANSI104SampleController::default()));}
    }
}

#[tauri::command]
fn get_advanced_keys(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> Vec<AdvancedKey> {
    return device_handle.lock().unwrap().as_mut().unwrap().get_advanced_keys();
}

#[tauri::command]
fn set_advanced_keys(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, keys : Vec<AdvancedKey>) {
    device_handle.lock().unwrap().as_mut().unwrap().set_advanced_keys(keys);
}

#[tauri::command]
fn get_rgb_switch(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> bool {
    return device_handle.lock().unwrap().as_mut().unwrap().get_rgb_switch();
}

#[tauri::command]
fn set_rgb_switch(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, switch : bool) {
    device_handle.lock().unwrap().as_mut().unwrap().set_rgb_switch(switch);
}

#[tauri::command]
fn get_rgb_configs(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> Vec<RGBConfig> {
    return device_handle.lock().unwrap().as_mut().unwrap().get_rgb_configs();
}

#[tauri::command]
fn set_rgb_configs(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, configs : Vec<RGBConfig>) {
    device_handle.lock().unwrap().as_mut().unwrap().set_rgb_configs(configs);
}

#[tauri::command]
fn get_keymap(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> Vec<Vec<u16>> {
    return device_handle.lock().unwrap().as_mut().unwrap().get_keymap();
}

#[tauri::command]
fn set_keymap(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>, keymap : Vec<Vec<u16>>) {
    device_handle.lock().unwrap().as_mut().unwrap().set_keymap(keymap);
}

#[tauri::command]
fn get_layout_json(device_handle: State<Mutex<Option<Box<dyn KeyboardController>>>>) -> String {
    return device_handle.lock().unwrap().as_mut().unwrap().get_layout_json();
}


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            connect_device
            ])
        .manage::<Mutex<Option<Box<dyn KeyboardController>>>>(Mutex::new(None))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
