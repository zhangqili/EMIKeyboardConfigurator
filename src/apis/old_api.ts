import { IAdvancedKey, IRGBConfig } from "./old_interface.ts"
import { invoke } from '@tauri-apps/api/core';

export interface ITrinityKeypadController {
    advanced_keys: IAdvancedKey[],
    rgb_switch: boolean,
    rgb_configs: IRGBConfig[],
    keymap: number[][],
}

export async function get_devices() {
    return (await invoke('get_devices')) as string[];
}

export async function set_device(device: string) {
    return (await invoke("set_device", { device }));
}

export async function get_advanced_keys() {
    return (await invoke('get_advanced_keys')) as IAdvancedKey[];
}

export async function set_advanced_keys(keys: IAdvancedKey[]) {
    return (await invoke("set_advanced_keys", { keys }));
}

export async function get_rgb_base_config() {
    return (await invoke('get_rgb_base_config')) as boolean;
}

export async function set_rgb_base_config(value: boolean) {
    return (await invoke("set_rgb_base_config", { value }));
}

export async function get_rgb_configs() {
    return (await invoke('get_rgb_configs')) as IRGBConfig[];
}

export async function set_rgb_configs(configs: IRGBConfig[]) {
    return (await invoke("set_rgb_configs", { configs }));
}

export async function get_keymap() {
    return (await invoke("get_keymap")) as number[][];
}

export async function set_keymap(keymap: number[][]) {
    return (await invoke("set_keymap", { keymap }));
}

export async function get_layout_json(){
    return (await invoke("get_layout_json")) as string;
}

export async function connect_device(){
    return (await invoke("connect_device")) as boolean;
}

export async function disconnect_device(){
    return (await invoke("disconnect_device"));
}


export async function fetch_config(){
    return (await invoke("fetch_config"));
}

export async function save_config(){
    return (await invoke("save_config"));
}

export async function flash_config(){
    return (await invoke("flash_config"));
}

export async function system_reset(){
    return (await invoke("system_reset"));
}

export async function factory_reset(){
    return (await invoke("factory_reset"));
}

export async function start_debug(){
    return (await invoke("start_debug"));
}

export async function stop_debug(){
    return (await invoke("stop_debug"));
}

export async function receive_data(){
    return (await invoke("receive_data"));
}

export async function receive_data_in_background(){
    return (await invoke("receive_data_in_background"));
}