export interface DecodedFrame {
  channel: number;
  flags: number;
  seq: number;
  code: number;
  type: number;
  payload: Uint8Array;
}

type InputReportListener = (event: HIDInputReportEvent) => void;
type DisconnectListener = (event: HIDConnectionEvent) => void;

function toUint8Array(data: BufferSource): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export class MockHidDevice {
  opened = false;
  readonly sentReports: Uint8Array[] = [];
  onSend?: (report: Uint8Array) => void | Promise<void>;
  private readonly inputListeners = new Set<InputReportListener>();

  async open(): Promise<void> {
    this.opened = true;
  }

  async close(): Promise<void> {
    this.opened = false;
  }

  async sendReport(_reportId: number, data: BufferSource): Promise<void> {
    const report = new Uint8Array(toUint8Array(data));
    this.sentReports.push(report);
    await this.onSend?.(report);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'inputreport') {
      this.inputListeners.add(listener as InputReportListener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'inputreport') {
      this.inputListeners.delete(listener as InputReportListener);
    }
  }

  emitInput(frame: Uint8Array): void {
    const data = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    const event = { data } as HIDInputReportEvent;
    this.inputListeners.forEach(listener => listener(event));
  }

  get inputListenerCount(): number {
    return this.inputListeners.size;
  }
}

export class MockHidManager {
  private readonly disconnectListeners = new Set<DisconnectListener>();

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'disconnect') {
      this.disconnectListeners.add(listener as DisconnectListener);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'disconnect') {
      this.disconnectListeners.delete(listener as DisconnectListener);
    }
  }

  emitDisconnect(device: MockHidDevice): void {
    const event = { device } as HIDConnectionEvent;
    this.disconnectListeners.forEach(listener => listener(event));
  }

  get disconnectListenerCount(): number {
    return this.disconnectListeners.size;
  }
}

export function installMockNavigator(hid = new MockHidManager()): MockHidManager {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hid },
  });
  return hid;
}

export function decodeFrame(report: Uint8Array): DecodedFrame {
  return {
    channel: report[1] >> 4,
    flags: report[1] & 0x0f,
    seq: report[2],
    code: report[3],
    type: report[4],
    payload: report.slice(6, 6 + report[5]),
  };
}

export function makeFrame({
  channel = 0,
  flags = 0,
  seq = 0,
  code,
  type = 0,
  payload = new Uint8Array(),
}: Partial<DecodedFrame> & Pick<DecodedFrame, 'code'>): Uint8Array {
  if (payload.length > 58) {
    throw new Error('AmpFrame payload exceeds 58 bytes');
  }
  const frame = new Uint8Array(64);
  frame[0] = 0x41;
  frame[1] = (channel << 4) | flags;
  frame[2] = seq;
  frame[3] = code;
  frame[4] = type;
  frame[5] = payload.length;
  frame.set(payload, 6);
  return frame;
}

export function responseFor(
  request: DecodedFrame,
  payload = request.payload,
  options: { error?: boolean; channel?: number } = {},
): Uint8Array {
  return makeFrame({
    channel: options.channel ?? request.channel,
    flags: 0x02 | (options.error ? 0x04 : 0),
    seq: request.seq,
    code: request.code,
    type: request.type,
    payload,
  });
}

export function legacyPacketFromFrame(frame: DecodedFrame): Uint8Array {
  const packet = new Uint8Array(64);
  packet[0] = frame.code;
  if (frame.code === 0x00) {
    packet.set(frame.payload, 1);
  } else if (frame.code === 0x03) {
    new DataView(packet.buffer).setUint16(2, frame.payload.length, true);
    packet.set(frame.payload, 4);
  } else {
    packet[1] = frame.type;
    packet.set(frame.payload, 2);
  }
  return packet;
}

export function flushPromises(): Promise<void> {
  return new Promise(resolve => queueMicrotask(resolve));
}
