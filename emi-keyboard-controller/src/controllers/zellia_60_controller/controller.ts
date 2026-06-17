import { LibampKeyboardController } from '../libamp_keyboard_controller/controller';
import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKey, KeyboardController, DynamicKey, RGBBaseConfig, detectHIDDevice } from '../../interface';

const layout = `[
    [
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
        {"w":2}, "13\\n\\n\\n0,0",
        {"x":-2}, "14\\n\\n\\n0,1", "15\\n\\n\\n0,1"
    ],
    [
        {"a":4,"w":1.5}, "16",
        "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28",
        {"w":1.5}, "29"
    ],
    [
        {"w":1.75}, "30",
        "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41",
        {"w":2.25}, "42"
    ],
    [
        {"w":2.25}, "45\\n\\n\\n1,0",
        {"x":-2.25,"a":4,"w":1.25}, "43\\n\\n\\n1,1",
        "44\\n\\n\\n1,1",
        {"a":4}, "46", "47", "48", "49", "50", "51", "52", "53", "54", "55",
        {"w":2.75}, "56\\n\\n\\n2,0",
        {"x":-2.75,"a":4,"w":1.75}, "57\\n\\n\\n2,1",
        "58\\n\\n\\n2,1"
    ],
    [
        {"a":4,"w":1.5}, "59",
        "60",
        {"w":1.5}, "61",
        {"a":4,"w":7}, "62\\n\\n\\n3,0",
        {"x":-7,"w":3.5}, "66\\n\\n\\n3,1",
        {"w":3.5}, "67\\n\\n\\n3,1",
        {"a":4,"w":1.5}, "63",
        "64",
        {"w":1.5}, "65"
    ]
]`;

export class Zellia60Controller extends LibampKeyboardController {
    ADVANCED_KEY_NUM: number = 68;
    profile_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.reset_to_default();
    }

    async detect(silent: boolean = false): Promise<HIDDevice[]> {
        return detectHIDDevice({
            vendorId: 0xFEED,
            productId: 22319,
            usagePage: 0xFF60
            }, silent, "Zellia");
    }

    get_layout_json(): string {
        return layout;
    }

    get_layout_labels(): string[][] {
        return [
            ["Spilt backspace"],
            ["Spilt left shift"],
            ["Spilt enter"],
            ["7u space bar", "7u spilt space bar"],
        ];
    }


    reset_to_default(): void {
        this.advanced_keys = Array(this.ADVANCED_KEY_NUM).fill(null).map(() => new AdvancedKey({
            mode: KeyMode.KeyAnalogRapidMode,
            calibration_mode: CalibrationMode.KeyAutoCalibrationUndefined,
            activation_value: 0.5,
            deactivation_value: 0.49,
            trigger_distance: 0.08,
            release_distance: 0.08,
            trigger_speed: 0.01,
            release_speed: 0.01,
            upper_deadzone: 0.04,
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
                Array(this.ADVANCED_KEY_NUM).fill(0),
                Array(this.ADVANCED_KEY_NUM).fill(0),
                Array(this.ADVANCED_KEY_NUM).fill(0)
        ];
        this.dynamic_keys = Array(32).fill(null).map(() => (new DynamicKey()));;

    }
}
