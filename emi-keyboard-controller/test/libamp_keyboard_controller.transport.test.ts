import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibampKeyboardController, RequestQueue } from '../src/controllers/libamp_keyboard_controller/controller';
import {
  decodeFrame,
  flushPromises,
  installMockNavigator,
  makeFrame,
  MockHidDevice,
  responseFor,
} from './support/hid';

type ControllerInternals = {
  legacyPacketToFrame: (packet: Uint8Array, flags: number, seq: number) => Uint8Array;
  decodeFrame: (frame: Uint8Array) => unknown;
  enqueueCommand: (packet: Uint8Array, timeout?: number) => Promise<Uint8Array>;
  handleInputReport: (event: HIDInputReportEvent) => void;
  nextSeq: number;
};

const internals = (controller: LibampKeyboardController) => controller as unknown as ControllerInternals;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

function versionPayload(major: number, minor: number, patch: number, info = ''): Uint8Array {
  const encoded = new TextEncoder().encode(info);
  const payload = new Uint8Array(14 + encoded.length);
  const view = new DataView(payload.buffer);
  view.setUint16(0, encoded.length, true);
  view.setUint32(2, major, true);
  view.setUint32(6, minor, true);
  view.setUint32(10, patch, true);
  payload.set(encoded, 14);
  return payload;
}

function wireInput(controller: LibampKeyboardController, device: MockHidDevice): void {
  device.addEventListener('inputreport', internals(controller).handleInputReport as EventListener);
  controller.device = device as unknown as HIDDevice;
  device.opened = true;
}

