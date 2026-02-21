import { AdvancedKeyToBytes, DynamicKey, DynamicKeyModTap, DynamicKeyMutex, DynamicKeyStroke4x4, DynamicKeyToggleKey, DynamicKeyType, IDynamicKey, KeyboardController, getEMIPathIdentifier, KeyboardKeycode, IAdvancedKey, IRGBBaseConfig, IRGBConfig, FirmwareVersion, MacroAction, IMacroAction, IFeature, Feature, ScriptLevel} from "./../../interface";
import semver, { SemVer } from 'semver';

enum PacketCode {
  PacketCodeAction = 0x00,
  PacketCodeSet = 0x01,
  PacketCodeGet = 0x02,
  PacketCodeLog = 0x03,
  PacketCodeLargeSet = 0x04,
  PacketCodeLargeGet = 0x05,
  PacketCodeUser = 0xFF,
};

enum PacketData {
  PacketDataVersion = 0x00,
  PacketDataAdvancedKey = 0x01,
  PacketDataKeymap = 0x02,
  PacketDataRgbBaseConfig = 0x03,
  PacketDataRgbConfig = 0x04,
  PacketDataDynamicKey = 0x05,
  PacketDataProfileIndex = 0x06,
  PacketDataConfig = 0x07,
  PacketDataDebug = 0x08,
  PacketDataReport = 0x09,
  PacketDataMacro = 0x0A,
  PacketDataFeature = 0x0B,
  PacketDataScriptSource = 0x0C,
  PacketDataScriptBytecode = 0x0D,
};
enum LargeDataCmd {
    Start = 0x00,
    Payload = 0x01,
    End = 0x02,
    Abort = 0x03,
}
interface PendingRequest {
    resolve: (data: Uint8Array) => void;
    reject: (reason: any) => void;
    expectedCode: PacketCode | number;
    timer: number;
}

export class RequestQueue {
    private queue: { 
        task: () => Promise<any>; 
        resolve: (value: any) => void; 
        reject: (reason: any) => void 
    }[] = [];
    private isProcessing: boolean = false;

    /**
     * 添加一个任务到队列中
     * @param task 一个返回 Promise 的函数（例如：() => this.sendAndWait(...)）
     * @returns 返回该任务执行后的结果
     */
    public add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // 将任务推入队列
            this.queue.push({ task, resolve, reject });
            // 尝试处理队列
            this.process();
        });
    }

    private async process() {
        // 如果正在处理中，直接返回，避免并发
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            // 取出第一个任务
            const item = this.queue.shift();
            if (item) {
                try {
                    // 执行任务并等待结果
                    const result = await item.task();
                    item.resolve(result);
                } catch (error) {
                    // 捕获错误并通知调用者
                    item.reject(error);
                }
            }
        }

        this.isProcessing = false;
    }
}

