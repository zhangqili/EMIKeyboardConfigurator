import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKeyToBytes, AdvancedKey, KeyboardKeycode, LayerControlKeycode, KeyboardController, DynamicKey, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, IDynamicKey, IDynamicKeyStroke4x4, IDynamicKeyModTap, IDynamicKeyToggleKey, IDynamicKeyMutex, RGBBaseConfig } from '../../interface';

const layout = `[[{"w":1.75},"BackSpace","+\\n=","_\\n-","(\\n0",")\\n9","*\\n8","&\\n7"],[{"x":0.25,"w":1.5},"|\\n\\\\","{\\n[","}\\n]","P","O","I","U"],[{"w":1.75},"Enter","\\"\\n'",":\\n;","L","K","J","H"],[{"w":1.75},"Shift","?\\n/","<\\n,",">\\n.","M","N",{"a":7},""],[{"a":4,"w":1.25},"Ctrl",{"w":1.25},"Menu","Del",{"w":1.25},"Alt",{"a":7},"",{"w":2},""]]`;

export class DestrezAsuralLeftController extends LibampKeyboardController {
    ADVANCED_KEY_NUM: number = 34;
    profile_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.reset_to_default();
        this.feature.rgb_flag = true;
    }

    async detect(): Promise<HIDDevice[]> {
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 0xFEED, productId: 22319, usagePage: 0xFF60}]  // 使用示例，过滤器可以根据需求进行调整
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
            speed: 0.02
        }));
        this.keymap = [
                [
                    Keycode.Escape/*0*/,    Keycode.Key1/*1*/,  Keycode.Key2/*2*/,  Keycode.Key3/*3*/,  Keycode.Key4/*4*/,  Keycode.Key5/*5*/,  Keycode.Key6/*6*/,  Keycode.Key7/*7*/,  Keycode.Key8/*8*/,  Keycode.Key9/*9*/,  Keycode.Key0/*10*/,     Keycode.Minus/*11*/,        Keycode.Equal/*12*/,        Keycode.Backspace/*13*/,
                    Keycode.Tab/*14*/,      Keycode.Q/*15*/,    Keycode.W/*16*/,    Keycode.E/*17*/,    Keycode.R/*18*/,    Keycode.T/*19*/,    Keycode.Y/*20*/,    Keycode.U/*21*/,    Keycode.I/*22*/,    Keycode.O/*23*/,    Keycode.P/*24*/,        Keycode.LeftBrace/*25*/,    Keycode.RightBrace/*26*/,   Keycode.Backslash/*27*/,
                    Keycode.CapsLock/*28*/, Keycode.A/*29*/,    Keycode.S/*30*/,    Keycode.D/*31*/,    Keycode.F/*32*/,    Keycode.G/*33*/,    Keycode.H/*34*/,    Keycode.J/*35*/,    Keycode.K/*36*/,    Keycode.L/*37*/,    Keycode.Semicolon/*38*/,Keycode.Apostrophe/*39*/,   Keycode.Enter/*40*/,
                    ((KeyModifier.KeyLeftShift) << 8)/*41*/,    Keycode.Z/*42*/,    Keycode.X/*43*/,    Keycode.C/*44*/,    Keycode.V/*45*/,    Keycode.B/*46*/,    Keycode.N/*47*/,    Keycode.M/*48*/,    Keycode.Comma/*49*/,Keycode.Dot/*50*/,      Keycode.Slash/*51*/,        ((KeyModifier.KeyRightShift) << 8)/*52*/, Keycode.UpArrow/*53*/, Keycode.Delete/*54*/,
                    ((KeyModifier.KeyLeftCtrl) << 8)/*55*/, ((KeyModifier.KeyLeftGui) << 8)/*56*/, ((KeyModifier.KeyLeftAlt) << 8)/*57*/, Keycode.Spacebar/*58*/, ((KeyModifier.KeyRightAlt) << 8)/*59*/,   Keycode.LayerControl | (1<<8) | (LayerControlKeycode.LayerMomentary << 12)/*60*/, Keycode.LeftArrow/*61*/, Keycode.DownArrow/*62*/, Keycode.RightArrow/*63*/,
                ],
                [ 
                    Keycode.Grave,          Keycode.F1, Keycode.F2, Keycode.F3, Keycode.F4, Keycode.F5, Keycode.F6, Keycode.F7, Keycode.F8, Keycode.F9, Keycode.F10, Keycode.F11, Keycode.F12, Keycode.Backspace,
                    Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.PrintScreen, Keycode.ScrollLock, Keycode.Pause,
                    Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                    Keycode.KeyTransparent,                         Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.Insert, Keycode.PageUp, Keycode.LayerControl | (2<<8) | (LayerControlKeycode.LayerMomentary << 12),
                    Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.Home, Keycode.PageDown, Keycode.End,
                ],
                [ 
                    Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardBootloader << 8),  Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardConfig0 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardConfig1 << 8), Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardConfig2 << 8),     Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardConfig3 << 8), Keycode.KeyTransparent,     Keycode.KeyTransparent,         Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardResetToDefault << 8),
                    Keycode.KeyTransparent,                                     Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                 Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardReboot << 8),       Keycode.KeyTransparent,                                 Keycode.KeyTransparent,     Keycode.KeyTransparent,         Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                    Keycode.KeyUser | (16 << 8),                                Keycode.KeyTransparent,                                 Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardSave << 8),    Keycode.KeyTransparent,   Keycode.KeyboardOperation | (KeyboardKeycode.KeyboardFactoryReset << 8),Keycode.KeyTransparent,                                 Keycode.KeyTransparent,     Keycode.KeyTransparent,         Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                    Keycode.KeyTransparent,                                                                                             Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                     Keycode.KeyUser | (1 << 8),                             Keycode.KeyUser | (0 << 8), Keycode.KeyUser | (0xFF << 8),  Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent, Keycode.KeyTransparent,
                    Keycode.KeyTransparent,                                     Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                 Keycode.KeyTransparent,                                     Keycode.KeyTransparent,                                 Keycode.KeyTransparent,     Keycode.KeyTransparent,         Keycode.KeyTransparent, 
                ],
                Array(64).fill(Keycode.KeyTransparent),
                Array(64).fill(Keycode.KeyTransparent)
        ];
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;
    }
}