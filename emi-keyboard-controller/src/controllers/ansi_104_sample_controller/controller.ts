import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKeyToBytes, AdvancedKey, KeyboardController } from './../../interface';

const layout = `[["Esc",{"x":1},"F1","F2","F3","F4",{"x":0.5},"F5","F6","F7","F8",{"x":0.5},"F9","F10","F11","F12",{"x":0.25},"PrtSc","Scroll Lock","Pause\\nBreak"],[{"y":0.5},"~\\n\`","!\\n1","@\\n2","#\\n3","$\\n4","%\\n5","^\\n6","&\\n7","*\\n8","(\\n9",")\\n0","_\\n-","+\\n=",{"w":2},"Backspace",{"x":0.25},"Insert","Home","PgUp",{"x":0.25},"Num Lock","/","*","-"],[{"w":1.5},"Tab","Q","W","E","R","T","Y","U","I","O","P","{\\n[","}\\n]",{"w":1.5},"|\\n\\\\",{"x":0.25},"Delete","End","PgDn",{"x":0.25},"7\\nHome","8\\n↑","9\\nPgUp",{"h":2},"+"],[{"w":1.75},"Caps Lock","A","S","D","F","G","H","J","K","L",":\\n;","\\"\\n'",{"w":2.25},"Enter",{"x":3.5},"4\\n←","5","6\\n→"],[{"w":2.25},"Shift","Z","X","C","V","B","N","M","<\\n,",">\\n.","?\\n/",{"w":2.75},"Shift",{"x":1.25},"↑",{"x":1.25},"1\\nEnd","2\\n↓","3\\nPgDn",{"h":2},"Enter"],[{"w":1.25},"Ctrl",{"w":1.25},"Win",{"w":1.25},"Alt",{"a":7,"w":6.25},"",{"a":4,"w":1.25},"Alt",{"w":1.25},"Win",{"w":1.25},"Menu",{"w":1.25},"Ctrl",{"x":0.25},"←","↓","→",{"x":0.25,"w":2},"0\\nIns",".\\nDel"]]`;

export class ANSI104SampleController extends KeyboardController {
    device: HIDDevice | undefined;
    ADVANCED_KEY_NUM: number = 104;

    constructor() {
        super();
        this.device = undefined;
        this.advanced_keys = Array(this.ADVANCED_KEY_NUM).fill(null).map(() => ({
            state: false,
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
            upper_deadzone: 0.04,
            lower_deadzone: 0.2,
            upper_bound: 2600.0,
            lower_bound: 140.0,
        }));
        this.rgb_switch = true;
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
                Array(this.ADVANCED_KEY_NUM).fill(0),
                Array(this.ADVANCED_KEY_NUM).fill(0),
                Array(this.ADVANCED_KEY_NUM).fill(0)
        ];

    }

    async detect(): Promise<HIDDevice[]> {
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 0xFFFF, productId: 0xFFFF, usagePage:0xFFC0}]  // 使用示例，过滤器可以根据需求进行调整
        });;
    }

    get_layout_json(): string {
        return layout;
    }
}