import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKey, KeyboardKeycode, LayerControlKeycode, KeyboardController, DynamicKey, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, IDynamicKey, IDynamicKeyStroke4x4, IDynamicKeyModTap, IDynamicKeyToggleKey, IDynamicKeyMutex, RGBBaseConfig, detectHIDDevice, GamepadKeycode } from '../../interface';

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
                    Keycode.GamepadCollection | (GamepadKeycode.GamepadUp<<8)/*0*/, Keycode.GamepadCollection | (GamepadKeycode.GamepadRight<<8)/*1*/,     Keycode.GamepadCollection | (GamepadKeycode.GamepadDown<<8)/*2*/,     Keycode.GamepadCollection | (GamepadKeycode.GamepadA<<8)/*3*/,     Keycode.NoEvent/*4*/,     
                    Keycode.NoEvent/*5*/,     Keycode.GamepadCollection | (GamepadKeycode.GamepadB<<8)/*6*/,     Keycode.GamepadCollection | (GamepadKeycode.GamepadLB<<8)/*7*/,     Keycode.GamepadCollection | (GamepadKeycode.GamepadRT<<8)/*8*/,     Keycode.GamepadCollection | (GamepadKeycode.GamepadLeft<<8)/*9*/,     Keycode.NoEvent/*10*/,        
                    Keycode.GamepadCollection | (GamepadKeycode.GamepadX<<8)/*11*/,        Keycode.NoEvent/*12*/,        Keycode.NoEvent/*13*/,
                    Keycode.GamepadCollection | (GamepadKeycode.GamepadY<<8)/*14*/,        Keycode.GamepadCollection | (GamepadKeycode.GamepadRB<<8)/*15*/,    Keycode.GamepadCollection | (GamepadKeycode.GamepadLT<<8)/*16*/,    
                    Keycode.GamepadCollection | (GamepadKeycode.GamepadLS<<8)/*17*/,    Keycode.GamepadCollection | (GamepadKeycode.GamepadRS<<8)/*18*/,    Keycode.GamepadCollection | (GamepadKeycode.GamepadStart<<8)/*19*/,    Keycode.GamepadCollection | (GamepadKeycode.GamepadBack<<8)/*20*/,    
                    Keycode.NoEvent/*21*/,    Keycode.NoEvent/*22*/,    Keycode.NoEvent/*23*/,    Keycode.NoEvent/*24*/,        Keycode.NoEvent/*25*/,
                ],
                [ 
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,
                ],
                [
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,Keycode.KeyTransparent,
                    Keycode.KeyTransparent,
                ],
        ];
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;
    }
}