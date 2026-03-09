import * as ekc from "emi-keyboard-controller"

const DEVICES = [
    "Trinity Pad",
    "Oholeo Keyboard",
    "Oholeo Keyboard V2",
    "Zellia80 HE",
    "Zellia60 HE",
    "Zellia Starlight",
    "Destrez Asural Left",
    "Destrez Asural Right",
    "ANSI 104 Sample",
];

var CONTROLLER : ekc.KeyboardController;

export async function get_devices() {
    return DEVICES;
}

function create_controller(device: string): ekc.KeyboardController {
    switch (device) {
        case "Trinity Pad": return new ekc.TrinityPadController();
        case "Oholeo Keyboard": return new ekc.OholeoKeyboardController();
        case "Oholeo Keyboard V2": return new ekc.OholeoKeyboardV2Controller();
        case "Zellia60 HE": return new ekc.Zellia60Controller();
        case "Zellia80 HE": return new ekc.Zellia80Controller();
        case "Zellia Starlight": return new ekc.ZelliaStarlightController();
        case "Destrez Asural Left": return new ekc.DestrezAsuralLeftController();
        case "Destrez Asural Right": return new ekc.DestrezAsuralRightController();
        case "ANSI 104 Sample": return new ekc.ANSI104SampleController();
        default: return new ekc.ANSI104SampleController();;
    }
}

export async function set_device(device: string) {
    CONTROLLER = create_controller(device);
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
export async function set_dynamic_keys(dynamicKeys: ekc.IDynamicKey[]){
    return CONTROLLER.set_dynamic_keys(dynamicKeys);
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


export async function fetch(){
    return CONTROLLER.fetch();
}

export async function save(){
    return CONTROLLER.save();
}

export async function flash(){
    return CONTROLLER.flash();
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

export async function request_debug_at(ids : number[]){
    return CONTROLLER.request_debug_at(ids);
}

export async function get_profile_num(){
    return CONTROLLER.get_profile_num();
}

export async function set_profile_index(index : number){
    return CONTROLLER.set_profile_index(index);
}

export async function get_profile_index(){
    return CONTROLLER.get_profile_index();
}

export async function addEventListener(type: string, listener: EventListener){
    return CONTROLLER.addEventListener(type, listener);
}
export async function removeEventListener(type: string, listener: EventListener){
    return CONTROLLER.removeEventListener(type, listener);
}

export async function get_layout_labels(){
    return CONTROLLER.get_layout_labels();
}

export async function get_firmware_version(){
    return CONTROLLER.get_firmware_version();
}

export async function get_macros(){
    return CONTROLLER.get_macros();
}

export async function set_macros(macros : ekc.IMacroAction[][] ){
    return CONTROLLER.set_macros(macros);
}

export async function get_readme_markdown(){
    return CONTROLLER.get_readme_markdown();
}

export async function get_feature(){
    return CONTROLLER.get_feature();
}

export async function get_script_source(){
    return CONTROLLER.get_script_source();
}

export async function set_script_source(source : string){
    return CONTROLLER.set_script_source(source);
}

export async function get_script_bytecode(){
    return CONTROLLER.get_script_bytecode();
}

export async function set_script_bytecode(bytecode : Uint8Array ){
    return CONTROLLER.set_script_bytecode(bytecode);
}
export async function emit(event: ekc.KeyboardKeyEvent, use_keymap: boolean){
    return CONTROLLER.emit(event, use_keymap);
}
