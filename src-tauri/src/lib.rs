use ansi_104_sample_controller::ANSI104SampleController;
use keyboard_controller::{
    advancedkey::{AdvancedKey},
    rgb::RGBConfig,
    KeyboardController,
};
use oholeo_keyboard_controller::OholeoKeyboardController;
use std::{
    sync::{Arc, Mutex},
    thread, time::Duration,
};
use tauri::{AppHandle, Emitter, State};
use trinity_keypad_controller::TrinityPadController;
use zellia_80_controller::Zellia80Controller;

static DEVICES: [&'static str; 4] = [
    "Trinity Pad",
    "Oholeo Keyboard",
    "Zellia80 HE",
    "ANSI 104 Sample",
];

#[tauri::command]
fn get_devices() -> Vec<String> {
    return DEVICES.iter().map(|&s| s.to_string()).collect();
}

#[tauri::command]
fn set_device(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
    device: String,
) {
    if DEVICES.contains(&device.as_str()) {}
    match device.as_str() {
        "Trinity Pad" => {
            *device_handle.lock().unwrap() = Some(Box::new(TrinityPadController::default()));
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
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
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
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
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
fn get_rgb_base_config(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) -> bool {
    return device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .get_rgb_base_config();
}

#[tauri::command]
fn set_rgb_base_config(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
    switch: bool,
) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .set_rgb_base_config(switch);
}

#[tauri::command]
fn get_rgb_configs(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
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
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
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
fn get_keymap(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
) -> Vec<Vec<u16>> {
    return device_handle.lock().unwrap().as_mut().unwrap().get_keymap();
}

#[tauri::command]
fn set_keymap(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
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
fn connect_device(app: AppHandle, device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) -> bool {
    let mut binding = device_handle.lock().unwrap(); // Create a variable for the lock
    let controller: &mut Box<dyn KeyboardController> = binding.as_mut().unwrap(); // Use as_mut() for mutable reference
    let paths = controller.detect();
    if paths.len() > 0 {
        controller.connect(&paths[0]);

        let device_handle = device_handle.inner().clone(); // 克隆Arc以便在新线程中使用
        println!("start thread");
        thread::spawn(move || {
            // 在新线程中访问数据时加锁
            // 在这里进行操作
            loop {
                let mut lock = device_handle.lock().unwrap();
                if let Some(controller) = lock.as_mut() {
                    let mut buf = [0u8; 64];
                    let res = controller.read_timeout(&mut buf[..], 1);
                    controller.prase_buffer(&buf);
                    if res>0 {
                        //println!("{:?}",buf);
                        let advancedkeys = controller.get_advanced_keys();
                        //println!("{}", advancedkeys[0].raw);
                        app.emit("update-value", advancedkeys).unwrap();
                    }
                    if !controller.get_connection_state() {
                        println!("terminate thread");
                        break;
                    }
                }
                drop(lock);
                thread::sleep(Duration::from_millis(1));
            }
        });
        return true;
    } else {
        return false;
    }
}


#[tauri::command]
fn disconnect_device(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>){
    let mut binding = device_handle.lock().unwrap(); // Create a variable for the lock
    let controller: &mut Box<dyn KeyboardController> = binding.as_mut().unwrap(); // Use as_mut() for mutable reference
    controller.disconnect();
}

#[tauri::command]
fn fetch_config(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .fetch_config();
}

#[tauri::command]
fn save_config(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .save_config();
}

#[tauri::command]
fn flash_config(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .flash_config();
}

#[tauri::command]
fn system_reset(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .system_reset();
}

#[tauri::command]
fn factory_reset(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .factory_reset();
}

#[tauri::command]
fn start_debug(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle
        .lock()
        .unwrap()
        .as_mut()
        .unwrap()
        .start_debug();
}

#[tauri::command]
fn stop_debug(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) {
    device_handle.lock().unwrap().as_mut().unwrap().stop_debug();
}

#[tauri::command]
fn receive_data(device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>) -> i32 {
    let mut binding = device_handle.lock().unwrap(); // Create a variable for the lock
    let controller: &mut Box<dyn KeyboardController> = binding.as_mut().unwrap(); // Use as_mut() for mutable reference
    let mut buf = [0u8; 64];
    let res = controller.read_timeout(&mut buf[..], 10);
    controller.prase_buffer(&buf);
    return res as i32;
}

#[tauri::command]
fn receive_data_in_background(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
) {
    let _device_handle = device_handle.inner().clone(); // 克隆Arc以便在新线程中使用

}

#[tauri::command]
fn get_layout_json(
    device_handle: State<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>,
) -> String {
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
            get_rgb_base_config,
            set_rgb_base_config,
            get_rgb_configs,
            set_rgb_configs,
            get_keymap,
            set_keymap,
            get_layout_json,
            connect_device,
            disconnect_device,
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
        .manage::<Arc<Mutex<Option<Box<dyn KeyboardController>>>>>(Arc::new(Mutex::new(Some(Box::new(ANSI104SampleController::default())))))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
