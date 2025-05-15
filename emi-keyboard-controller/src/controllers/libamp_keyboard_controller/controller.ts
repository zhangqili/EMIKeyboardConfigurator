import { AdvancedKeyToBytes, DynamicKey, DynamicKeyModTap, DynamicKeyMutex, DynamicKeyStroke4x4, DynamicKeyToggleKey, DynamicKeyType, IDynamicKey, KeyboardController } from "./../../interface";

export class LibampKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    private handleInputReport: (event: HIDInputReportEvent) => void;
    config_file_number:number = 4;

    constructor() {
        super();
        this.device = undefined;
        this.handleInputReport = (event: HIDInputReportEvent) => {
            const { data } = event;
            this.prase_buffer(new Uint8Array(data.buffer));
        };

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
        this.device?.removeEventListener("inputreport",this.handleInputReport);
    }
    prase_buffer(buf: Uint8Array): void {
        switch (buf[0]) {
            case 1 : {
                break;
            }
            case 0xFE : {

                let dataLength = buf[1];
                for (var i = 0;i<dataLength;i++) {
                    let dataView = new DataView(buf.buffer);  
                    let key_index = dataView.getUint16(2 + 11 * i, true);
                    if (key_index >= this.advanced_keys.length) {
                        continue;
                    }
                    this.advanced_keys[key_index].state = buf[2 + 2 + 11 * i] > 0;
                    this.advanced_keys[key_index].raw = dataView.getFloat32(2 + 3 + 11*i,true);
                    this.advanced_keys[key_index].value = dataView.getFloat32(2 + 7 + 11*i,true);
                }
                break;
            }
            case 0xFF : {
                this.unload_cargo(buf);
                break
            }
            default: {
                break
            }
        }
    }
    unload_cargo(buf: Uint8Array) {
        let dataView = new DataView(buf.buffer);  
        switch (buf[1])
        {
        case 0: // Advanced Key
            const key_index = dataView.getUint16(2, true);
            this.advanced_keys[key_index].mode = buf[4];
            this.advanced_keys[key_index].activation_value = dataView.getFloat32(8 + 4 * 0, true);
            this.advanced_keys[key_index].deactivation_value = dataView.getFloat32(8 + 4 * 1, true);
            this.advanced_keys[key_index].trigger_distance = dataView.getFloat32(8 + 4 * 2, true);
            this.advanced_keys[key_index].release_distance = dataView.getFloat32(8 + 4 * 3, true);
            this.advanced_keys[key_index].trigger_speed = dataView.getFloat32(8 + 4 * 4, true);
            this.advanced_keys[key_index].release_speed = dataView.getFloat32(8 + 4 * 5, true);
            this.advanced_keys[key_index].upper_deadzone = dataView.getFloat32(8 + 4 * 6, true);
            this.advanced_keys[key_index].lower_deadzone = dataView.getFloat32(8 + 4 * 7, true);
            //g_keyboard_advanced_keys[command_advanced_key_mapping[buf[1]]].upper_bound = fill_in_float(&buf[2 + 4 * 8]);
            //g_keyboard_advanced_keys[command_advanced_key_mapping[buf[1]]].lower_bound = fill_in_float(&buf[2 + 4 * 9]);
            break;
        case 1: // Global LED
            this.rgb_base_config.mode = buf[2];
            this.rgb_base_config.rgb.red = buf[3];
            this.rgb_base_config.rgb.green = buf[4];
            this.rgb_base_config.rgb.blue = buf[5];
            this.rgb_base_config.speed = dataView.getFloat32(6, true);
            this.rgb_base_config.direction = dataView.getUint16(10, true);
            this.rgb_base_config.density = buf[12];
            this.rgb_base_config.brightness = buf[13];
            break;
        case 2: // LED
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = buf[3+10*i];
                if (key_index<this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[3 + 10 * i + 2];
                    this.rgb_configs[key_index].rgb.red = buf[3 + 10 * i + 3];
                    this.rgb_configs[key_index].rgb.green = buf[3 + 10 * i + 4];
                    this.rgb_configs[key_index].rgb.blue = buf[3 + 10 * i + 5];
                    this.rgb_configs[key_index].speed = dataView.getFloat32(3 + 10 * i + 6, true);
                    
                    //rgb_to_hsv(&g_rgb_configs[g_rgb_mapping[buf[1]+i]].hsv, &g_rgb_configs[g_rgb_mapping[buf[1]+i]].rgb);
                }
            }
            break;
        case 3: // Keymap
            const layer_index = buf[2];
            const layer_page_start = dataView.getUint16(3, true);
            const layer_page_length = buf[5];
            if (layer_index < this.keymap.length && layer_page_start + layer_page_length <= this.keymap[layer_index].length) 
            {
                for (let i = 0; i < layer_page_length; i++) {
                    this.keymap[layer_index][layer_page_start + i] = dataView.getUint16(6 + i*2, true);
                }
            }
            break;
        case 4:   
            const dynamic_key_index = buf[2];
            var dynamic_key : IDynamicKey;
            const dynamic_key_type = dataView.getUint32(3,true);
            switch (dynamic_key_type) {
                case DynamicKeyType.DynamicKeyStroke:
                    var dynamic_key_stroke = new DynamicKeyStroke4x4();
                    dynamic_key_stroke.type = dataView.getUint32(3,true);
                    dynamic_key_stroke.bindings[0] = dataView.getUint16(3+4+0,true);
                    dynamic_key_stroke.bindings[1] = dataView.getUint16(3+4+2,true);
                    dynamic_key_stroke.bindings[2] = dataView.getUint16(3+4+4,true);
                    dynamic_key_stroke.bindings[3] = dataView.getUint16(3+4+6,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(3+12+0,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(3+12+2,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(3+12+4,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint16(3+12+6,true);
                    dynamic_key_stroke.press_begin_distance = dataView.getFloat32(3+20,true);
                    dynamic_key_stroke.press_fully_distance = dataView.getFloat32(3+24,true);
                    dynamic_key_stroke.release_begin_distance = dataView.getFloat32(3+28,true);
                    dynamic_key_stroke.release_fully_distance = dataView.getFloat32(3+32,true);
                    dynamic_key = dynamic_key_stroke;
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    var dynamic_key_mt = new DynamicKeyModTap();
                    dynamic_key_mt.type = dataView.getUint32(3,true);
                    dynamic_key_mt.bindings[0] = dataView.getUint16(3+4+0,true);
                    dynamic_key_mt.bindings[1] = dataView.getUint16(3+4+2,true);
                    dynamic_key_mt.duration = dataView.getUint32(3+8,true);
                    dynamic_key = dynamic_key_mt;
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    var dynamic_key_tk = new DynamicKeyToggleKey();
                    dynamic_key_tk.type = dataView.getUint32(3,true);
                    dynamic_key_tk.bindings[0] = dataView.getUint16(3+4+0,true);
                    dynamic_key = dynamic_key_tk;
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    var dynamic_key_m = new DynamicKeyMutex();
                    dynamic_key_m.type  = dataView.getUint32(3,true);
                    dynamic_key_m.bindings[0]  = dataView.getUint16(3+4+0,true);
                    dynamic_key_m.bindings[1]  = dataView.getUint16(3+4+2,true);
                    dynamic_key_m.key_id[0] = dataView.getUint16(3+8+0,true);
                    dynamic_key_m.key_id[1] = dataView.getUint16(3+8+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(3+12);
                    dynamic_key = dynamic_key_m;
                default:
                    dynamic_key = new DynamicKey();
                    break;
            }
            this.dynamic_keys[dynamic_key_index] = dynamic_key;
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
    send_advanced_keys() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x00;
        let dataView = new DataView(send_buf.buffer);
        this.advanced_keys.forEach((item, index) =>{
            dataView.setUint16(2,index,true);
            let key_bytes = AdvancedKeyToBytes(item);
            send_buf.set(key_bytes,4);
            let res = this.write(send_buf);
            console.debug("Wrote Advanced Key: {:?} byte(s)", res);

        });
    }

    send_rgb_configs() {
        let send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x01;
        {
            let dataView = new DataView(send_buf.buffer);
            send_buf[2] = this.rgb_base_config.mode;
            send_buf[3] = this.rgb_base_config.rgb.red;
            send_buf[4] = this.rgb_base_config.rgb.green;
            send_buf[5] = this.rgb_base_config.rgb.blue;
            dataView.setFloat32(6,this.rgb_base_config.speed,true);
            dataView.setUint16(10,this.rgb_base_config.direction % 65536,true);
            send_buf[12] = this.rgb_base_config.density % 256;
            send_buf[13] = this.rgb_base_config.brightness % 256;
            let res = this.write(send_buf);
            console.log("send rgb base config");
            console.log(send_buf);
            console.debug("Wrote RGB Switch: {:?} byte(s)", res);
        }
        send_buf = new Uint8Array(63);
        send_buf[0] = 0xFF;
        send_buf[1] = 0x02;
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (var rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index+=1){
            let page_length = (rgb_page_index + 1) * 6 > this.rgb_configs.length ? this.rgb_configs.length % 6 : 6;
            send_buf[2] = page_length;
            for (var j = 0; j < page_length; j+=1){
                let dataView = new DataView(send_buf.buffer);
                let rgb_index = rgb_page_index * 6 + j;
                if (rgb_index < this.rgb_configs.length ){
                    let item = this.rgb_configs[rgb_index];
                    console.debug(rgb_index);
                    dataView.setUint16(3 + 0 + 10 * j,rgb_index,true);
                    send_buf[3 + 2 + 10 * j] = item.mode;
                    send_buf[3 + 3 + 10 * j] = item.rgb.red;
                    send_buf[3 + 4 + 10 * j] = item.rgb.green;
                    send_buf[3 + 5 + 10 * j] = item.rgb.blue;
                    dataView.setFloat32(3 + 6 + 10 * j,item.speed,true);
                }
                else
                {
                    dataView.setUint16(3 + 0 + 10 * j,0xFF,true);
                    break;
                }
            }
            console.debug(send_buf);
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
                dataView.setUint16(3,index,true);
                send_buf[5] = layer_seg.length;
                layer_seg.forEach((value,k) => {
                    dataView.setUint16(6 + k * 2,value,true);
                });
                console.debug(send_buf);
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
                    dataView.setUint32(4,dynamic_key_stroke.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_stroke.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_stroke.bindings[1],true);
                    dataView.setUint16(4+4+4,dynamic_key_stroke.bindings[2],true);
                    dataView.setUint16(4+4+6,dynamic_key_stroke.bindings[3],true);
                    dataView.setUint16(4+12+0,dynamic_key_stroke.key_control[0],true);
                    dataView.setUint16(4+12+2,dynamic_key_stroke.key_control[1],true);
                    dataView.setUint16(4+12+4,dynamic_key_stroke.key_control[2],true);
                    dataView.setUint16(4+12+6,dynamic_key_stroke.key_control[3],true);
                    dataView.setFloat32(4+20,dynamic_key_stroke.press_begin_distance,true);
                    dataView.setFloat32(4+24,dynamic_key_stroke.press_fully_distance,true);
                    dataView.setFloat32(4+28,dynamic_key_stroke.release_begin_distance,true);
                    dataView.setFloat32(4+32,dynamic_key_stroke.release_fully_distance,true);
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    const dynamic_key_mt = item as DynamicKeyModTap;
                    dataView.setUint32(4,dynamic_key_mt.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_mt.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_mt.bindings[1],true);
                    dataView.setUint32(4+8,dynamic_key_mt.duration,true);
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    const dynamic_key_tk = item as DynamicKeyToggleKey;
                    dataView.setUint32(4,dynamic_key_tk.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_tk.bindings[0],true);
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    const dynamic_key_m = item as DynamicKeyMutex;
                    dataView.setUint32(4,dynamic_key_m.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_m.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_m.bindings[1],true);
                    dataView.setUint16(4+8+0,dynamic_key_m.key_id[0],true);
                    dataView.setUint16(4+8+2,dynamic_key_m.key_id[1],true);
                    dataView.setUint8(4+12,dynamic_key_m.mode);
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