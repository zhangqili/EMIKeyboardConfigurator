import * as ekc from "emi-keyboard-controller"

const DEVICES = [
    "Trinity Pad",
    "Oholeo Keyboard",
    "Zellia80 HE",
    "Destrez Asural Left",
    "Destrez Asural Right",
    "ANSI 104 Sample",
];

var CONTROLLER : ekc.KeyboardController;

export async function get_devices() {
    return DEVICES;
}

export async function set_device(device: string) {
    switch (device) {
        case "Trinity Pad":{
            CONTROLLER = new ekc.TrinityPadController();
            break;
        }
        case "Oholeo Keyboard":{
            CONTROLLER = new ekc.OholeoKeyboardController();
            break;
        }
        case "Zellia80 HE":{
            CONTROLLER = new ekc.Zellia80Controller();
            break;
        }
        case "Destrez Asural Left":{
            CONTROLLER = new ekc.DestrezAsuralLeftController();
            break;
        }
        case "Destrez Asural Right":{
            CONTROLLER = new ekc.DestrezAsuralRightController();
            break;
        }
        case "ANSI 104 Sample":{
            CONTROLLER = new ekc.ANSI104SampleController();
            break;
        }
        default:{
            CONTROLLER = new ekc.ANSI104SampleController();
            break;
        }
    }
}

export async function get_advanced_keys() {
    return CONTROLLER.get_advanced_keys() as ekc.IAdvancedKey[];
}

export async function set_advanced_keys(keys: ekc.IAdvancedKey[]) {
    return CONTROLLER.set_advanced_keys(keys);
}

export async function get_rgb_base_config() {
    return CONTROLLER.get_rgb_base_config() as ekc.IRGBBaseConfig;
}

export async function set_rgb_base_config(value: ekc.IRGBBaseConfig) {
    return CONTROLLER.set_rgb_base_config(value);
}

export async function get_rgb_configs() {
    return CONTROLLER.get_rgb_configs() as ekc.IRGBConfig[];
}

export async function set_rgb_configs(configs: ekc.IRGBConfig[]) {
    return CONTROLLER.set_rgb_configs(configs);;
}

export async function get_keymap() {
    return CONTROLLER.get_keymap() as number[][];
}

export async function set_keymap(keymap: number[][]) {
    return CONTROLLER.set_keymap(keymap);
}

export async function get_layout_json(){
    return CONTROLLER.get_layout_json() as string;
}

export async function get_dynamic_keys(){
    return CONTROLLER.get_dynamic_keys() as ekc.IDynamicKey[];
}
export async function set_dynamic_keys(dynamic_keys: ekc.IDynamicKey[]){
    return CONTROLLER.set_dynamic_keys(dynamic_keys);
}

export async function reset_to_default(){
    return CONTROLLER.reset_to_default();
}

export async function connect_device(){
    var d = await CONTROLLER.detect();
    if (d.length > 0) {
        return await CONTROLLER.connect(d[0]);
    }
    else{
        return false;
    }
}

export async function disconnect_device(){
    return CONTROLLER.disconnect();
}


export async function fetch_config(){
    return CONTROLLER.fetch_config();
}

export async function save_config(){
    return CONTROLLER.save_config();
}

export async function flash_config(){
    return CONTROLLER.flash_config();
}

export async function system_reset(){
    return CONTROLLER.system_reset();
}

export async function factory_reset(){
    return CONTROLLER.factory_reset();
}

export async function start_debug(){
    return CONTROLLER.start_debug();
}

export async function stop_debug(){
    return CONTROLLER.stop_debug();
}

export async function request_debug(){
    return CONTROLLER.request_debug();
}

export async function get_config_file_num(){
    return CONTROLLER.get_config_file_num();
}

export async function set_config_file_num(index : number){
    return CONTROLLER.set_config_file_index(index);
}

export async function addEventListener(type: string, listener: EventListener){
    return CONTROLLER.addEventListener(type, listener);
}
export async function removeEventListener(type: string, listener: EventListener){
    return CONTROLLER.removeEventListener(type, listener);
}