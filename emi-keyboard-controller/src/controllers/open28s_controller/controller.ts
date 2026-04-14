import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKey, KeyboardKeycode, LayerControlKeycode, KeyboardController, DynamicKey, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, IDynamicKey, IDynamicKeyStroke4x4, IDynamicKeyModTap, IDynamicKeyToggleKey, IDynamicKeyMutex, RGBBaseConfig, detectHIDDevice } from '../../interface';

import layout from './keyboard_layout.json?raw';
export class Open28SController extends LibampKeyboardController {
    ADVANCED_KEY_NUM: number = 17;
    profile_number:number = 0;

    constructor() {
        super();
        this.device = undefined;
        this.reset_to_default();
        this.feature.rgb_flag = false;
    }

    async detect(silent: boolean = false): Promise<HIDDevice[]> {
        return detectHIDDevice({
            vendorId: 0xFEED,
            productId: 22319,
            usagePage: 0xFF60,
            }, silent, "28S");
    }

    get_layout_json(): string {
        return layout;
    }
    
    reset_to_default(): void {
        this.advanced_keys = Array(this.ADVANCED_KEY_NUM).fill(null).map(() => ({
            state: false,
            report_state: false,
            value: 0.0,
            raw: 0.0,
            mode: KeyMode.KeyAnalogNormalMode,
            calibration_mode: CalibrationMode.KeyAutoCalibrationUndefined,
            maximum: 0.0,
            minimum: 0.0,
            activation_value: 0.5,
            deactivation_value: 0.49,
            trigger_distance: 0.08,
            release_distance: 0.08,
            trigger_speed: 0.01,
            release_speed: 0.01,
            upper_deadzone: 0.00,
            lower_deadzone: 0.2,
            upper_bound: 2600.0,
            lower_bound: 140.0,
        }));
        this.rgb_base_config = new RGBBaseConfig();
        this.rgb_configs = [];
        this.keymap = [
                [
                    Keycode.Escape/*0*/,    Keycode.Key1/*1*/,  Keycode.Key2/*2*/,  Keycode.Key3/*3*/,  Keycode.Key4/*4*/,  Keycode.Key5/*5*/,  Keycode.Key6/*6*/,  Keycode.Key7/*7*/,  Keycode.Key8/*8*/,  Keycode.Key9/*9*/,  Keycode.Key0/*10*/,     Keycode.Minus/*11*/,        Keycode.Equal/*12*/,        Keycode.Backspace/*13*/,
                    Keycode.Tab/*14*/,      Keycode.Q/*15*/,    Keycode.W/*16*/,    
                ],
                [ 
                    Keycode.Grave,          Keycode.F1, Keycode.F2, Keycode.F3, Keycode.F4, Keycode.F5, Keycode.F6, Keycode.F7, Keycode.F8, Keycode.F9, Keycode.F10, Keycode.F11, Keycode.F12, Keycode.Backspace,
                    Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, 
                ],
                [ 
                    Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardBootloader << 8),  Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile0 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile1 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile2 << 8),     Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile3 << 8), Keycode.KeyTransparent,     Keycode.KeyTransparent,         Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardResetToDefault << 8),
                    Keycode.KeyTransparent,                                     Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                 ],
                Array(17).fill(Keycode.KeyTransparent),
                Array(17).fill(Keycode.KeyTransparent)
        ];
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;
    }
}