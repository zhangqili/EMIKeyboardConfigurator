import { IAdvancedKey, IRGBConfig } from "./interface.ts"
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

export async function get_rgb_switch() {
    return (await invoke('get_rgb_switch')) as boolean;
}

export async function set_rgb_switch(value: boolean) {
    return (await invoke("set_rgb_switch", { value }));
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

