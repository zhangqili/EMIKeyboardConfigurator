import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, KeyCode, KeyModifier, AdvancedKeyToBytes, AdvancedKey, SystemKeycode, LayerControlKeycode, KeyboardController } from './../../interface';

const layout = `[["Esc","!\\n1","@\\n2","#\\n3","$\\n4","%\\n5","^\\n6","&\\n7","*\\n8","(\\n9",")\\n0","_\\n-","+\\n=",{"w":2},"Backspace"],[{"w":1.5},"Tab","Q","W","E","R","T","Y","U","I","O","P","{\\n[","}\\n]",{"w":1.5},"|\\n\\\\"],[{"w":1.75},"Caps Lock","A","S","D","F","G","H","J","K","L",":\\n;","\\"\\n'",{"w":2.25},"Enter"],[{"w":2},"Shift","Z","X","C","V","B","N","M","<\\n,",">\\n.","?\\n/","Shift","↑","Del"],[{"w":1.25},"Ctrl",{"w":1.25},"Win",{"w":1.25},"Alt",{"a":7,"w":6.25},"",{"a":4},"Alt","Fn","←","↓","→"]]`;

export class OholeoKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    ADVANCED_KEY_NUM: number = 64;
    config_file_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.advanced_keys = Array(this.ADVANCED_KEY_NUM).fill(null).map(() => ({
            state: false,
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
                [
                    KeyCode.Escape/*0*/,    KeyCode.Key1/*1*/,  KeyCode.Key2/*2*/,  KeyCode.Key3/*3*/,  KeyCode.Key4/*4*/,  KeyCode.Key5/*5*/,  KeyCode.Key6/*6*/,  KeyCode.Key7/*7*/,  KeyCode.Key8/*8*/,  KeyCode.Key9/*9*/,  KeyCode.Key0/*10*/,     KeyCode.Minus/*11*/,        KeyCode.Equal/*12*/,        KeyCode.Backspace/*13*/,
                    KeyCode.Tab/*14*/,      KeyCode.Q/*15*/,    KeyCode.W/*16*/,    KeyCode.E/*17*/,    KeyCode.R/*18*/,    KeyCode.T/*19*/,    KeyCode.Y/*20*/,    KeyCode.U/*21*/,    KeyCode.I/*22*/,    KeyCode.O/*23*/,    KeyCode.P/*24*/,        KeyCode.LeftBrace/*25*/,    KeyCode.RightBrace/*26*/,   KeyCode.Backslash/*27*/,
                    KeyCode.CapsLock/*28*/, KeyCode.A/*29*/,    KeyCode.S/*30*/,    KeyCode.D/*31*/,    KeyCode.F/*32*/,    KeyCode.G/*33*/,    KeyCode.H/*34*/,    KeyCode.J/*35*/,    KeyCode.K/*36*/,    KeyCode.L/*37*/,    KeyCode.Semicolon/*38*/,KeyCode.Apostrophe/*39*/,   KeyCode.Enter/*40*/,
                    ((KeyModifier.KeyLeftShift) << 8)/*41*/,    KeyCode.Z/*42*/,    KeyCode.X/*43*/,    KeyCode.C/*44*/,    KeyCode.V/*45*/,    KeyCode.B/*46*/,    KeyCode.N/*47*/,    KeyCode.M/*48*/,    KeyCode.Comma/*49*/,KeyCode.Dot/*50*/,      KeyCode.Slash/*51*/,        ((KeyModifier.KeyRightShift) << 8)/*52*/, KeyCode.UpArrow/*53*/, KeyCode.Delete/*54*/,
                    ((KeyModifier.KeyLeftCtrl) << 8)/*55*/, ((KeyModifier.KeyLeftGui) << 8)/*56*/, ((KeyModifier.KeyLeftAlt) << 8)/*57*/, KeyCode.Spacebar/*58*/, ((KeyModifier.KeyRightAlt) << 8)/*59*/,   KeyCode.LayerControl | (1<<8) | (LayerControlKeycode.LayerMomentary << 12)/*60*/, KeyCode.LeftArrow/*61*/, KeyCode.DownArrow/*62*/, KeyCode.RightArrow/*63*/,
                ],
                [ 
                    KeyCode.Grave,          KeyCode.F1, KeyCode.F2, KeyCode.F3, KeyCode.F4, KeyCode.F5, KeyCode.F6, KeyCode.F7, KeyCode.F8, KeyCode.F9, KeyCode.F10, KeyCode.F11, KeyCode.F12, KeyCode.Backspace,
                    KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.PrintScreen, KeyCode.ScrollLock, KeyCode.Pause,
                    KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent,
                    KeyCode.KeyTransparent,                         KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.Insert, KeyCode.PageUp, KeyCode.LayerControl | (2<<8) | (LayerControlKeycode.LayerMomentary << 12),
                    KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.Home, KeyCode.PageDown, KeyCode.End,
                ],
                [ 
                    KeyCode.KeySystem | (SystemKeycode.SystemBootloader << 8),  KeyCode.KeySystem | (SystemKeycode.SystemConfig0 << 8), KeyCode.KeySystem | (SystemKeycode.SystemConfig1 << 8), KeyCode.KeySystem | (SystemKeycode.SystemConfig2 << 8),     KeyCode.KeySystem | (SystemKeycode.SystemConfig3 << 8), KeyCode.KeyTransparent,     KeyCode.KeyTransparent,         KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeySystem | (SystemKeycode.SystemResetToDefault << 8),
                    KeyCode.KeyTransparent,                                     KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                 KeyCode.KeySystem | (SystemKeycode.SystemReset << 8),       KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,     KeyCode.KeyTransparent,         KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent,
                    KeyCode.KeyUser | (16 << 8),                                KeyCode.KeyTransparent,                                 KeyCode.KeySystem | (SystemKeycode.SystemSave << 8),    KeyCode.KeySystem | (SystemKeycode.SystemDebug << 8),   KeyCode.KeySystem | (SystemKeycode.SystemFactoryReset << 8),KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,     KeyCode.KeyTransparent,         KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent,
                    KeyCode.KeyTransparent,                                                                                             KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                     KeyCode.KeyUser | (1 << 8),                             KeyCode.KeyUser | (0 << 8), KeyCode.KeyUser | (0xFF << 8),  KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent, KeyCode.KeyTransparent,
                    KeyCode.KeyTransparent,                                     KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,                                     KeyCode.KeyTransparent,                                 KeyCode.KeyTransparent,     KeyCode.KeyTransparent,         KeyCode.KeyTransparent, 
                ],
                Array(64).fill(KeyCode.KeyTransparent),
                Array(64).fill(KeyCode.KeyTransparent)
        ];

    }

    async detect(): Promise<HIDDevice[]> {
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 1156, productId: 22319, usagePage:0xFFC0}]  // 使用示例，过滤器可以根据需求进行调整
        });;
    }
    write(buf: Uint8Array): number {
        this.device?.sendReport(2, buf);
        return (buf.byteLength + 1);
    }
    read(buf: Uint8Array): number {
        throw new Error('Method not implemented.');
    }
    read_timeout(buf: Uint8Array, timeout: number): number {
        throw new Error('Method not implemented.');
    }
    async connect(device: HIDDevice): Promise<boolean> {
        this.device = device;
        var result : boolean = false;
        if (! this.device.opened) {
            result = (await device.open()) == undefined
        }
        if (result) {
            this.request_config();
            this.device.addEventListener("inputreport", (event : HIDInputReportEvent) => {
                const { data, device, reportId } = event;
                this.prase_buffer(new Uint8Array(data.buffer));
            });
        }
        return result;
    }
    disconnect(): void {
        this.device?.close();
    }
    prase_buffer(buf: Uint8Array): void {
        switch (buf[0]) {
            case 1 : {
                break;
            }
            case 0xFE : {
                for (var i = 0;i<4;i++) {
                    let key_index = buf[1 + 10 * i];
                    if (key_index >= this.advanced_keys.length) {
                        continue;
                    }
                    this.advanced_keys[key_index].state = buf[2 + 10 * i] > 0;
                    let dataView = new DataView(buf.buffer);
                    var raw_bytes =  [
                        buf[3 + 0 + 10 * i],
                        buf[3 + 1 + 10 * i],
                        buf[3 + 2 + 10 * i],
                        buf[3 + 3 + 10 * i],
                    ];
                    var value_bytes = [
                        buf[3 + 4 + 10 * i],
                        buf[3 + 5 + 10 * i],
                        buf[3 + 6 + 10 * i],
                        buf[3 + 7 + 10 * i],
                    ];
                    this.advanced_keys[key_index].raw = dataView.getFloat32(3 + 10*i,true);
                    this.advanced_keys[key_index].value = dataView.getFloat32(3 + 4 + 10*i,true);
                }
                break;
            }
            case 0xFF : {
                this.unload_cargo(buf.slice(1,buf.byteLength-1));
            }
            default: {
                break
            }
        }
    }
    unload_cargo(buf: Uint8Array) {
        let dataView = new DataView(buf.buffer);  
        switch (buf[0])
        {
        case 0: // Advanced Key
            const key_index = buf[1];
            this.advanced_keys[key_index].mode = buf[2];
            this.advanced_keys[key_index].activation_value = dataView.getFloat32(3 + 4 * 0, true);
            this.advanced_keys[key_index].deactivation_value = dataView.getFloat32(3 + 4 * 1, true);
            this.advanced_keys[key_index].trigger_distance = dataView.getFloat32(3 + 4 * 2, true);
            this.advanced_keys[key_index].release_distance = dataView.getFloat32(3 + 4 * 3, true);
            this.advanced_keys[key_index].trigger_speed = dataView.getFloat32(3 + 4 * 4, true);
            this.advanced_keys[key_index].release_speed = dataView.getFloat32(3 + 4 * 5, true);
            this.advanced_keys[key_index].upper_deadzone = dataView.getFloat32(3 + 4 * 6, true);
            this.advanced_keys[key_index].lower_deadzone = dataView.getFloat32(3 + 4 * 7, true);
            //g_keyboard_advanced_keys[command_advanced_key_mapping[buf[1]]].upper_bound = fill_in_float(&buf[2 + 4 * 8]);
            //g_keyboard_advanced_keys[command_advanced_key_mapping[buf[1]]].lower_bound = fill_in_float(&buf[2 + 4 * 9]);
            break;
        case 1: // Global LED
            this.rgb_switch = buf[1] != 0;
            break;
        case 2: // LED
            for (var i = 0; i < 6; i++)
            {
                const key_index = buf[1+9*i];
                if (key_index<this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[1 + 9 * i + 1];
                    this.rgb_configs[key_index].rgb.red = buf[1 + 9 * i + 2];
                    this.rgb_configs[key_index].rgb.green = buf[1 + 9 * i + 3];
                    this.rgb_configs[key_index].rgb.blue = buf[1 + 9 * i + 4];
                    this.rgb_configs[key_index].speed = dataView.getFloat32(1 + 9 * i + 5, true);
                    
                    //rgb_to_hsv(&g_rgb_configs[g_rgb_mapping[buf[1]+i]].hsv, &g_rgb_configs[g_rgb_mapping[buf[1]+i]].rgb);
                }
            }
            break;
        case 3: // Keymap
            const LAYER_PAGE_LENGTH = 16;
            const LAYER_PAGE_EXPECTED_NUM = Math.ceil(((this.keymap[0].length + 15) / 16))
            const layer_index = buf[1];
            const layer_page_index = buf[2];
            if (layer_index < this.keymap.length && layer_page_index < LAYER_PAGE_EXPECTED_NUM)
            {
                const layerPageDataView = new DataView(buf.slice(3,buf.byteLength-1).buffer);
                for (let i = 0; i < LAYER_PAGE_LENGTH; i++) {
                    this.keymap[layer_index][layer_page_index*16 + i] = dataView.getUint16(3 + i*2, true);
                }
            }
            break;
        case 0x80: 
            this.config_index = buf[1];
            this.dispatchEvent(new Event('updateData'));
            break;
        default:
            break;
        }
    }

    get_connection_state(): boolean {
        return this.device != undefined;
    }

    fetch_config(): void {
        throw new Error('Method not implemented.');
    }
    save_config(): void {
        this.send_advanced_keys();
        this.send_rgb_configs();
        this.send_keymap();
    }
    flash_config(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x80;
        let res = this.write(send_buf);
        console.log("Wrote Save Command: {:?} byte(s)", res);
    }
    system_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x81;
        let res = this.write(send_buf);
        console.log("Wrote System Reset Command: {:?} byte(s)", res);
    }
    factory_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x82;
        let res = this.write(send_buf);
        console.log("Wrote Factory Reset Command: {:?} byte(s)", res);
    }
    request_config(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xB1;
        this.write(send_buf);
    }
    start_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xB0;
        send_buf[1] = 0x01;
        this.write(send_buf);
    }
    stop_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xB0;
        send_buf[1] = 0x00;
        this.write(send_buf);
    }
    get_layout_json(): string {
        return layout;
    }

    send_advanced_keys() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x00;
        this.advanced_keys.forEach((item, index) =>{
            send_buf[2] = index;
            let key_bytes = AdvancedKeyToBytes(item);
            send_buf.set(key_bytes,3);
            let res = this.write(send_buf);
            console.log("Wrote Advanced Key: {:?} byte(s)", res);

        });
    }

    send_rgb_configs() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x01;
        send_buf[2] = this.rgb_switch ? 1 : 0;
        {
            let res = this.write(send_buf);
            console.log("Wrote RGB Configs: {:?} byte(s)", res);
        }
        send_buf[1] = 0x02;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index+=1){
            for (var j = 0; j < 6; j+=1){
                let dataView = new DataView(send_buf.buffer);
                let rgb_index = rgb_page_index * 6 + j;
                if (rgb_index < this.rgb_configs.length ){
                    let item = this.rgb_configs[rgb_index];
                    console.log(rgb_index);
                    send_buf[2 + 0 + 9 * j] = rgb_index;
                    send_buf[2 + 1 + 9 * j] = item.mode;
                    send_buf[2 + 2 + 9 * j] = item.rgb.red;
                    send_buf[2 + 3 + 9 * j] = item.rgb.green;
                    send_buf[2 + 4 + 9 * j] = item.rgb.blue;
                    dataView.setFloat32(2 + 5 + 9 * j,item.speed,true);
                }
                else
                {
                    send_buf[2 + 0 + 9 * j] = 0xFF;
                    break;
                }
            }
            let res = this.write(send_buf);
            console.log("Wrote RGB Configs: {:?} byte(s)", res);
        }
    }

    send_keymap() {
        const layer_page_length = 16;
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x03;
        let dataView = new DataView(send_buf.buffer);        
        this.keymap.forEach((layer,i) => {
            send_buf[2] = i; //layer_index
            for (var index = 0; index < layer.length; index+=layer_page_length) {
                var layer_seg;
                if (index + layer_page_length > layer.length) {
                    layer_seg = layer.slice(index,layer.length); 
                }
                else
                {
                    layer_seg = layer.slice(index,index+layer_page_length); 
                }
                send_buf[3] = index/layer_page_length;//layer_page_index
                layer_seg.forEach((value,k) => {
                    dataView.setUint16(4 + k * 2,value,true);
                });
                //console.log(send_buf);
                let res = this.write(send_buf);
                console.log("Wrote Keymap: {:?} byte(s)", res);
            }
        });
    }

    get_config_file_num(): number {
        return this.config_file_number;
    }

    get_config_file_index(): number {
        return this.config_file_number;
    }

    set_config_file_index(index: number) : void {
        this.config_file_number = index;
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x90;
        send_buf[1] = this.config_file_number;
        let res = this.write(send_buf);
        this.request_config();
    }
}