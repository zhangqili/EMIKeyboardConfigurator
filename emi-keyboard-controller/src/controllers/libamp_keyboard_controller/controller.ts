import { DynamicKey, DynamicKeyModTap, DynamicKeyMutex, DynamicKeyStroke4x4, DynamicKeyToggleKey, DynamicKeyType, IDynamicKey, KeyboardController, getEMIPathIdentifier, KeyboardKeycode, IAdvancedKey, IRGBBaseConfig, IRGBConfig, FirmwareVersion, MacroAction, IMacroAction, IFeature, Feature, ScriptLevel, Keycode, KeyboardKeyEvent, KeyboardConfigCode} from "./../../interface";
import semver, { SemVer } from 'semver';

enum PacketCode {
  PacketCodeEvent = 0x00,
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
const AMP_FRAME_PROTO = 0x41;
const AMP_FRAME_REPORT_SIZE = 64;
const AMP_FRAME_HEADER_SIZE = 6;
const AMP_FRAME_MAX_PAYLOAD = AMP_FRAME_REPORT_SIZE - AMP_FRAME_HEADER_SIZE;
const DEBUG_PACKET_HEADER_SIZE = 7;
const DEBUG_ITEM_SIZE = 10;
const DEBUG_KEYS_PER_PACKET = 5;
const DEBUG_FLAG_STATE = 1 << 0;
const DEBUG_FLAG_REPORT_STATE = 1 << 1;

enum AmpChannel {
    Control = 0,
    Debug = 1,
    Console = 2,
    Large = 3,
    NexusCtrl = 4,
    User = 15,
}

enum AmpFrameFlag {
    ReqAck = 0x01,
    Resp = 0x02,
    Error = 0x04,
    More = 0x08,
}

interface AmpFrame {
    channel: number;
    flags: number;
    seq: number;
    code: number;
    type: number;
    payload: Uint8Array;
}

interface PendingRequest {
    resolve: (data: Uint8Array) => void;
    reject: (reason: any) => void;
    seq: number;
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
    public clear(reason: Error = new Error("Queue cleared")) {
        // 将队列中所有还未执行的 Promise 全部 reject 掉，防止外部 await 死等
        for (const item of this.queue) {
            item.reject(reason);
        }
        // 清空数组释放内存
        this.queue = [];
        // 释放处理锁
        this.isProcessing = false;
    }
}

export class LibampKeyboardController extends KeyboardController {
    device: HIDDevice | undefined;
    private handleInputReport: (event: HIDInputReportEvent) => void;
    profile_number:number = 4;
    profile_index:number = 0;
    private pendingRequests = new Map<number, PendingRequest>();
    private nextSeq: number = 1;
    private txBuffer = new Uint8Array(64); // 复用发送缓冲区，避免GC
    private requestQueue = new RequestQueue();
    private reloadTimer: number | null = null;
    private isReloading: boolean = false;
    private refreshAgain: boolean = false;
    private profileSwitchReloadPending: boolean = false;
    private isDebugRequestRunning: boolean = false;
    private lastDebugTimeoutWarningAt: number = 0;
    private readonly reloadDebounceMs: number = 200;
    private readonly debugRequestTimeoutMs: number = 500;
    firmware_version : FirmwareVersion = { major: 0, minor: 0, patch: 0, info: "" };
    macros : MacroAction[][] = [[]];
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
            const frame = this.decodeFrame(data);
            if (!frame) {
                return;
            }

            if ((frame.flags & AmpFrameFlag.Resp) && frame.seq !== 0) {
                const pending = this.pendingRequests.get(frame.seq);
                if (pending) {
                    window.clearTimeout(pending.timer);
                    this.pendingRequests.delete(frame.seq);
                    if (frame.flags & AmpFrameFlag.Error) {
                        pending.reject(new Error(`Device returned error ${frame.payload[0] ?? 0} for seq ${frame.seq}`));
                    } else {
                        pending.resolve(this.frameToLegacyPacket(frame));
                    }
                    return;
                }
            }

            if (frame.channel === AmpChannel.Console) {
                this.dispatchEvent(new CustomEvent('consoleData', {
                    detail: {
                        text: new TextDecoder().decode(frame.payload),
                        data: frame.payload,
                    }
                }));
                return;
            }

