import { IAdvancedKey, IKeyboardController, IRGBConfig, KeyMode, CalibrationMode, RGBMode, KeyCode, KeyModifier, AdvancedKeyToBytes, AdvancedKey, MouseKeycode, LayerControlKeycode } from './../../interface';

const layout = `[[{"a": 7},"Z","X","C","V"]]`;

export class TrinityKeypadController implements IKeyboardController {
    device: HIDDevice | undefined;
    advanced_keys: AdvancedKey[];
    rgb_switch: boolean;
    rgb_configs: IRGBConfig[];
    keymap: number[][];
    ADVANCED_KEY_NUM: number = 4;

    constructor() {
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
                KeyCode.Z,
                KeyCode.X,
                KeyCode.C,
                KeyCode.V,
                KeyCode.F8,
                KeyCode.F12,
                (KeyCode.F2 | ((KeyModifier.KeyLeftShift) << 8)),
                KeyCode.F2,
                KeyCode.LayerControl | ((2) << 8) | (LayerControlKeycode.LayerToggle << 12),
                KeyCode.LayerControl | ((1) << 8) | (LayerControlKeycode.LayerToggle << 12),
                KeyCode.Escape,
                KeyCode.MouseCollection | ((MouseKeycode.MouseWheelUp) << 8),
                KeyCode.MouseCollection | ((MouseKeycode.MouseWheelDown) << 8),
            ],
            [
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyUser | (0 << 8),
                KeyCode.LayerControl | ((1) << 8) | (LayerControlKeycode.LayerToggle << 12),
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
            ],
            [
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.LayerControl | ((2) << 8) | (LayerControlKeycode.LayerToggle << 12),
                KeyCode.KeyUser | (0 << 8),
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
                KeyCode.KeyTransparent,
            ]
        ];

    }

    async detect(): Promise<HIDDevice[]> {
        return await navigator.hid.requestDevice({
            filters: [{ vendorId: 0xFFFF, productId: 0xFFFF, usagePage: 0xFF00 }]  // 使用示例，过滤器可以根据需求进行调整
        });;
    }
    write(buf: Uint8Array): number {
        this.device?.sendReport(1, buf);
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
            case 0xFF : {
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
            default: {
                break
            }
        }
    }
    get_connection_state(): boolean {
        return this.device != undefined;
    }
    get_advanced_keys(): IAdvancedKey[] {
        return this.advanced_keys;
    }
    set_advanced_keys(keys: IAdvancedKey[]): void {
        this.advanced_keys = keys;
    }
    get_rgb_switch(): boolean {
        return this.rgb_switch;
    }
    set_rgb_switch(s: boolean): void {
        this.rgb_switch = s;
    }
    get_rgb_configs(): IRGBConfig[] {
        return this.rgb_configs;
    }
    set_rgb_configs(configs: IRGBConfig[]): void {
        this.rgb_configs = configs;
    }
    get_keymap(): number[][] {
        return this.keymap;
    }
    set_keymap(keymap: number[][]): void {
        this.keymap = keymap;
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
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 7);
        for (var i = 0; i < rgb_page_num; i+=1){
            for (var j = 0; j < 7; j+=1){
                let dataView = new DataView(send_buf.buffer);
                send_buf[2] = (i * 7);
                let index = i * 7 + j;
                if (index < this.rgb_configs.length ){
                    let item = this.rgb_configs[index];
                    send_buf[3 + 0 + 8 * j] = item.mode;
                    send_buf[3 + 1 + 8 * j] = item.rgb.red;
                    send_buf[3 + 2 + 8 * j] = item.rgb.green;
                    send_buf[3 + 3 + 8 * j] = item.rgb.blue;
                    dataView.setFloat32(3 + 4 + 8 * j,item.speed,true);
                }
                else
                {
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
            //console.log("{:?}",i);
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
                // 转换 `u16` 为 `u8` 数组（小端序）
                //console.log(layer_seg);
                //console.log(j*16);
                //console.log(((j+1)*16));
                send_buf[3] = index;//layer_page_index
                layer_seg.forEach((value,k) => {
                    //console.log(4 + k * 2);
                    dataView.setUint16(4 + k * 2,value,true);
                });
                //console.log("{:?}",layer_seg);
                //console.log("{:?}",send_buf);
                let res = this.write(send_buf);
                console.log("Wrote Keymap: {:?} byte(s)", res);
            }
        });
    }
}