export class LibampKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    private handleInputReport: (event: HIDInputReportEvent) => void;
    profile_number:number = 4;
    profile_index:number = 0;
    private pendingRequest: PendingRequest | null = null;
    private txBuffer = new Uint8Array(64); // 复用发送缓冲区，避免GC
    private requestQueue = new RequestQueue();
    firmware_version : FirmwareVersion = { major: 0, minor: 0, patch: 0, info: "" };
    macros : MacroAction[][] = [new Array<MacroAction>];
    feature : Feature = {
        script_level: ScriptLevel.Disable,
        advanced_key_flag: true,
        rgb_flag: false,
    };
    script_source : string = "";
    script_bytecode : Uint8Array = new Uint8Array();

    constructor() {
        super();
        this.device = undefined;this.handleInputReport = (event: HIDInputReportEvent) => {
            const data = new Uint8Array(event.data.buffer);
            const packetCode = data[0];
            const packetType = data[1];

            // 1. 检查是否有正在等待的请求，并且收到的包类型匹配
            // 注意：这里我们假设回包是 PacketCodeSet 或 PacketCodeGet，且 packetType 匹配
            if (this.pendingRequest && 
                packetCode === this.pendingRequest.expectedCode) {
                
                window.clearTimeout(this.pendingRequest.timer);
                this.pendingRequest.resolve(data);
                this.pendingRequest = null;
                return;
            }

            // 2. 如果不是我们在等待的包（或者是主动上报的 Debug/User 包），则走原有流程
            this.dispatchEvent(new Event('updateData'));
            this.packet_process(data);
        };

    }
    private async sendAndWait(buf: Uint8Array, timeout: number = 200): Promise<Uint8Array> {
        const expectedCode = buf[0];

        return new Promise((resolve, reject) => {
            // 3. 设置超时
            const timer = window.setTimeout(() => {
                // 双重检查，确保超时的是当前这个请求
                if (this.pendingRequest && 
                    this.pendingRequest.expectedCode === expectedCode) {
                    
                    this.pendingRequest = null;
                    reject(new Error(`Timeout waiting for packet: Code ${expectedCode}`));
                }
            }, timeout);

            // 4. 注册等待请求
            this.pendingRequest = {
                resolve,
                reject,
                expectedCode, // 自动填入
                timer
            };

            try {
                // 5. 发送数据
                this.write(buf);
            } catch (error) {
                window.clearTimeout(timer);
                this.pendingRequest = null;
                reject(error);
            }
        });
    }

    private async enqueueCommand(buf: Uint8Array, timeout: number = 200): Promise<Uint8Array> {
        // 【关键点】必须复制一份数据！
        // 因为 buf 可能是 this.txBuffer，在排队等待期间可能会被修改。
        const packetCopy = new Uint8Array(buf); 

        return this.requestQueue.add(async () => {
            // 这里面的代码会在轮到该任务时执行
            return await this.sendAndWait(packetCopy, timeout);
        });
    }

    private handleDeviceDisconnect = (event: HIDConnectionEvent) => {
        if (this.device && event.device === this.device) {
            console.warn("[Controller] Device physically disconnected.");
            this.disconnect();
            this.dispatchEvent(new Event('deviceDisconnected'));
        }
    };

    write(buf: Uint8Array): number {
        this.device?.sendReport(0, buf as BufferSource);
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
        } else {
            result = true;
        }
        if (result) {
            this.request_config();
            this.device.addEventListener("inputreport", this.handleInputReport);
            navigator.hid.addEventListener('disconnect', this.handleDeviceDisconnect);
        }
        return result;
    }
    disconnect(): void {
        if (this.device) {
            // 移除所有的事件监听
            this.device.removeEventListener("inputreport", this.handleInputReport);
            navigator.hid.removeEventListener('disconnect', this.handleDeviceDisconnect);
            
            // 关闭设备
            if (this.device.opened) {
                this.device.close();
            }
            this.device = undefined;
        }

        // 【新增】如果有正在等待底层返回的请求，立刻拒绝掉，防止队列卡死
        if (this.pendingRequest) {
            window.clearTimeout(this.pendingRequest.timer);
            this.pendingRequest.reject(new Error("Device disconnected abruptly"));
            this.pendingRequest = null;
        }
    }

    private async _set_large_data(dataType: number, data: Uint8Array): Promise<void> {
        const totalSize = data.length;
        // 头部大小: Code(1)+Type(1)+Sub(1)+Header(8) = 11 (Start包)
        // 载荷包头部: Code(1)+Type(1)+Sub(1)+Offset(4)+Len(2) = 9
        const headerSize = 9;
        const maxPayloadSize = 63 - headerSize;

        // 1. 发送 START 包
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeSet;
        this.txBuffer[1] = dataType;
        this.txBuffer[2] = LargeDataCmd.Start;
        
        const view = new DataView(this.txBuffer.buffer);
        view.setUint32(3, totalSize, true); // Total Size (Little Endian)
        // view.setUint32(7, checksum, true); // 如果需要校验和

        console.log(`[LargeData] Upload Start. Type: ${dataType}, Size: ${totalSize}`);
        
        // 这里的 timeout 稍微设长一点，因为下位机可能要擦除 Flash
        await this.enqueueCommand(this.txBuffer, 2000); 

        // 2. 循环发送 PAYLOAD
        let offset = 0;
        while (offset < totalSize) {
            const chunkSize = Math.min(maxPayloadSize, totalSize - offset);
            const chunk = data.subarray(offset, offset + chunkSize);

            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeLargeSet;
            this.txBuffer[1] = dataType;
            this.txBuffer[2] = LargeDataCmd.Payload;

            const payloadView = new DataView(this.txBuffer.buffer);
            payloadView.setUint32(3, offset, true); // Offset
            payloadView.setUint16(7, chunkSize, true); // Length
            this.txBuffer.set(chunk, 9); // Data starts at index 9

            // 发送数据包
            await this.enqueueCommand(this.txBuffer, 500); // 500ms 超时足够了
            
            offset += chunkSize;
        }

        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeSet;
        this.txBuffer[1] = dataType;
        this.txBuffer[2] = LargeDataCmd.End;
        await this.enqueueCommand(this.txBuffer);
       
        console.log(`[LargeData] Upload Complete.`);
    }

    // ==========================================
    // 通用长数据接收逻辑 (Device -> Host)
    // ==========================================
    private async _get_large_data(dataType: number): Promise<Uint8Array | null> {
        // 1. 发送 START 包查询大小
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeGet;
        this.txBuffer[1] = dataType;
        this.txBuffer[2] = LargeDataCmd.Start;
        
        // 发送查询并等待回复
        // 注意：enqueueCommand 需要返回下位机的回复包
        const startResp = await this.enqueueCommand(this.txBuffer, 1000);
        
        // 解析回复头部
        // PacketLargeDataHeader: Code(0), Type(1), Sub(2), TotalSize(3-6), Checksum(7-10)
        const view = new DataView(startResp.buffer);
        const totalSize = view.getUint32(3, true);
        const checksum = view.getUint32(7, true);

        console.log(`[LargeData] Download Start. Type: ${dataType}, Size: ${totalSize}`);

        if (totalSize === 0) {
            return new Uint8Array(0);
        }

        const resultBuffer = new Uint8Array(totalSize);
        let receivedSize = 0;
        const maxPayloadSize = 63 - 9; // 55 bytes

        // 2. 循环拉取 PAYLOAD
        while (receivedSize < totalSize) {
            const chunkSize = Math.min(maxPayloadSize, totalSize - receivedSize);

            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeLargeGet;
            this.txBuffer[1] = dataType;
            this.txBuffer[2] = LargeDataCmd.Payload;
            
            const reqView = new DataView(this.txBuffer.buffer);
            reqView.setUint32(3, receivedSize, true); // Offset
            reqView.setUint16(7, chunkSize, true);    // Length to read

            // 发送请求并等待数据
            const payloadResp = await this.enqueueCommand(this.txBuffer, 500);

            // 解析回复载荷
            // PacketLargeDataPayload: Code(0), Type(1), Sub(2), Offset(3-6), Length(7-8), Data(9...)
            const respView = new DataView(payloadResp.buffer);
            const actualLen = respView.getUint16(7, true);
            const actualOffset = respView.getUint32(3, true);

            // 安全检查
            if (actualOffset !== receivedSize) {
                console.error(`[LargeData] Offset mismatch! Expected ${receivedSize}, got ${actualOffset}`);
                throw new Error("Large Data Transfer Offset Mismatch");
            }
            
            if (actualLen === 0) {
                 console.warn("[LargeData] Received 0 bytes, aborting.");
                 break;
            }

            // 拷贝数据
            const dataChunk = payloadResp.subarray(9, 9 + actualLen);
            resultBuffer.set(dataChunk, receivedSize);

            receivedSize += actualLen;
        }

        // 3. 校验 (可选)
        // const calcChecksum = crc32(resultBuffer);
        // if (calcChecksum !== checksum) { ... }
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeLargeGet;
        this.txBuffer[1] = dataType;
        this.txBuffer[2] = LargeDataCmd.End;
        await this.enqueueCommand(this.txBuffer, 200);

        console.log(`[LargeData] Download Complete.`);
        return resultBuffer;
    }

    
    packet_process(buf: Uint8Array)
    {
        switch (buf[0])
        {
        case PacketCode.PacketCodeGet:
        case PacketCode.PacketCodeSet:
            switch (buf[1])
            {
            case PacketData.PacketDataAdvancedKey:
                this.packet_process_advanced_key(buf);
                break;
            case PacketData.PacketDataKeymap:
                this.packet_process_keymap(buf);
                break;
            case PacketData.PacketDataRgbBaseConfig:
                this.packet_process_rgb_base_config(buf);
                break;
            case PacketData.PacketDataRgbConfig:
                this.packet_process_rgb_config(buf);
                break;
            case PacketData.PacketDataDynamicKey:
                this.packet_process_dynamic_key(buf);
                break;
            case PacketData.PacketDataProfileIndex:
                this.packet_process_config_index(buf);
                break;
            case PacketData.PacketDataConfig:
                this.packet_process_config(buf);
                break;
            case PacketData.PacketDataDebug:
                this.packet_process_debug(buf);
                break;
            case PacketData.PacketDataMacro:
                this.packet_process_macro(buf);
                break;
            case PacketData.PacketDataVersion:
                this.packet_process_version(buf);
                break;
            case PacketData.PacketDataFeature:
                this.packet_process_feature(buf);
                break;
            default:
                break;
            }
            break;
        default:
            break;
        }
    }

    packet_process_advanced_key(buf : Uint8Array)
    {   
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
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
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
          const key_index = dataView.getUint16(2, true);
          dataView.setUint16(2,key_index,true);
          let key_bytes = AdvancedKeyToBytes(this.advanced_keys[key_index]);
          buf.set(key_bytes,4);
      }
    }

    packet_process_rgb_base_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
          const key_index = dataView.getUint16(2, true);
            this.rgb_base_config.mode = buf[2];
            this.rgb_base_config.rgb.red = buf[3];
            this.rgb_base_config.rgb.green = buf[4];
            this.rgb_base_config.rgb.blue = buf[5];
            this.rgb_base_config.secondary_rgb.red = buf[6];
            this.rgb_base_config.secondary_rgb.green = buf[7];
            this.rgb_base_config.secondary_rgb.blue = buf[8];
            this.rgb_base_config.speed = dataView.getFloat32(9, true);
            this.rgb_base_config.direction = dataView.getUint16(13, true);
            this.rgb_base_config.density = buf[15];
            this.rgb_base_config.brightness = buf[16];
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            buf[2] = this.rgb_base_config.mode;
            buf[3] = this.rgb_base_config.rgb.red;
            buf[4] = this.rgb_base_config.rgb.green;
            buf[5] = this.rgb_base_config.rgb.blue;
            buf[6] = this.rgb_base_config.secondary_rgb.red;
            buf[7] = this.rgb_base_config.secondary_rgb.green;
            buf[8] = this.rgb_base_config.secondary_rgb.blue;
            dataView.setFloat32(9,this.rgb_base_config.speed,true);
            dataView.setUint16(13,this.rgb_base_config.direction % 65536,true);
            buf[15] = this.rgb_base_config.density % 256;
            buf[16] = this.rgb_base_config.brightness % 256;
      }
    }

    packet_process_rgb_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 10 * i, true);
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
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 10 * i,true);
                if (key_index<this.rgb_configs.length)
                {
                  buf[3 + 2 + 10 * i] = this.rgb_configs[key_index].mode;
                  buf[3 + 3 + 10 * i] = this.rgb_configs[key_index].rgb.red;
                  buf[3 + 4 + 10 * i] = this.rgb_configs[key_index].rgb.green;
                  buf[3 + 5 + 10 * i] = this.rgb_configs[key_index].rgb.blue;
                  dataView.setFloat32(3 + 6 + 10 * i,this.rgb_configs[key_index].speed,true);
                }
            }
      }
    }

    packet_process_keymap(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const layer_index = buf[2];
            const layer_page_start = dataView.getUint16(3, true);
            const layer_page_length = buf[5];
            if (layer_index < this.keymap.length && layer_page_start + layer_page_length <= this.keymap[layer_index].length) 
            {
                for (let i = 0; i < layer_page_length; i++) {
                    this.keymap[layer_index][layer_page_start + i] = dataView.getUint16(6 + i*2, true);
                }
            }
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            const layer_index = buf[2];
            const layer = this.keymap[layer_index];
            const layer_page_start = dataView.getUint16(3, true);
            const layer_page_length = buf[5];
            var layer_seg;
            if (layer_page_start + layer_page_length > layer.length) {
                layer_seg = layer.slice(layer_page_start,layer.length); 
            }
            else
            {
                layer_seg = layer.slice(layer_page_start,layer_page_start+layer_page_length); 
            }
            dataView.setUint16(3,layer_page_start,true);
            buf[5] = layer_seg.length;
            layer_seg.forEach((value,k) => {
                dataView.setUint16(6 + k * 2,value,true);
            });
      }
    }

    packet_process_dynamic_key(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dynamic_key_index = buf[2];
            var dynamic_key : IDynamicKey;
            const dynamic_key_type = dataView.getUint32(4,true);
            switch (dynamic_key_type) {
                case DynamicKeyType.DynamicKeyStroke:
                    var dynamic_key_stroke = new DynamicKeyStroke4x4();
                    dynamic_key_stroke.type = dataView.getUint32(4,true);
                    dynamic_key_stroke.bindings[0] = dataView.getUint16(4+4+0,true);
                    dynamic_key_stroke.bindings[1] = dataView.getUint16(4+4+2,true);
                    dynamic_key_stroke.bindings[2] = dataView.getUint16(4+4+4,true);
                    dynamic_key_stroke.bindings[3] = dataView.getUint16(4+4+6,true);
                    dynamic_key_stroke.key_control[0] = dataView.getUint8(4+12+0);
                    dynamic_key_stroke.key_control[1] = dataView.getUint8(4+12+1);
                    dynamic_key_stroke.key_control[2] = dataView.getUint8(4+12+2);
                    dynamic_key_stroke.key_control[3] = dataView.getUint8(4+12+3);
                    dynamic_key_stroke.press_begin_distance = dataView.getFloat32(4+16,true);
                    dynamic_key_stroke.press_fully_distance = dataView.getFloat32(4+20,true);
                    dynamic_key_stroke.release_begin_distance = dataView.getFloat32(4+24,true);
                    dynamic_key_stroke.release_fully_distance = dataView.getFloat32(4+28,true);
                    dynamic_key = dynamic_key_stroke;
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    var dynamic_key_mt = new DynamicKeyModTap();
                    dynamic_key_mt.type = dataView.getUint32(4,true);
                    dynamic_key_mt.bindings[0] = dataView.getUint16(4+4+0,true);
                    dynamic_key_mt.bindings[1] = dataView.getUint16(4+4+2,true);
                    dynamic_key_mt.duration = dataView.getUint32(4+8,true);
                    dynamic_key = dynamic_key_mt;
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    var dynamic_key_tk = new DynamicKeyToggleKey();
                    dynamic_key_tk.type = dataView.getUint32(4,true);
                    dynamic_key_tk.bindings[0] = dataView.getUint16(4+4+0,true);
                    dynamic_key = dynamic_key_tk;
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    var dynamic_key_m = new DynamicKeyMutex();
                    dynamic_key_m.type  = dataView.getUint32(4,true);
                    dynamic_key_m.bindings[0]  = dataView.getUint16(4+4+0,true);
                    dynamic_key_m.bindings[1]  = dataView.getUint16(4+4+2,true);
                    //dynamic_key_m.key_id[0] = dataView.getUint16(4+8+0,true);
                    //dynamic_key_m.key_id[1] = dataView.getUint16(4+8+2,true);
                    dynamic_key_m.mode  = dataView.getUint8(4+12);
                    dynamic_key = dynamic_key_m;
                    break;
                default:
                    dynamic_key = new DynamicKey();
                    break;
            }
            this.dynamic_keys[dynamic_key_index] = dynamic_key;
      }
      else (buf[0] == PacketCode.PacketCodeSet)
      {
            const index = buf[2];
            const item = this.dynamic_keys[index];
            console.debug(item);
            switch (item.type) {
                case DynamicKeyType.DynamicKeyStroke:
                    const dynamic_key_stroke = item as DynamicKeyStroke4x4;
                    dataView.setUint32(4,dynamic_key_stroke.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_stroke.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_stroke.bindings[1],true);
                    dataView.setUint16(4+4+4,dynamic_key_stroke.bindings[2],true);
                    dataView.setUint16(4+4+6,dynamic_key_stroke.bindings[3],true);
                    dataView.setUint8(4+12+0,dynamic_key_stroke.key_control[0]);
                    dataView.setUint8(4+12+1,dynamic_key_stroke.key_control[1]);
                    dataView.setUint8(4+12+2,dynamic_key_stroke.key_control[2]);
                    dataView.setUint8(4+12+3,dynamic_key_stroke.key_control[3]);
                    dataView.setFloat32(4+16,dynamic_key_stroke.press_begin_distance,true);
                    dataView.setFloat32(4+20,dynamic_key_stroke.press_fully_distance,true);
                    dataView.setFloat32(4+24,dynamic_key_stroke.release_begin_distance,true);
                    dataView.setFloat32(4+28,dynamic_key_stroke.release_fully_distance,true);
                    dataView.setUint16(4+32,dynamic_key_stroke.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyModTap:
                    const dynamic_key_mt = item as DynamicKeyModTap;
                    dataView.setUint32(4,dynamic_key_mt.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_mt.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_mt.bindings[1],true);
                    dataView.setUint32(4+8,dynamic_key_mt.duration,true);
                    dataView.setUint16(4+12,dynamic_key_mt.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyToggleKey:
                    const dynamic_key_tk = item as DynamicKeyToggleKey;
                    dataView.setUint32(4,dynamic_key_tk.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_tk.bindings[0],true);
                    dataView.setUint16(4+6+0,dynamic_key_tk.target_keys_location[0].id,true);
                    break;
                case DynamicKeyType.DynamicKeyMutex:
                    const dynamic_key_m = item as DynamicKeyMutex;
                    dataView.setUint32(4,dynamic_key_m.type,true);
                    dataView.setUint16(4+4+0,dynamic_key_m.bindings[0],true);
                    dataView.setUint16(4+4+2,dynamic_key_m.bindings[1],true);
                    dataView.setUint16(4+8+0,dynamic_key_m.target_keys_location[0].id,true);
                    dataView.setUint16(4+8+2,dynamic_key_m.target_keys_location[1].id,true);
                    dataView.setUint8(4+12,dynamic_key_m.mode);
                default:
                    break;
            }
      }
    }

    packet_process_config_index(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
        this.profile_index = buf[2];
      }
    }

    packet_process_config(buf : Uint8Array)
    {
    }

    packet_process_debug(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
        const dataLength = buf[2];
        for (var i = 0; i < dataLength; i++)
        {
            const key_index = dataView.getUint16(3 + 0 + 12 * i, true);
            if (key_index<this.advanced_keys.length)
            {
                this.advanced_keys[key_index].state  = buf[3 + 12 * i + 2] > 0;
                this.advanced_keys[key_index].report_state = buf[3 + 12 * i + 3] > 0;
                this.advanced_keys[key_index].raw = dataView.getFloat32(3 + 12 * i + 4, true);
                this.advanced_keys[key_index].value = dataView.getFloat32(3 + 12 * i + 8, true);
            }
            if (key_index == 0) {
                //console.log(key_index, this.advanced_keys[key_index].raw);
            }
        }
      }
    }
    packet_process_version(buf: Uint8Array) {
        let dataView = new DataView(buf.buffer);
        if (buf[0] == PacketCode.PacketCodeGet) {
            // Offset 2: info_length (uint16) - 暂时没用到，直接读后面的
            this.firmware_version.major = dataView.getUint32(4, true);
            this.firmware_version.minor = dataView.getUint32(8, true);
            this.firmware_version.patch = dataView.getUint32(12, true);
            
            const infoLen = dataView.getUint16(2, true);
            // 提取字符串，注意偏移量是 16
            const infoBytes = buf.slice(16, 16 + infoLen);
            const decoder = new TextDecoder('utf-8');
            this.firmware_version.info = decoder.decode(infoBytes).replace(/\0/g, ''); // 去除可能的空字符
            
            console.log("Firmware Version:", this.firmware_version);
        }
    }
    packet_process_feature(buf: Uint8Array) {
        let dataView = new DataView(buf.buffer);
        if (buf[0] == PacketCode.PacketCodeGet) {
            // Offset 2: info_length (uint16) - 暂时没用到，直接读后面的
            let features = dataView.getUint32(2, true);
            let rgb_features = dataView.getUint32(6, true);
            let layer_count = dataView.getUint8(10);
            let profile_count = dataView.getUint8(10);
            
        }
    }
    packet_process_macro(buf: Uint8Array) {
        const dataView = new DataView(buf.buffer);
        const code = buf[0];
        const macro_index = buf[2];
        const count = dataView.getUint16(3, true);

        // 确保本地数据结构存在 (仅在 GET 时或 SET 检查时需要)
        if (!this.macros[macro_index]) {
            this.macros[macro_index] = [];
        }

        let offset = 5; // Header 长度 (Code+Type+Index+Length)
        const ACTION_SIZE = 12; // 结构体大小

        for (let i = 0; i < count; i++) {
            // Action 的 Index 字段偏移量是 offset + 4
            // 无论是 GET 还是 SET，我们都需要知道这个 Action 的索引
            
            if (code === PacketCode.PacketCodeGet) {
                // === 接收逻辑 (反序列化) ===
                const delay = dataView.getUint32(offset, true);
                const idx = dataView.getUint16(offset + 4, true);
                const key_id = dataView.getUint16(offset + 6, true);
                const is_virtual = dataView.getUint8(offset + 8) > 0;
                const event = dataView.getUint8(offset + 9);
                const keycode = dataView.getUint16(offset + 10, true);

                this.macros[macro_index][idx] = {
                    delay,
                    key_id,
                    is_virtual,
                    event,
                    keycode
                }
            } 
            else if (code === PacketCode.PacketCodeSet) {
                // === 发送逻辑 (序列化) ===
                // 对于 SET 包，调用者 (send_macros) 必须已经预先在 Buffer 中填好了
                // 它想要发送的 Action Index (位于 offset+4)。
                // 我们根据这个 Index 去 this.macros 里拿数据填入 Buffer 的其他字段。
                
                const idx = dataView.getUint16(offset + 4, true);
                const action = this.macros[macro_index][idx];

                if (action) {
                    dataView.setUint32(offset, action.delay, true);
                    // offset+4 (idx) 已经被调用者填好了，不需要重写，或者重写一遍也无妨
                    dataView.setUint16(offset + 6, action.key_id, true);
                    dataView.setUint8(offset + 8, action.is_virtual ? 1 : 0);
                    dataView.setUint8(offset + 9, action.event);
                    dataView.setUint16(offset + 10, action.keycode, true);
                } else {
                    // 如果本地没有这个 Action (越界或空)，填充 0 或默认值
                    // 通常建议填充 MacroEnd (0)
                    dataView.setUint32(offset, 0, true);
                    dataView.setUint16(offset + 6, 0, true);
                    dataView.setUint8(offset + 8, 0);
                    dataView.setUint8(offset + 9, 0);
                    dataView.setUint16(offset + 10, 0, true);
                }
            }

            offset += ACTION_SIZE;
        }
        
        if (code === PacketCode.PacketCodeGet) {
            console.log(`Processed Macro ${macro_index} (GET), count: ${count}`);
        }
    }
    get_connection_state(): boolean {
        return this.device != undefined;
    }

    fetch_config(): void {
        throw new Error('Method not implemented.');
    }

    async save_config() {
        console.log("Starting save config...");
        await this.write_advanced_keys();
        await this.write_rgb_configs();
        await this.write_keymap();
        await this.write_dynamic_keys();
        await this.write_macros();
        if (this.feature.script_level != ScriptLevel.Disable) {
            await this.write_script_source(this.script_source);
            if (this.feature.script_level == ScriptLevel.AOT) {
                await this.write_script_bytecode(this.script_bytecode);
            }
        }
    }
    flash_config(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardSave;
        let res = this.write(send_buf);
        console.debug("Wrote Save Command: {:?} byte(s)", res);
    }
    system_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardReboot;
        let res = this.write(send_buf);
        console.debug("Wrote System Reset Command: {:?} byte(s)", res);
    }
    factory_reset(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardFactoryReset;
        let res = this.write(send_buf);
        console.debug("Wrote Factory Reset Command: {:?} byte(s)", res);
    }
    enter_bootloader(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = KeyboardKeycode.KeyboardBootloader;
        let res = this.write(send_buf);
        console.debug("Wrote Factory Reset Command: {:?} byte(s)", res);
    }
    async request_config(): Promise<void> {
      try {
          await this.request_version();
          if (this.feature.advanced_key_flag) {
            await this.read_advanced_keys();
          }
          if (this.feature.rgb_flag) {
            await this.read_rgb_configs();
          }
          await this.read_keymap();
          if (this.dynamic_keys.length > 0) {
            await this.read_dynamic_keys();
          }
          if (this.macros.length > 0) {
            await this.read_macros();
          }
          if (this.profile_number > 1) {
            await this.read_config_index();
          }
          if (this.feature.script_level != ScriptLevel.Disable) {
            await this.read_script_source();
            await this.read_script_bytecode();
          }
          console.log("Config loaded successfully");
          this.dispatchEvent(new Event('updateData'));
      } catch (e) {
          console.error("Error loading config:", e);
      }
    }
    async request_debug(): Promise<void> {
        const KEYS_PER_PACKET = 5; // 固件限制每包 5 个
        // 假设你有 80 个键，这里 advanced_keys.length = 80
        const total_keys = this.advanced_keys.length;
        const page_num = Math.ceil(total_keys / KEYS_PER_PACKET);
        
        // 创建一个任务数组
        const tasks: Promise<Uint8Array>[] = [];

        for (let i = 0; i < page_num; i++) {
            let send_buf = new Uint8Array(64);
            send_buf[0] = PacketCode.PacketCodeGet;
            send_buf[1] = PacketData.PacketDataDebug;

            let page_length = (i + 1) * KEYS_PER_PACKET > total_keys ? total_keys % KEYS_PER_PACKET : KEYS_PER_PACKET;
            send_buf[2] = page_length; // 告诉固件我要读几个

            let dataView = new DataView(send_buf.buffer);
            // 填充我要读的那些按键的 Index
            for (let j = 0; j < page_length; j++) {
                let key_index = i * KEYS_PER_PACKET + j;
                // 注意偏移量：PacketDebug 结构体 header 占 3 字节 (Code, Type, Len)
                // 每个 Item 占 12 字节。请求时我们只需要填 Index (2 bytes)
                // 固件 packet.c 逻辑是读取 packet->data[i].index
                // PacketDebug data offset = 3
                // item size = 12
                // index offset inside item = 0
                // 所以 offset = 3 + j * 12
                dataView.setUint16(3 + j * 12, key_index, true);
            }

            // 关键：将发送任务加入数组，使用 enqueueCommand (记得你上一轮引入的队列方法)
            // 如果你还没定义 enqueueCommand，请使用你现有的带队列的发送方法
            tasks.push(this.enqueueCommand(send_buf));
        }

        // 等待所有包发送并接收完成
        // 这样可以保证这一行代码执行完时，this.advanced_keys 里的数据已经是最新的一整帧了
        const results = await Promise.all(tasks);
        
        // 处理回包数据 (虽然 enqueueCommand 内部可能处理了，但为了保险可以在这里统一再处理一次，或者依赖内部的 packet_process)
        results.forEach(res => this.packet_process_debug(res));
    }
    
    start_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = 0xFE | (((1<<6) | (0x20 + 0)) << 8);
        this.write(send_buf);
    }
    stop_debug(): void {
        let send_buf = new Uint8Array(63);
        send_buf[0] = PacketCode.PacketCodeAction;
        send_buf[1] = 0xFE | (((0<<6) | (0x20 + 0)) << 8);
        this.write(send_buf);
    }
    
    async write_advanced_keys() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataAdvancedKey;
        let dataView = new DataView(this.txBuffer.buffer);
        
        for(let index = 0; index < this.advanced_keys.length; index++) {
            const item = this.advanced_keys[index];
            dataView.setUint16(2, index, true);
            this.packet_process(this.txBuffer);
            try {
                await this.enqueueCommand(this.txBuffer);
            } catch (e) {
                console.error(`Failed to set Advanced Key ${index}`, e);
            }
        }
    }

    async read_advanced_keys() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataAdvancedKey;
        const dataView = new DataView(this.txBuffer.buffer);
        for (let index = 0; index < this.advanced_keys.length; index++) {
            dataView.setUint16(2, index, true);
            try {
                const res = await this.enqueueCommand(this.txBuffer);
                this.packet_process_advanced_key(res);
                console.debug(`Read Advanced Key: ${index}`);
            } catch (e) {
                console.error(`Failed to read Advanced Key ${index}`, e);
            }
        }
    }

    async write_rgb_configs() {
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataRgbBaseConfig;
        
        this.packet_process(this.txBuffer); 
        
        try {
            await this.enqueueCommand(this.txBuffer);
        } catch (e) {
            console.error("Failed to send RGB Base Config", e);
        }
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (let i = 0; i < rgb_page_num; i++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeSet;
            this.txBuffer[1] = PacketData.PacketDataRgbConfig;

            let page_length = (i + 1) * 6 > this.rgb_configs.length ? this.rgb_configs.length % 6 : 6;
            this.txBuffer[2] = page_length;
            
            let dataView = new DataView(this.txBuffer.buffer);

            // 【关键点】先填充“索引”，也就是告诉 packet_process 我们要发哪些键
            for (let j = 0; j < page_length; j++) {
                let rgb_index = i * 6 + j;
                // RGB Config 的 Index 偏移量是 3 + 10*j
                dataView.setUint16(3 + 10 * j, rgb_index, true); 
            }
            this.packet_process(this.txBuffer);

            try {
                await this.enqueueCommand(this.txBuffer);
            } catch (e) {
                console.error(`Failed to send RGB Page ${i}`, e);
            }
        }
    }

    async read_rgb_configs() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataRgbBaseConfig;
        
        try {
            const baseRes = await this.enqueueCommand(this.txBuffer);
            this.packet_process(baseRes);
        } catch (e) {
            console.error("Failed to read RGB Base Config", e);
        }

        const rgb_page_num = Math.ceil(this.rgb_configs.length / 6);
        for (let rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeGet;
            this.txBuffer[1] = PacketData.PacketDataRgbConfig;
            
            let page_length = (rgb_page_index + 1) * 6 > this.rgb_configs.length ? this.rgb_configs.length % 6 : 6;
            this.txBuffer[2] = page_length;
            
            const dataView = new DataView(this.txBuffer.buffer);
            for (let j = 0; j < page_length; j++) {
                let rgb_index = rgb_page_index * 6 + j;
                if (rgb_index < this.rgb_configs.length) {
                    dataView.setUint16(3 + 0 + 10 * j, rgb_index, true);
                }
            }

            try {
                const res = await this.enqueueCommand(this.txBuffer);
                this.packet_process(res);
                console.debug(`Read RGB Page: ${rgb_page_index}`);
            } catch (e) {
                console.error(`Failed to read RGB Page ${rgb_page_index}`, e);
            }
        }
    }
    async write_keymap() {const layer_page_length = 16;
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataKeymap;
        let dataView = new DataView(this.txBuffer.buffer);

        for (let i = 0; i < this.keymap.length; i++) {
            const layer = this.keymap[i];
            for (let index = 0; index < layer.length; index += layer_page_length) {
                let layer_seg_len = (index + layer_page_length > layer.length) ? (layer.length - index) : layer_page_length;
                
                this.txBuffer[2] = i; // layer
                dataView.setUint16(3, index, true); // start address
                this.txBuffer[5] = layer_seg_len; // length

                this.packet_process(this.txBuffer);

                try {
                    await this.enqueueCommand(this.txBuffer);
                } catch (e) {
                    console.error("Failed to send Keymap", e);
                }
            }
        }
        console.debug("Sent Keymap");
    }

    async read_keymap() {
        const layer_page_length = 16;
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataKeymap;
        const dataView = new DataView(this.txBuffer.buffer);

        for (let i = 0; i < this.keymap.length; i++) {
            const layer = this.keymap[i];
            for (let index = 0; index < layer.length; index += layer_page_length) {
                let layer_seg_len = (index + layer_page_length > layer.length) ? (layer.length - index) : layer_page_length;
                
                this.txBuffer[2] = i; // layer index
                dataView.setUint16(3, index, true); // start index
                this.txBuffer[5] = layer_seg_len; // length

                try {
                    const res = await this.enqueueCommand(this.txBuffer);
                    this.packet_process_keymap(res);
                } catch (e) {
                    console.error(`Failed to read Keymap Layer ${i} Offset ${index}`, e);
                }
            }
        }
    }

    async write_dynamic_keys() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataDynamicKey;
        
        for (let i = 0; i < this.dynamic_keys.length; i++) {
            this.txBuffer.fill(0, 2); 
            this.txBuffer[2] = i; 
            this.packet_process(this.txBuffer);

            try {
                await this.enqueueCommand(this.txBuffer);
            } catch (e) {
                console.error(`Failed to send Dynamic Key ${i}`, e);
            }
        }
        console.debug("Sent Dynamic Keys");
    }

    async read_dynamic_keys() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataDynamicKey;
        
        for (let i = 0; i < this.dynamic_keys.length; i++) {
            this.txBuffer[2] = i; // index
            try {
                const res = await this.enqueueCommand(this.txBuffer);
                this.packet_process(res);
            } catch (e) {
                console.error(`Failed to read Dynamic Key ${i}`, e);
            }
        }
    }

    async read_config_index() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataProfileIndex;
        try {
            const res = await this.enqueueCommand(this.txBuffer);
            this.packet_process(res);
        } catch (e) {
            console.error(`Failed to read Config Index`, e);
        }
    }

    async write_macros() {
        const MAX_ACTIONS_PER_PACKET = 4; // (64-5)/12 = 4.9
        const ACTION_SIZE = 12;

        for (let macro_idx = 0; macro_idx < this.macros.length; macro_idx++) {
            const macro_actions = this.macros[macro_idx];
            // 即使是空宏，可能也需要发一个包去清空，视固件逻辑而定
            // 这里假设如果不为空才发
            if (!macro_actions || macro_actions.length === 0) continue;

            const page_count = Math.ceil(macro_actions.length / MAX_ACTIONS_PER_PACKET);

            for (let page = 0; page < page_count; page++) {
                // 1. 准备 Header
                this.txBuffer.fill(0);
                this.txBuffer[0] = PacketCode.PacketCodeSet;
                this.txBuffer[1] = PacketData.PacketDataMacro;
                this.txBuffer[2] = macro_idx;

                const start_idx = page * MAX_ACTIONS_PER_PACKET;
                const end_idx = Math.min(start_idx + MAX_ACTIONS_PER_PACKET, macro_actions.length);
                const current_count = end_idx - start_idx;

                const dataView = new DataView(this.txBuffer.buffer);
                dataView.setUint16(3, current_count, true); // Length

                // 2. 预填充 Index 字段
                // 我们告诉 packet_process_macro: "我要发送第 X, Y, Z 号 Action，请把数据填进来"
                let offset = 5;
                for (let i = 0; i < current_count; i++) {
                    const abs_index = start_idx + i;
                    // 在 struct 的 offset+4 处写入 index
                    dataView.setUint16(offset + 4, abs_index, true);
                    offset += ACTION_SIZE;
                }

                // 3. 【核心】调用统一处理函数进行数据填充
                // 这一步会读取 this.macros 并填入 txBuffer
                this.packet_process_macro(this.txBuffer); 

                // 4. 发送
                try {
                    await this.enqueueCommand(this.txBuffer);
                } catch (e) {
                    console.error(`Failed to send Macro ${macro_idx} page ${page}`, e);
                }
            }
        }
        console.debug("Sent Macros");
    }

    async read_macros() {
        const ACTIONS_PER_PACKET = 4;
        const ACTION_SIZE = 12;


        for (let m = 0; m < this.macros.length; m++) {
            const MACRO_MAX_ACTIONS = this.macros[0].length; 
            const page_count = Math.ceil(MACRO_MAX_ACTIONS / ACTIONS_PER_PACKET);

            for (let page = 0; page < page_count; page++) {
                // 1. 准备 Header
                this.txBuffer.fill(0);
                this.txBuffer[0] = PacketCode.PacketCodeGet;
                this.txBuffer[1] = PacketData.PacketDataMacro;
                this.txBuffer[2] = m; // macro_index

                const start_idx = page * ACTIONS_PER_PACKET;
                const count = Math.min(ACTIONS_PER_PACKET, MACRO_MAX_ACTIONS - start_idx);
                
                const dataView = new DataView(this.txBuffer.buffer);
                dataView.setUint16(3, count, true); // length

                // 2. 填充请求的 Index
                let offset = 5;
                for (let i = 0; i < count; i++) {
                    dataView.setUint16(offset + 4, start_idx + i, true);
                    offset += ACTION_SIZE;
                }

                // 3. 发送请求并处理回包
                try {
                    const res = await this.enqueueCommand(this.txBuffer);
                    // 回包是一个 GET 类型的包，packet_process_macro 会自动将其写入 this.macros
                    this.packet_process_macro(res);
                } catch (e) {
                    console.error(`Failed to read Macro ${m} page ${page}`, e);
                }
            }
        }
        console.log("Macros read complete");
    }

    get_config_file_num(): number {
        return this.profile_number;
    }

    get_config_file_index(): number {
        return this.profile_index;
    }

    async set_config_file_index(index: number) {
        this.profile_number = index;
        const commandId = this.profile_number + 0x10;

        // 1. 准备指令
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeAction;
        this.txBuffer[1] = commandId;

        console.log(`Commanding switch to config ${index}...`);

        try {
            await this.enqueueCommand(this.txBuffer, 1000);
            console.log("MCU confirmed switch. Requesting data...");
            await this.request_config();
            
        } catch (e) {
            console.error("Config switch failed or timed out:", e);
        }
    }

    async request_version() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataVersion;
        
        try {
            // 使用队列发送并等待回复
            const res = await this.enqueueCommand(this.txBuffer);
            this.packet_process_version(res);
            return this.firmware_version;
        } catch (e) {
            console.error("Failed to get firmware version", e);
            return null;
        }
    }
    
    get_firmware_version() {
        return this.firmware_version;
    }

    get_macros(): IMacroAction[][] {
        return this.macros;
    }
    set_macros(macros: IMacroAction[][]): void {
        this.macros = macros;
    }

    get_readme_markdown(): string {
        return "Powered by libamp";
    }
    
    get_feature(): IFeature {
        return this.feature;
    }

    async write_script_source(sourceCode: string): Promise<void> {
        // 将字符串编码为 UTF-8 字节流
        const encoder = new TextEncoder();
        const data = encoder.encode(sourceCode);
        console.log("script source",data);
        
        // 假设 PacketData.PacketDataScriptSource = 0x0C
        await this._set_large_data(0x0C, data); 
    }

    // 获取脚本源码
    async read_script_source() {
        // 假设 PacketData.PacketDataScriptSource = 0x0C
        const data = await this._get_large_data(0x0C);
        console.log(data);
        
        if (!data)
        {
            this.script_source = "";
            return;
        };
        let validLength = data.length;
        for (let i = 0; i < data.length; i++) {
            if (data[i] === 0x00 || data[i] === 0xFF) {
                validLength = i;
                break;
            }
        }
        
        // 只提取有效长度的字节进行解码
        const validData = data.subarray(0, validLength);
        
        const decoder = new TextDecoder();
        this.script_source = decoder.decode(validData);
        console.log(this.script_source);
    }
    // 设置脚本字节码
    async write_script_bytecode(bytecode: Uint8Array): Promise<void> {
        await this._set_large_data(0x0D, bytecode);
    }

    // 获取脚本字节码
    async read_script_bytecode(){
        var bytecode = await this._get_large_data(0x0D);
        console.log(bytecode);
        if (bytecode)
        {
            this.script_bytecode = bytecode;
        }
    }

    get_script_source(): string {
        return this.script_source;
    }
    set_script_source(script: string): void {
        this.script_source = script;
    }
    get_script_bytecode(): Uint8Array {
        return this.script_bytecode;
    }
    set_script_bytecode(bytecode: Uint8Array): void {
        this.script_bytecode = bytecode;
    }
}