            if (this.isVersionNotificationFrame(frame)) {
                this.handleVersionNotification(this.frameToLegacyPacket(frame));
                return;
            }

            this.packet_process(this.frameToLegacyPacket(frame));
        };

    }
    private async sendAndWait(buf: Uint8Array, timeout: number = 200): Promise<Uint8Array> {
        const seq = this.allocateSeq();
        const report = this.legacyPacketToFrame(buf, AmpFrameFlag.ReqAck, seq);
        return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
                if (this.pendingRequests.get(seq)) {
                    this.pendingRequests.delete(seq);
                    reject(new Error(`Timeout waiting for packet seq ${seq}, code ${buf[0]}, type ${buf[1]}`));
                }
            }, timeout);

            this.pendingRequests.set(seq, {
                resolve,
                reject,
                seq,
                timer
            });

            this.sendReport(report).catch((error) => {
                window.clearTimeout(timer);
                this.pendingRequests.delete(seq);
                reject(error);
            });
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

    private allocateSeq(): number {
        const seq = this.nextSeq;
        this.nextSeq = (this.nextSeq + 1) & 0xFF;
        if (this.nextSeq === 0) {
            this.nextSeq = 1;
        }
        return seq;
    }

    private async sendReport(report: Uint8Array): Promise<void> {
        if (!this.device || !this.device.opened) {
            throw new Error("Device is not connected");
        }
        await this.device.sendReport(0, report as BufferSource);
    }

    private channelForPacket(code: number, type: number): AmpChannel {
        if (code === PacketCode.PacketCodeLargeSet || code === PacketCode.PacketCodeLargeGet) {
            return AmpChannel.Large;
        }
        if ((code === PacketCode.PacketCodeGet || code === PacketCode.PacketCodeSet) && type === PacketData.PacketDataDebug) {
            return AmpChannel.Debug;
        }
        if (code === PacketCode.PacketCodeLog) {
            return AmpChannel.Console;
        }
        if (code === PacketCode.PacketCodeUser) {
            return AmpChannel.User;
        }
        return AmpChannel.Control;
    }

    private legacyPacketLength(buf: Uint8Array): number {
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        switch (buf[0]) {
            case PacketCode.PacketCodeEvent:
                return 8;
            case PacketCode.PacketCodeLog:
                return Math.min(buf.byteLength, 4 + view.getUint16(2, true));
            case PacketCode.PacketCodeLargeSet:
            case PacketCode.PacketCodeLargeGet:
                if (buf[2] === LargeDataCmd.Payload) {
                    return Math.min(buf.byteLength, 9 + view.getUint16(7, true));
                }
                if (buf[2] === LargeDataCmd.Start) {
                    return 11;
                }
                return 3;
            case PacketCode.PacketCodeGet:
            case PacketCode.PacketCodeSet:
                switch (buf[1]) {
                    case PacketData.PacketDataAdvancedKey:
                        return 26;
                    case PacketData.PacketDataRgbBaseConfig:
                        return 15;
                    case PacketData.PacketDataRgbConfig:
                        return Math.min(buf.byteLength, 3 + buf[2] * 8);
                    case PacketData.PacketDataKeymap:
                        return Math.min(buf.byteLength, 6 + buf[5] * 2);
                    case PacketData.PacketDataDynamicKey:
                        return 34;
                    case PacketData.PacketDataProfileIndex:
                        return 3;
                    case PacketData.PacketDataConfig:
                        return Math.min(buf.byteLength, 4 + buf[2] * 2);
                    case PacketData.PacketDataDebug:
                        return Math.min(buf.byteLength, DEBUG_PACKET_HEADER_SIZE + buf[2] * DEBUG_ITEM_SIZE);
                    case PacketData.PacketDataMacro:
                        return Math.min(buf.byteLength, 5 + view.getUint16(3, true) * 12);
                    case PacketData.PacketDataVersion: {
                        const infoLen = view.getUint16(2, true);
                        return infoLen > 0 ? Math.min(buf.byteLength, 16 + infoLen) : 2;
                    }
                    case PacketData.PacketDataFeature:
                        return 11;
                    default:
                        return buf.byteLength;
                }
            default:
                return buf.byteLength;
        }
    }

    private legacyPacketToFrame(buf: Uint8Array, flags: number, seq: number): Uint8Array {
        const report = new Uint8Array(AMP_FRAME_REPORT_SIZE);
        const packetLen = this.legacyPacketLength(buf);
        const code = buf[0];
        let type = 0;
        let payload: Uint8Array;

        if (code === PacketCode.PacketCodeEvent) {
            payload = buf.slice(1, packetLen);
        } else if (code === PacketCode.PacketCodeLog) {
            payload = buf.slice(4, packetLen);
        } else {
            type = buf[1];
            payload = buf.slice(2, packetLen);
        }

        if (payload.length > AMP_FRAME_MAX_PAYLOAD) {
            throw new Error(`Packet too large for AmpFrame: code ${code}, type ${type}, payload ${payload.length}`);
        }

        report[0] = AMP_FRAME_PROTO;
        report[1] = ((this.channelForPacket(code, type) & 0x0F) << 4) | (flags & 0x0F);
        report[2] = seq;
        report[3] = code;
        report[4] = type;
        report[5] = payload.length;
        report.set(payload, AMP_FRAME_HEADER_SIZE);
        return report;
    }

    private decodeFrame(data: Uint8Array): AmpFrame | null {
        if (data.byteLength < AMP_FRAME_HEADER_SIZE || data[0] !== AMP_FRAME_PROTO) {
            console.warn("[AmpFrame] Dropped non-V2 report", data);
            return null;
        }
        const len = data[5];
        if (len > AMP_FRAME_MAX_PAYLOAD || AMP_FRAME_HEADER_SIZE + len > data.byteLength) {
            console.warn("[AmpFrame] Dropped invalid frame length", len);
            return null;
        }
        return {
            channel: data[1] >> 4,
            flags: data[1] & 0x0F,
            seq: data[2],
            code: data[3],
            type: data[4],
            payload: data.slice(AMP_FRAME_HEADER_SIZE, AMP_FRAME_HEADER_SIZE + len),
        };
    }

    private frameToLegacyPacket(frame: AmpFrame): Uint8Array {
        const packet = new Uint8Array(64);
        if (frame.code === PacketCode.PacketCodeEvent) {
            packet[0] = frame.code;
            packet.set(frame.payload, 1);
            return packet;
        }
        if (frame.code === PacketCode.PacketCodeLog) {
            packet[0] = frame.code;
            const view = new DataView(packet.buffer);
            view.setUint16(2, frame.payload.length, true);
            packet.set(frame.payload, 4);
            return packet;
        }
        packet[0] = frame.code;
        packet[1] = frame.type;
        packet.set(frame.payload, 2);
        return packet;
    }

    private isVersionNotificationFrame(frame: AmpFrame): boolean {
        return frame.seq === 0 &&
            !(frame.flags & AmpFrameFlag.Resp) &&
            frame.channel === AmpChannel.Control &&
            frame.code === PacketCode.PacketCodeGet &&
            frame.type === PacketData.PacketDataVersion;
    }

    private isSupportedFirmwareVersion(): boolean {
        return this.firmware_version.major === 0 && this.firmware_version.minor === 1;
    }

    private handleVersionNotification(buf: Uint8Array): void {
        if (this.packet_process_version(buf) && this.isSupportedFirmwareVersion()) {
            this.scheduleReload();
        }
    }

    private scheduleReload(): void {
        if (this.isReloading) {
            this.refreshAgain = true;
            return;
        }
        if (this.reloadTimer !== null) {
            window.clearTimeout(this.reloadTimer);
        }
        this.reloadTimer = window.setTimeout(() => {
            this.reloadTimer = null;
            void this.runReload();
        }, this.reloadDebounceMs);
    }

    private async runReload(): Promise<void> {
        if (this.isReloading) {
            this.refreshAgain = true;
            return;
        }
        if (this.reloadTimer !== null) {
            window.clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }

        this.isReloading = true;
        this.dispatchEvent(new Event('updateDataStart'));
        try {
            do {
                this.refreshAgain = false;
                await this.read_data();
            } while (this.refreshAgain);
        } catch (e) {
            console.error("Error loading config:", e);
        } finally {
            this.isReloading = false;
            this.profileSwitchReloadPending = false;
        }
    }

    private shouldSkipDebugRequest(): boolean {
        return this.isReloading || this.reloadTimer !== null || this.profileSwitchReloadPending;
    }

    write(buf: Uint8Array): number {
        try {
            const report = this.legacyPacketToFrame(buf, 0, 0);
            void this.sendReport(report).catch((e) => console.error("Failed to write packet", e));
        } catch (e) {
            console.error("Failed to write packet", e);
        }
        return buf.byteLength;
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
            this.device.addEventListener("inputreport", this.handleInputReport);
            navigator.hid.addEventListener('disconnect', this.handleDeviceDisconnect);
            this.request();
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
        for (const pending of this.pendingRequests.values()) {
            window.clearTimeout(pending.timer);
            pending.reject(new Error("Device disconnected abruptly"));
        }
        this.pendingRequests.clear();

        if (this.reloadTimer !== null) {
            window.clearTimeout(this.reloadTimer);
            this.reloadTimer = null;
        }
        this.isReloading = false;
        this.refreshAgain = false;
        this.profileSwitchReloadPending = false;

        this.requestQueue.clear(new Error("Device disconnected abruptly"));
    }

    private async _set_large_data(dataType: number, data: Uint8Array): Promise<void> {
        const totalSize = data.length;
        // 头部大小: Code(1)+Type(1)+Sub(1)+Header(8) = 11 (Start包)
        // 载荷包头部: Code(1)+Type(1)+Sub(1)+Offset(4)+Len(2) = 9
        const payloadHeaderSize = 7; // sub(1)+offset(4)+length(2) after AmpFrame strips code/type
        const maxPayloadSize = AMP_FRAME_MAX_PAYLOAD - payloadHeaderSize;

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
        const maxPayloadSize = AMP_FRAME_MAX_PAYLOAD - 7;

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
                this.packet_process_profile_index(buf);
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
            const config = this.advanced_keys[key_index].config;
            config.mode = buf[4];
            config.calibration_mode = buf[5];
            config.activation_value = dataView.getUint16(6 + 2 * 0, true)/65535;
            config.deactivation_value = dataView.getUint16(6 + 2 * 1, true)/65535;
            config.trigger_distance = dataView.getUint16(6 + 2 * 2, true)/65535;
            config.release_distance = dataView.getUint16(6 + 2 * 3, true)/65535;
            config.trigger_speed = dataView.getUint16(6 + 2 * 4, true)/65535;
            config.release_speed = dataView.getUint16(6 + 2 * 5, true)/65535;
            config.upper_deadzone = dataView.getUint16(6 + 2 * 6, true)/65535;
            config.lower_deadzone = dataView.getUint16(6 + 2 * 7, true)/65535;
            config.upper_bound = dataView.getUint16(6 + 2 * 8, true);
            config.lower_bound = dataView.getUint16(6 + 2 * 9, true);
            console.log(this.advanced_keys[key_index]);
        }
        else (buf[0] == PacketCode.PacketCodeSet)
        {
            const key_index = dataView.getUint16(2, true);
            const config = this.advanced_keys[key_index].config;
            buf[4] = config.mode;
            buf[5] = config.calibration_mode;
            dataView.setUint16(6 + 2 * 0, config.activation_value*65535, true);
            dataView.setUint16(6 + 2 * 1, config.deactivation_value*65535, true);
            dataView.setUint16(6 + 2 * 2, config.trigger_distance*65535, true);
            dataView.setUint16(6 + 2 * 3, config.release_distance*65535, true);
            dataView.setUint16(6 + 2 * 4, config.trigger_speed*65535, true);
            dataView.setUint16(6 + 2 * 5, config.release_speed*65535, true);
            dataView.setUint16(6 + 2 * 6, config.upper_deadzone*65535, true);
            dataView.setUint16(6 + 2 * 7, config.lower_deadzone*65535, true);
            dataView.setUint16(6 + 2 * 8, config.upper_bound, true);
            dataView.setUint16(6 + 2 * 9, config.lower_bound, true);
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
            this.rgb_base_config.speed = dataView.getUint16(9, true);
            this.rgb_base_config.direction = dataView.getUint16(11, true);
            this.rgb_base_config.density = buf[13];
            this.rgb_base_config.brightness = buf[14];
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
            dataView.setUint16(9,this.rgb_base_config.speed,true);
            dataView.setUint16(11,this.rgb_base_config.direction % 65536,true);
            buf[13] = this.rgb_base_config.density % 256;
            buf[14] = this.rgb_base_config.brightness % 256;
      }
    }

    packet_process_rgb_config(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 8 * i, true);
                if (key_index<this.rgb_configs.length)
                {
                    this.rgb_configs[key_index].mode  = buf[3 + 8 * i + 2];
                    this.rgb_configs[key_index].rgb.red = buf[3 + 8 * i + 3];
                    this.rgb_configs[key_index].rgb.green = buf[3 + 8 * i + 4];
                    this.rgb_configs[key_index].rgb.blue = buf[3 + 8 * i + 5];
                    this.rgb_configs[key_index].speed = dataView.getUint16(3 + 8 * i + 6, true);
                    
                    //rgb_to_hsv(&g_rgb_configs[g_rgb_mapping[buf[1]+i]].hsv, &g_rgb_configs[g_rgb_mapping[buf[1]+i]].rgb);
                }
            }
      }
      else if (buf[0] == PacketCode.PacketCodeSet)
      {
            const dataLength = buf[2];
            for (var i = 0; i < dataLength; i++)
            {
                const key_index = dataView.getUint16(3 + 0 + 8 * i,true);
                if (key_index<this.rgb_configs.length)
                {
                  buf[3 + 2 + 8 * i] = this.rgb_configs[key_index].mode;
                  buf[3 + 3 + 8 * i] = this.rgb_configs[key_index].rgb.red;
                  buf[3 + 4 + 8 * i] = this.rgb_configs[key_index].rgb.green;
                  buf[3 + 5 + 8 * i] = this.rgb_configs[key_index].rgb.blue;
                  dataView.setUint16(3 + 6 + 8 * i,this.rgb_configs[key_index].speed,true);
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
                    dynamic_key_stroke.press_begin_distance = dataView.getUint16(4+16,true)/65535;
                    dynamic_key_stroke.press_fully_distance = dataView.getUint16(4+18,true)/65535;
                    dynamic_key_stroke.release_begin_distance = dataView.getUint16(4+20,true)/65535;
                    dynamic_key_stroke.release_fully_distance = dataView.getUint16(4+22,true)/65535;
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
                    dataView.setUint16(4+16,dynamic_key_stroke.press_begin_distance*65535,true);
                    dataView.setUint16(4+18,dynamic_key_stroke.press_fully_distance*65535,true);
                    dataView.setUint16(4+20,dynamic_key_stroke.release_begin_distance*65535,true);
                    dataView.setUint16(4+22,dynamic_key_stroke.release_fully_distance*65535,true);
                    dataView.setUint16(4+24,dynamic_key_stroke.target_keys_location[0].id,true);
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

    packet_process_profile_index(buf : Uint8Array)
    {
      let dataView = new DataView(buf.buffer);
      if (buf[0] == PacketCode.PacketCodeGet) {
        this.profile_index = buf[2];
      }
    }

    packet_process_config(buf : Uint8Array)
    {
        if (buf[0] === PacketCode.PacketCodeGet) {
            // GET: 接收来自下位机的数据并更新本地 config
            const length = buf[2];
            for (let i = 0; i < length; i++) {
                const index = buf[4 + i * 2];
                const value = buf[5 + i * 2] > 0;
                
                switch (index) {
                    case KeyboardConfigCode.KeyboardConfigDebug:
                        this.config.debug = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigNkro:
                        this.config.nkro = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigWinlock:
                        this.config.winlock = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigContinousPoll:
                        this.config.continuous_poll = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigEnableReport:
                        this.config.enable_report = value;
                        break;
                    case KeyboardConfigCode.KeyboardConfigConsole:
                        this.config.console = value;
                        break;
                }
            }
        }
        else if (buf[0] === PacketCode.PacketCodeSet) {
            // SET: 根据本地 config 填充即将发送给下位机的 Buffer
            const length = buf[2];
            for (let i = 0; i < length; i++) {
                const index = buf[4 + i * 2];
                let value = false;
                
                switch (index) {
                    case KeyboardConfigCode.KeyboardConfigDebug:
                        value = this.config.debug;
                        break;
                    case KeyboardConfigCode.KeyboardConfigNkro:
                        value = this.config.nkro;
                        break;
                    case KeyboardConfigCode.KeyboardConfigWinlock:
                        value = this.config.winlock;
                        break;
                    case KeyboardConfigCode.KeyboardConfigContinousPoll:
                        value = this.config.continuous_poll;
                        break;
                    case KeyboardConfigCode.KeyboardConfigEnableReport:
                        value = this.config.enable_report;
                        break;
                    case KeyboardConfigCode.KeyboardConfigConsole:
                        value = this.config.console;
                        break;
                }
                // 写入 boolean 对应的 0 或 1
                buf[5 + i * 2] = value ? 1 : 0;
            }
        }
        console.log(this.config);
    }

    private applyDebugPacket(buf : Uint8Array): { tick: number; updated_keys: number[] } | null
    {
      let dataView = new DataView(buf.buffer);  
      if (buf[0] == PacketCode.PacketCodeGet) {
        const dataLength = buf[2];
        const tick = dataView.getUint32(3, true);
        const updated_keys: number[] = [];
        for (var i = 0; i < dataLength; i++)
        {
            const base = DEBUG_PACKET_HEADER_SIZE + DEBUG_ITEM_SIZE * i;
            const key_index = dataView.getUint16(base, true);
            updated_keys.push(key_index);
            if (key_index<this.advanced_keys.length)
            {
                this.advanced_keys[key_index].state = buf[base + 2] > 0;
                this.advanced_keys[key_index].report_state = buf[base + 3] > 0;
                this.advanced_keys[key_index].value = dataView.getUint16(base + 4, true)/65535;
                this.advanced_keys[key_index].raw = dataView.getUint16(base + 6, true);
                this.advanced_keys[key_index].filtered_raw = dataView.getUint16(base + 8, true);
            }
        }
        return {
            tick: tick,
            updated_keys: updated_keys,
        };
      }
      return null;
    }

    private dispatchDebugData(tick: number, updated_keys: number[]): void {
        this.dispatchEvent(new CustomEvent('updateDebugData', {
            detail: {
                tick: tick,
                updated_keys: updated_keys,
            }
        }));
    }

    private processDebugResults(results: Uint8Array[]): void {
        let tick = 0;
        const updated_keys: number[] = [];
        const seen = new Set<number>();
        results.forEach(res => {
            if (!res) {
                return;
            }
            const update = this.applyDebugPacket(res);
            if (!update) {
                return;
            }
            tick = update.tick;
            update.updated_keys.forEach(id => {
                if (!seen.has(id)) {
                    seen.add(id);
                    updated_keys.push(id);
                }
            });
        });
        if (updated_keys.length > 0) {
            this.dispatchDebugData(tick, updated_keys);
        }
    }

    private warnDebugRequestDisrupted(error: any): void {
        const now = Date.now();
        if (now - this.lastDebugTimeoutWarningAt < 2000) {
            return;
        }
        this.lastDebugTimeoutWarningAt = now;
        console.warn("Debug request disrupted, skipping current frame:", error);
    }

    packet_process_debug(buf : Uint8Array)
    {
      const update = this.applyDebugPacket(buf);
      if (update) {
        this.dispatchDebugData(update.tick, update.updated_keys);
      }
    }
    packet_process_version(buf: Uint8Array): boolean {
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
            return true;
        }
        return false;
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
                    delay : delay,
                    event : {
                        key_id : key_id,
                        is_virtual : is_virtual,
                        event : event,
                        keycode : keycode
                    }
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
                    dataView.setUint16(offset + 6, action.event.key_id, true);
                    dataView.setUint8(offset + 8, action.event.is_virtual ? 1 : 0);
                    dataView.setUint8(offset + 9, action.event.event);
                    dataView.setUint16(offset + 10, action.event.keycode, true);
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

    fetch(): void {
        throw new Error('Method not implemented.');
    }

    async save() {
        console.log("Starting save config...");
        await this.write_config();
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
    flash(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x03;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = KeyboardKeycode.KeyboardSave;
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
    }

    calibrate(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x01;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = KeyboardKeycode.KeyboardCalibrate;
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
    }
    system_reset(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x03;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = KeyboardKeycode.KeyboardReboot;
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
    }
    factory_reset(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x03;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = KeyboardKeycode.KeyboardFactoryReset;
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
    }
    enter_bootloader(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x03;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = KeyboardKeycode.KeyboardBootloader;
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
    }
    async read_data(): Promise<void> {
        await this.read_config();
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
    }
    async request(): Promise<void> {
      try {
          const version = await this.request_version();
          if (version && this.isSupportedFirmwareVersion()) {
              await this.runReload();
          }
      } catch (e) {
          console.error("Error loading config:", e);
      }
    }
    private async requestDebugIds(ids: number[]): Promise<void> {
        if (this.shouldSkipDebugRequest()) {
            return;
        }
        if (this.isDebugRequestRunning) {
            return;
        }
        this.isDebugRequestRunning = true;
        try {
            const total_keys = ids.length;
            const page_num = Math.ceil(total_keys / DEBUG_KEYS_PER_PACKET);
            const results: Uint8Array[] = [];

            for (let i = 0; i < page_num; i++) {
                if (this.shouldSkipDebugRequest()) {
                    break;
                }
                let send_buf = new Uint8Array(64);
                send_buf[0] = PacketCode.PacketCodeGet;
                send_buf[1] = PacketData.PacketDataDebug;

                let page_length = (i + 1) * DEBUG_KEYS_PER_PACKET > total_keys ? total_keys % DEBUG_KEYS_PER_PACKET : DEBUG_KEYS_PER_PACKET;
                send_buf[2] = page_length;

                let dataView = new DataView(send_buf.buffer);
                for (let j = 0; j < page_length; j++) {
                    let key_index = ids[i * DEBUG_KEYS_PER_PACKET + j];
                    dataView.setUint16(DEBUG_PACKET_HEADER_SIZE + j * DEBUG_ITEM_SIZE, key_index, true);
                }

                try {
                    results.push(await this.enqueueCommand(send_buf, this.debugRequestTimeoutMs));
                } catch (e) {
                    this.warnDebugRequestDisrupted(e);
                    break;
                }
            }

            this.processDebugResults(results);
        } finally {
            this.isDebugRequestRunning = false;
        }
    }

    async request_debug(): Promise<void> {
        const ids = this.advanced_keys.map((_, index) => index);
        await this.requestDebugIds(ids);
    }
    async request_debug_at(ids: number[]): Promise<void> {
        if (this.shouldSkipDebugRequest()) {
            return;
        }
        // 如果传入的数组为空，直接返回，避免发送无用数据包
        if (!ids || ids.length === 0) {
            return;
        }
        await this.requestDebugIds(ids);
    }
    start_debug(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x03;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = 32 | (1<<6);
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
    }
    stop_debug(): void {
        let send_buf = new Uint8Array(64);
        send_buf[0] = PacketCode.PacketCodeEvent;
        send_buf[1] = 0x03;
        send_buf[2] = Keycode.KeyboardOperation;
        send_buf[3] = 32 | (0<<6);
        send_buf[6] = 1;
        void this.enqueueCommand(send_buf, 1000);
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
        const rgb_page_num = Math.ceil(this.rgb_configs.length / 7);
        for (let i = 0; i < rgb_page_num; i++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeSet;
            this.txBuffer[1] = PacketData.PacketDataRgbConfig;

            let page_length = (i + 1) * 7 > this.rgb_configs.length ? this.rgb_configs.length % 7 : 7;
            this.txBuffer[2] = page_length;
            
            let dataView = new DataView(this.txBuffer.buffer);

            for (let j = 0; j < page_length; j++) {
                let rgb_index = i * 7 + j;
                dataView.setUint16(3 + 8 * j, rgb_index, true); 
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

        const rgb_page_num = Math.ceil(this.rgb_configs.length / 7);
        for (let rgb_page_index = 0; rgb_page_index < rgb_page_num; rgb_page_index++) {
            this.txBuffer.fill(0);
            this.txBuffer[0] = PacketCode.PacketCodeGet;
            this.txBuffer[1] = PacketData.PacketDataRgbConfig;
            
            let page_length = (rgb_page_index + 1) * 7 > this.rgb_configs.length ? this.rgb_configs.length % 7 : 7;
            this.txBuffer[2] = page_length;
            
            const dataView = new DataView(this.txBuffer.buffer);
            for (let j = 0; j < page_length; j++) {
                let rgb_index = rgb_page_index * 7 + j;
                if (rgb_index < this.rgb_configs.length) {
                    dataView.setUint16(3 + 0 + 8 * j, rgb_index, true);
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

    async write_config() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeSet;
        this.txBuffer[1] = PacketData.PacketDataConfig;
        
        // 我们要写入的配置数量
        const numConfigs = KeyboardConfigCode.KeyboardConfigNum; 
        this.txBuffer[2] = numConfigs;
        this.txBuffer[3] = 0; // reserved

        // 预填充 Index
        for (let i = 0; i < numConfigs; i++) {
            this.txBuffer[4 + i * 2] = i; 
        }

        // 调用刚才写好的处理函数，它会根据上面填入的 index 将对应的数据值填入 Buffer
        this.packet_process_config(this.txBuffer);

        try {
            await this.enqueueCommand(this.txBuffer);
            console.debug("Sent Keyboard Config");
        } catch (e) {
            console.error("Failed to send Keyboard Config", e);
        }
    }

    async read_config() {
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeGet;
        this.txBuffer[1] = PacketData.PacketDataConfig;
        
        const numConfigs = KeyboardConfigCode.KeyboardConfigNum;
        this.txBuffer[2] = numConfigs;
        this.txBuffer[3] = 0; // reserved

        // 告诉下位机我们要查询哪几个 Index 的配置
        for (let i = 0; i < numConfigs; i++) {
            this.txBuffer[4 + i * 2] = i; 
        }

        try {
            const res = await this.enqueueCommand(this.txBuffer);
            this.packet_process_config(res);
            console.debug("Read Keyboard Config");
        } catch (e) {
            console.error("Failed to read Keyboard Config", e);
        }
    }
    get_profile_num(): number {
        return this.profile_number;
    }

    get_profile_index(): number {
        return this.profile_index;
    }

    async set_profile_index(index: number) {
        this.profile_index = index;
        this.profileSwitchReloadPending = true;
        const commandId = this.profile_index + 0x10;

        // 1. 准备指令
        this.txBuffer.fill(0);
        this.txBuffer[0] = PacketCode.PacketCodeEvent;
        this.txBuffer[1] = 0x03;
        this.txBuffer[2] = Keycode.KeyboardOperation;
        this.txBuffer[3] = commandId;
        this.txBuffer[6] = 1;
        console.log(`Commanding switch to config ${index}...`);

        try {
            await this.enqueueCommand(this.txBuffer, 1000);
            console.log("MCU confirmed switch. Requesting data...");
            this.scheduleReload();
            
        } catch (e) {
            this.profileSwitchReloadPending = false;
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
            if (!this.packet_process_version(res)) {
                return null;
            }
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
        const dataWithNull = new Uint8Array(data.length + 1);
        dataWithNull.set(data);
        console.log("script source",dataWithNull);
        
        // 假设 PacketData.PacketDataScriptSource = 0x0C
        await this._set_large_data(0x0C, dataWithNull); 
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

    async emit(event : KeyboardKeyEvent, use_keymap: boolean) {
        this.txBuffer.fill(0);
        const dataView = new DataView(this.txBuffer.buffer);
        this.txBuffer[0] = PacketCode.PacketCodeEvent;
        this.txBuffer[1] = event.event;
        dataView.setUint16(2, event.keycode ,true);
        dataView.setUint16(4, event.key_id ,true);
        this.txBuffer[6] = event.is_virtual ? 1 : 0;
        this.txBuffer[7] = use_keymap ? 1 : 0;

        try {
            await this.enqueueCommand(this.txBuffer, 1000);
            
        } catch (e) {
            console.error("emit timed out:", e);
        }
    }
}