function emitInput(controller: LibampKeyboardController, frame: Uint8Array): void {
  internals(controller).handleInputReport({
    data: new DataView(frame.buffer, frame.byteOffset, frame.byteLength),
  } as HIDInputReportEvent);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('RequestQueue', () => {
  it('runs asynchronous tasks in order and continues after a rejection', async () => {
    const queue = new RequestQueue();
    const started: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>(resolve => {
      releaseFirst = resolve;
    });

    const first = queue.add(async () => {
      started.push('first');
      await firstGate;
      return 1;
    });
    const second = queue.add(async () => {
      started.push('second');
      throw new Error('device failure');
    });
    const third = queue.add(async () => {
      started.push('third');
      return 3;
    });

    await flushPromises();
    expect(started).toEqual(['first']);
    releaseFirst();

    await expect(first).resolves.toBe(1);
    await expect(second).rejects.toThrow('device failure');
    await expect(third).resolves.toBe(3);
    expect(started).toEqual(['first', 'second', 'third']);
  });

  it('rejects queued work when cleared without abandoning the running task', async () => {
    const queue = new RequestQueue();
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const running = queue.add(async () => {
      await gate;
      return 'done';
    });
    const queued = queue.add(async () => 'never');

    queue.clear(new Error('disconnected'));
    await expect(queued).rejects.toThrow('disconnected');
    release();
    await expect(running).resolves.toBe('done');
  });
});

describe('LibampKeyboardController transport', () => {
  it('encodes legacy packets into protocol frames with the expected channels and payloads', () => {
    const controller = new LibampKeyboardController();
    const encode = internals(controller).legacyPacketToFrame;

    const cases = [
      { packet: new Uint8Array([0x02, 0x07, 0xaa]), channel: 0, payload: [0xaa] },
      { packet: new Uint8Array([0x02, 0x08, 0xbb]), channel: 1, payload: [0xbb] },
      { packet: new Uint8Array([0x03, 0x00, 0x03, 0x00, 0x61, 0x62, 0x63]), channel: 2, payload: [0x61, 0x62, 0x63] },
      { packet: new Uint8Array([0x04, 0x0c, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]), channel: 3, payload: [0x00, 0, 0, 0, 0, 0, 0, 0, 0] },
      { packet: new Uint8Array([0xff, 0x12, 0x34]), channel: 15, payload: [0x34] },
      { packet: new Uint8Array([0x00, 0x03, 0x01, 0x02, 0x03, 0x04, 0x01, 0x00]), channel: 0, payload: [0x03, 0x01, 0x02, 0x03, 0x04, 0x01, 0x00] },
    ];

    for (const { packet, channel, payload } of cases) {
      const frame = decodeFrame(internals(controller).legacyPacketToFrame(packet, 0x01, 37));
      expect(frame).toMatchObject({ channel, flags: 0x01, seq: 37, code: packet[0] });
      expect(Array.from(frame.payload)).toEqual(payload);
    }
  });

  it('round-trips normal, event, and console frames and rejects malformed input', () => {
    const controller = new LibampKeyboardController();
    const privateController = internals(controller) as ControllerInternals & {
      frameToLegacyPacket: (frame: any) => Uint8Array;
    };

    for (const packet of [
      new Uint8Array([0x02, 0x07, 0x11, 0x22]),
      new Uint8Array([0x00, 0x03, 0x34, 0x12, 0x56, 0x78, 0x01, 0x00]),
      new Uint8Array([0x03, 0x00, 0x02, 0x00, 0x4f, 0x4b]),
    ]) {
      const frame = privateController.decodeFrame(privateController.legacyPacketToFrame(packet, 0, 0));
      expect(frame).not.toBeNull();
      const legacy = privateController.frameToLegacyPacket(frame);
      const packetLength = packet[0] === 0x00 ? 8 : packet[0] === 0x03 ? 6 : 4;
      expect(Array.from(legacy.slice(0, packetLength))).toEqual(
        Array.from(packet.slice(0, packetLength)),
      );
    }

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(privateController.decodeFrame(new Uint8Array([0x40, 0, 0, 0, 0, 0]))).toBeNull();
    expect(privateController.decodeFrame(new Uint8Array([0x41, 0, 0, 0, 0, 59]))).toBeNull();
    expect(warning).toHaveBeenCalledTimes(2);
    expect(() => privateController.legacyPacketToFrame(new Uint8Array([0x02, 0xfe, ...Array(59).fill(1)]), 0, 1)).toThrow('Packet too large');
  });

  it('serializes requests, ignores an unrelated response, and accepts the matching sequence', async () => {
    const controller = new LibampKeyboardController();
    const device = new MockHidDevice();
    wireInput(controller, device);

    const first = controller.request_version();
    const second = controller.request_version();
    await flushPromises();
    expect(device.sentReports).toHaveLength(1);

    const firstRequest = decodeFrame(device.sentReports[0]);
    device.emitInput(makeFrame({
      channel: firstRequest.channel,
      flags: 0x02,
      seq: 99,
      code: firstRequest.code,
      type: firstRequest.type,
      payload: versionPayload(0, 1, 2, 'ignored'),
    }));
    await flushPromises();
    expect(device.sentReports).toHaveLength(1);

    device.emitInput(responseFor(firstRequest, versionPayload(0, 1, 2, 'first')));
    await vi.waitFor(() => expect(device.sentReports).toHaveLength(2));

    const secondRequest = decodeFrame(device.sentReports[1]);
    device.emitInput(responseFor(secondRequest, versionPayload(0, 1, 3, 'second')));
    await expect(first).resolves.toMatchObject({ patch: 2, info: 'first' });
    await expect(second).resolves.toMatchObject({ patch: 3, info: 'second' });
  });

  it('turns device errors, timeouts, and disconnects into rejected queued commands', async () => {
    vi.useFakeTimers();
    installMockNavigator();
    const controller = new LibampKeyboardController();
    const device = new MockHidDevice();
    wireInput(controller, device);

    const failed = internals(controller).enqueueCommand(new Uint8Array([0x02, 0x07]), 200);
    await flushPromises();
    const request = decodeFrame(device.sentReports[0]);
    device.emitInput(responseFor(request, new Uint8Array([0x42]), { error: true }));
    await expect(failed).rejects.toThrow('Device returned error 66');

    const timedOut = internals(controller).enqueueCommand(new Uint8Array([0x02, 0x07]), 200);
    const timeoutExpectation = expect(timedOut).rejects.toThrow('Timeout waiting for packet');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    await timeoutExpectation;

    const pending = internals(controller).enqueueCommand(new Uint8Array([0x02, 0x07]), 200);
    await flushPromises();
    controller.disconnect();
    await expect(pending).rejects.toThrow('Device disconnected abruptly');
  });

  it('connects through the HID mock, dispatches console data, and cleans up physical disconnect listeners', async () => {
    const hid = installMockNavigator();
    const controller = new LibampKeyboardController();
    const device = new MockHidDevice();
    device.onSend = report => {
      const request = decodeFrame(report);
      if (request.code === 0x02 && request.type === 0x00) {
        device.emitInput(responseFor(request, versionPayload(0, 0, 0)));
      }
    };

    const consoleEvents: CustomEvent[] = [];
    const disconnectSpy = vi.fn();
    controller.addEventListener('consoleData', event => consoleEvents.push(event as CustomEvent));
    controller.addEventListener('deviceDisconnected', disconnectSpy);

    await expect(controller.connect(device as unknown as HIDDevice)).resolves.toBe(true);
    expect(device.inputListenerCount).toBe(1);
    expect(hid.disconnectListenerCount).toBe(1);

    device.emitInput(makeFrame({ channel: 2, code: 0x03, payload: new TextEncoder().encode('ready') }));
    expect(consoleEvents).toHaveLength(1);
    expect(consoleEvents[0].detail).toMatchObject({ text: 'ready' });

    hid.emitDisconnect(device);
    expect(disconnectSpy).toHaveBeenCalledOnce();
    expect(controller.get_connection_state()).toBe(false);
    expect(device.inputListenerCount).toBe(0);
    expect(hid.disconnectListenerCount).toBe(0);
  });

  it('coalesces supported asynchronous version notifications into a debounced reload', async () => {
    vi.useFakeTimers();
    const controller = new LibampKeyboardController();
    const readData = vi.spyOn(controller, 'read_data').mockResolvedValue();
    const started = vi.fn();
    controller.addEventListener('updateDataStart', started);

    const notification = makeFrame({
      channel: 0,
      code: 0x02,
      type: 0x00,
      payload: versionPayload(0, 1, 5, 'notice'),
    });
    emitInput(controller, notification);
    emitInput(controller, notification);

    await vi.advanceTimersByTimeAsync(200);
    expect(readData).toHaveBeenCalledOnce();
    expect(started).toHaveBeenCalledOnce();
    expect(controller.get_firmware_version()).toMatchObject({ major: 0, minor: 1, patch: 5, info: 'notice' });
  });
});
