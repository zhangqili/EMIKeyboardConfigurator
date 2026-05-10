import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKey, KeyboardKeycode, LayerControlKeycode, KeyboardController, DynamicKey, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, IDynamicKey, IDynamicKeyStroke4x4, IDynamicKeyModTap, IDynamicKeyToggleKey, IDynamicKeyMutex, RGBBaseConfig, MacroAction, detectHIDDevice } from '../../interface';

import layout from './keyboard_layout.json?raw';
//import markdown from './README.md?raw';

export class AT32KeyboardController extends LibampKeyboardController {
    ADVANCED_KEY_NUM: number = 68;
    profile_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.reset_to_default();
        this.feature.rgb_flag = true;
    }

    async detect(silent: boolean = false): Promise<HIDDevice[]> {
        return detectHIDDevice({
            vendorId: 0x2E3C,
            productId: 0x6040,
            usagePage: 0xFF60,
            }, silent);
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
        this.rgb_configs = Array(this.ADVANCED_KEY_NUM).fill(null).map(() => ({
            mode: RGBMode.RgbModeLinear,
            rgb: {
                red: 163,
                green: 55,
                blue: 252,
            },
            speed: 20
        }));
        this.keymap = [
            [
                /* Row 1 (15) */ Keycode.Escape, Keycode.Key1, Keycode.Key2, Keycode.Key3, Keycode.Key4, Keycode.Key5, Keycode.Key6, Keycode.Key7, Keycode.Key8, Keycode.Key9, Keycode.Key0, Keycode.Minus, Keycode.Equal, Keycode.Backspace, Keycode.Insert,
                /* Row 2 (15) */ Keycode.Tab, Keycode.Q, Keycode.W, Keycode.E, Keycode.R, Keycode.T, Keycode.Y, Keycode.U, Keycode.I, Keycode.O, Keycode.P, Keycode.LeftBrace, Keycode.RightBrace, Keycode.Backslash, Keycode.Delete,
                /* Row 3 (14) */ Keycode.CapsLock, Keycode.A, Keycode.S, Keycode.D, Keycode.F, Keycode.G, Keycode.H, Keycode.J, Keycode.K, Keycode.L, Keycode.Semicolon, Keycode.Apostrophe, Keycode.Enter, Keycode.PageUp,
                /* Row 4 (14) */ ((KeyModifier.KeyLeftShift) << 8), Keycode.Z, Keycode.X, Keycode.C, Keycode.V, Keycode.B, Keycode.N, Keycode.M, Keycode.Comma, Keycode.Dot, Keycode.Slash, ((KeyModifier.KeyRightShift) << 8), Keycode.UpArrow, Keycode.PageDown,
                /* Row 5 (10) */ ((KeyModifier.KeyLeftCtrl) << 8), ((KeyModifier.KeyLeftGui) << 8), ((KeyModifier.KeyLeftAlt) << 8), Keycode.Spacebar, ((KeyModifier.KeyRightAlt) << 8), Keycode.LayerControl | (1<<8) | (LayerControlKeycode.LayerMomentary << 12), ((KeyModifier.KeyRightCtrl) << 8), Keycode.LeftArrow, Keycode.DownArrow, Keycode.RightArrow
            ],
            [ 
                /* Row 1 (15) */ Keycode.Grave, Keycode.F1, Keycode.F2, Keycode.F3, Keycode.F4, Keycode.F5, Keycode.F6, Keycode.F7, Keycode.F8, Keycode.F9, Keycode.F10, Keycode.F11, Keycode.F12, Keycode.KeyTransparent, Keycode.KeyTransparent,
                /* Row 2 (15) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.PrintScreen, Keycode.ScrollLock, Keycode.Pause, Keycode.KeyTransparent,
                /* Row 3 (14) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.Home,
                /* Row 4 (14) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.LayerControl | (2<<8) | (LayerControlKeycode.LayerMomentary << 12), Keycode.End,
                /* Row 5 (10) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent
            ],
            [ 
                /* Row 1 (15) */ Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardBootloader << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile0 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile1 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile2 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardProfile3 << 8), Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardRgbBrightnessDown << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardRgbBrightnessUp << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardResetToDefault << 8), Keycode.KeyTransparent,
                /* Row 2 (15) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardReboot << 8), Keycode.KeyboardOperation | (((2 << 6) | (KeyboardKeycode.KeyboardConfigBase + 1)) << 8) /* NKRO Toggle */, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                /* Row 3 (14) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardSave << 8), Keycode.KeyboardOperation | (((2 << 6) | (KeyboardKeycode.KeyboardConfigBase + 0)) << 8) /* Debug Toggle */, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardFactoryReset << 8), Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                /* Row 4 (14) */ Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardCalibrate << 8), Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                /* Row 5 (10) */ Keycode.KeyTransparent, Keycode.KeyboardOperation | (((2 << 6) | (KeyboardKeycode.KeyboardConfigBase + 2)) << 8) /* Winlock Toggle */, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent
            ],
            Array(68).fill(Keycode.KeyTransparent),
            Array(68).fill(Keycode.KeyTransparent)
        ];
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;
        this.macros = Array(4).fill(Array(128).fill(new MacroAction()));
    }

    //get_readme_markdown(): string {
    //    return markdown;
    //}
}
