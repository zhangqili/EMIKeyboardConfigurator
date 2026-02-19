import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKeyToBytes, AdvancedKey, MouseKeycode, LayerControlKeycode, KeyboardController, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, DynamicKey, IDynamicKey, RGBBaseConfig, ScriptLevel, MacroAction } from './../../interface';

const layout = `[["0","1","2","3"]]`;

export class TrinityPadController  extends LibampKeyboardController {
    ADVANCED_KEY_NUM: number = 4;
    profile_number:number = 4;

    constructor() {
        super();
        this.reset_to_default();
        this.feature.rgb_flag = true;
        this.feature.script_level = ScriptLevel.JIT;
    }

    async detect(): Promise<HIDDevice[]> {
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 0xFEED, productId: 0xFFFF, usagePage: 0xFF60 }]  // 使用示例，过滤器可以根据需求进行调整
        });;
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
            mode: KeyMode.KeyAnalogRapidMode,
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
            speed: 0.02
        }));
        this.keymap = [
            [
                Keycode.Z,
                Keycode.X,
                Keycode.C,
                Keycode.V,
                Keycode.F8,
                Keycode.F12,
                (Keycode.F2 | ((KeyModifier.KeyLeftShift) << 8)),
                Keycode.F2,
                Keycode.LayerControl | ((2) << 8) | (LayerControlKeycode.LayerToggle << 12),
                Keycode.LayerControl | ((1) << 8) | (LayerControlKeycode.LayerToggle << 12),
                Keycode.Escape,
                Keycode.MouseCollection | ((MouseKeycode.MouseWheelUp) << 8),
                Keycode.MouseCollection | ((MouseKeycode.MouseWheelDown) << 8),
            ],
            [
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyUser | (0 << 8),
                Keycode.LayerControl | ((1) << 8) | (LayerControlKeycode.LayerToggle << 12),
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
            ],
            [
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.LayerControl | ((2) << 8) | (LayerControlKeycode.LayerToggle << 12),
                Keycode.KeyUser | (0 << 8),
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
                Keycode.KeyTransparent,
            ]
        ];
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;
        this.macros = Array(4).fill(Array(128).fill(new MacroAction()));
    }
}