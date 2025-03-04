import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, Keycode, KeyModifier, AdvancedKeyToBytes, AdvancedKey, MouseKeycode, LayerControlKeycode, KeyboardController, DynamicKeyType, DynamicKeyStroke4x4, DynamicKeyModTap, DynamicKeyToggleKey, DynamicKeyMutex, DynamicKey, IDynamicKey } from './../../interface';

const layout = `[[{"a": 7},"Z","X","C","V"]]`;

export class TrinityKeypadController extends KeyboardController {
    device: HIDDevice | undefined;
    ADVANCED_KEY_NUM: number = 4;
    config_file_number:number = 4;
    private handleInputReport: (event: HIDInputReportEvent) => void;

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
        this.handleInputReport = (event: HIDInputReportEvent) => {
            const { data } = event;
            this.prase_buffer(new Uint8Array(data.buffer));
        };
    }

    async detect(): Promise<HIDDevice[]> {
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 0xFEED, productId: 0xFFFF, usagePage: 0xFF60 }]  // 使用示例，过滤器可以根据需求进行调整
        });;
    }
    write(buf: Uint8Array): number {
        this.device?.sendReport(0, buf);
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
            result = (await this.device.open()) == undefined
        }
        if (result) {
            this.request_config();
            this.device.addEventListener("inputreport", this.handleInputReport);
        }
        return result;
    }
    disconnect(): void {
        this.device?.close();
        this.device?.removeEventListener("inputreport", this.handleInputReport);
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
                this.unload_cargo(buf.slice(1,buf.byteLength));
                break
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
            const LAYER_PAGE_LENGTH = 13;
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
        case 4:   
            const dynamic_key_index = buf[1];
            var dynamic_key : IDynamicKey;
            const dynamic_key_type = dataView.getUint32(2,true);
            switch (dynamic_key_type) {
                case DynamicKeyType.DynamicKeyStroke:
                    var dynamic_key_stroke = new DynamicKeyStroke4x4();
                    dynamic_key_stroke.type = dataView.getUint32(2,true);
                    dynamic_key_stroke.bindings[0] = dataView.getUint16(2+4+0,true);
                    dynamic_key_stroke.bindings[1] = dataView.getUint16(2+4+2,true);
                    dynamic_key_stroke.bindings[2] = dataView.getUint16(2+4+4,true);
                    dynamic_key_stroke.bindings[3] = dataView.getUint16(2+4+6,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(2+12+0,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(2+12+2,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(2+12+4,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(2+12+6,true);
                    dynamic_key_stroke.press_begin_distance = dataView.getFloat32(2+20,true);
                    dynamic_key_stroke.press_fully_distance = dataView.getFloat32(2+24,true);
                    dynamic_key_stroke.release_begin_distance = dataView.getFloat32(2+28,true);
                    dynamic_key_stroke.release_fully_distance = dataView.getFloat32(2+32,true);
                    dynamic_key = dynamic_key_stroke;
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    var dynamic_key_mt = new DynamicKeyModTap();
                    dynamic_key_mt.type = dataView.getUint32(2,true);
                    dynamic_key_mt.bindings[0] = dataView.getUint16(2+4+0,true);
                    dynamic_key_mt.bindings[1] = dataView.getUint16(2+4+2,true);
                    dynamic_key_mt.duration = dataView.getUint32(2+8,true);
                    dynamic_key = dynamic_key_mt;
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    var dynamic_key_tk = new DynamicKeyToggleKey();
                    dynamic_key_tk.type = dataView.getUint32(2,true);
                    dynamic_key_tk.bindings[0] = dataView.getUint16(2+4+0,true);
                    dynamic_key = dynamic_key_tk;
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    var dynamic_key_m = new DynamicKeyMutex();
                    dynamic_key_m.type  = dataView.getUint32(2,true);
                    dynamic_key_m.bindings[0]  = dataView.getUint16(2+4+0,true);
                    dynamic_key_m.bindings[1]  = dataView.getUint16(2+4+2,true);
                    dynamic_key_m.key_id[0] = dataView.getUint16(2+8+0,true);
                    dynamic_key_m.key_id[1] = dataView.getUint16(2+8+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(2+12);
                    dynamic_key = dynamic_key_m;
                default:
                    dynamic_key = new DynamicKey();
                    break;
            }
            this.dynamic_keys[dynamic_key_index] = dynamic_key;
        case 0x80: 
            console.debug("finished");
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
        this.send_dynamic_keys();
    }
    flash_config(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x80;
        let res = this.write(send_buf);
        console.debug("Wrote Save Command: {:?} byte(s)", res);
    }
    system_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x81;
        let res = this.write(send_buf);
        console.debug("Wrote System Reset Command: {:?} byte(s)", res);
    }
    factory_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0x82;
        let res = this.write(send_buf);
        console.debug("Wrote Factory Reset Command: {:?} byte(s)", res);
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
            console.debug("Wrote Advanced Key: {:?} byte(s)", res);

        });
    }

    send_rgb_configs() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x01;
        send_buf[2] = this.rgb_switch ? 1 : 0;
        {
            let res = this.write(send_buf);
            console.debug("Wrote RGB Configs: {:?} byte(s)", res);
        }
        send_buf[1] = 0x02;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index+=1){
            for (var j = 0; j < 6; j+=1){
                let dataView = new DataView(send_buf.buffer);
                let rgb_index = rgb_page_index * 6 + j;
                if (rgb_index < this.rgb_configs.length ){
                    let item = this.rgb_configs[rgb_index];
                    console.debug(rgb_index);
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
                }
            }
            let res = this.write(send_buf);
            console.debug("Wrote RGB Configs: {:?} byte(s)", res);
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
                //console.debug(send_buf);
                let res = this.write(send_buf);
                console.debug("Wrote Keymap: {:?} byte(s)", res);
            }
        });
    }

    send_dynamic_keys() {
        this.dynamic_keys.forEach((item,i) => {
            var send_buf = new Uint8Array(63);
            send_buf[0] = 0xFF;
            send_buf[1] = 0x04;
            send_buf[2] = i;
            let dataView = new DataView(send_buf.buffer);
            console.debug(item);
            switch (item.type) {
                case DynamicKeyType.DynamicKeyStroke:
                    const dynamic_key_stroke = item as DynamicKeyStroke4x4;
                    dataView.setUint32(3,dynamic_key_stroke.type,true);
                    dataView.setUint16(3+4+0,dynamic_key_stroke.bindings[0],true);
                    dataView.setUint16(3+4+2,dynamic_key_stroke.bindings[1],true);
                    dataView.setUint16(3+4+4,dynamic_key_stroke.bindings[2],true);
                    dataView.setUint16(3+4+6,dynamic_key_stroke.bindings[3],true);
                    dataView.setUint16(3+12+0,dynamic_key_stroke.key_control[0],true);
                    dataView.setUint16(3+12+2,dynamic_key_stroke.key_control[1],true);
                    dataView.setUint16(3+12+4,dynamic_key_stroke.key_control[2],true);
                    dataView.setUint16(3+12+6,dynamic_key_stroke.key_control[3],true);
                    dataView.setFloat32(3+20,dynamic_key_stroke.press_begin_distance,true);
                    dataView.setFloat32(3+24,dynamic_key_stroke.press_fully_distance,true);
                    dataView.setFloat32(3+28,dynamic_key_stroke.release_begin_distance,true);
                    dataView.setFloat32(3+32,dynamic_key_stroke.release_fully_distance,true);
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    const dynamic_key_mt = item as DynamicKeyModTap;
                    dataView.setUint32(3,dynamic_key_mt.type,true);
                    dataView.setUint16(3+4+0,dynamic_key_mt.bindings[0],true);
                    dataView.setUint16(3+4+2,dynamic_key_mt.bindings[1],true);
                    dataView.setUint32(3+8,dynamic_key_mt.duration,true);
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    const dynamic_key_tk = item as DynamicKeyToggleKey;
                    dataView.setUint32(3,dynamic_key_tk.type,true);
                    dataView.setUint16(3+4+0,dynamic_key_tk.bindings[0],true);
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    const dynamic_key_m = item as DynamicKeyMutex;
                    dataView.setUint32(3,dynamic_key_m.type,true);
                    dataView.setUint16(3+4+0,dynamic_key_m.bindings[0],true);
                    dataView.setUint16(3+4+2,dynamic_key_m.bindings[1],true);
                    dataView.setUint16(3+8+0,dynamic_key_m.key_id[0],true);
                    dataView.setUint16(3+8+2,dynamic_key_m.key_id[1],true);
                    dataView.setUint8(3+12,dynamic_key_m.mode);
                default:
                    break;
            }
            let res = this.write(send_buf);
            console.debug("Wrote dynamic key: {:?} byte(s)", res);
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