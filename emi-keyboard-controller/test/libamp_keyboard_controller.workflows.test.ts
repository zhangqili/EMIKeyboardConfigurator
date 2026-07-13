import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibampKeyboardController } from '../src/controllers/libamp_keyboard_controller/controller';
import {
  AdvancedKey,
  DynamicKeyStroke4x4,
  KeyLocation,
  KeyboardKeyEvent,
  KeyMode,
  RGBBaseConfig,
  RGBBaseMode,
  RGBConfig,
  RGBMode,
} from '../src/interface';
import {
  decodeFrame,
  flushPromises,
  installMockNavigator,
  legacyPacketFromFrame,
  MockHidDevice,
  responseFor,
} from './support/hid';

type ControllerInternals = {
  handleInputReport: (event: HIDInputReportEvent) => void;
};

const internals = (controller: LibampKeyboardController) => controller as unknown as ControllerInternals;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function wireAutoResponder(
  controller: LibampKeyboardController,
  responder: (request: ReturnType<typeof decodeFrame>) => Uint8Array | undefined,
): MockHidDevice {
  const device = new MockHidDevice();
  controller.device = device as unknown as HIDDevice;
  device.opened = true;
  device.addEventListener('inputreport', internals(controller).handleInputReport as EventListener);
  device.onSend = report => {
    const response = responder(decodeFrame(report));
    if (response) {
      device.emitInput(response);
    }
  };
  return device;
}

function echoResponse(request: ReturnType<typeof decodeFrame>): Uint8Array {
  return responseFor(request);
}

describe('LibampKeyboardController public workflows', () => {
  it('sends standalone configuration packets from the supplied values without mutating cached state', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = [new AdvancedKey()];
    controller.keymap = [[0xdead]];
    controller.dynamic_keys = [new DynamicKeyStroke4x4()];
    controller.rgb_base_config = new RGBBaseConfig();
    controller.rgb_configs = [new RGBConfig()];
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });

    const advancedKey = new AdvancedKey({
      mode: KeyMode.KeyAnalogSpeedMode,
      activation_value: 0.25,
      upper_bound: 3210,
      lower_bound: 123,
    });
    const dynamicKey = new DynamicKeyStroke4x4();
    dynamicKey.bindings = [0x101, 0x202, 0x303, 0x404];
    dynamicKey.key_control = [1, 2, 3, 4];
    dynamicKey.target_keys_location = [Object.assign(new KeyLocation(), { id: 9 })];
    const rgbBase = new RGBBaseConfig();
    Object.assign(rgbBase, {
      mode: RGBBaseMode.RgbBaseModeWave,
      rgb: { red: 1, green: 2, blue: 3 },
      secondary_rgb: { red: 4, green: 5, blue: 6 },
      speed: 500,
      direction: 0x12345,
      density: 300,
      brightness: 511,
    });
    const rgb = new RGBConfig();
    Object.assign(rgb, { mode: RGBMode.RgbModeTrigger, rgb: { red: 7, green: 8, blue: 9 }, speed: 1234 });

    await controller.send_advanced_key_packet(2, advancedKey);
    await controller.send_keymap_packet(3, 10, 3, [0x1001, 0x1002, 0x1003]);
    await controller.send_dynamic_key_packet(4, dynamicKey);
    await controller.send_rgb_base_packet(rgbBase);
    await controller.send_rgb_packet(5, rgb);

    expect(sent.map(frame => frame.type)).toEqual([0x01, 0x02, 0x05, 0x03, 0x04]);

    const advanced = new DataView(sent[0].payload.buffer, sent[0].payload.byteOffset);
    expect(advanced.getUint16(0, true)).toBe(2);
    expect(sent[0].payload[2]).toBe(KeyMode.KeyAnalogSpeedMode);
    expect(advanced.getUint16(4, true)).toBe(Math.trunc(0.25 * 65535));
    expect(advanced.getUint16(20, true)).toBe(3210);
    expect(advanced.getUint16(22, true)).toBe(123);

    const keymap = new DataView(sent[1].payload.buffer, sent[1].payload.byteOffset);
    expect([sent[1].payload[0], keymap.getUint16(1, true), sent[1].payload[3]]).toEqual([3, 10, 3]);
    expect([0, 1, 2].map(offset => keymap.getUint16(4 + offset * 2, true))).toEqual([0x1001, 0x1002, 0x1003]);

    const dynamic = new DataView(sent[2].payload.buffer, sent[2].payload.byteOffset);
    expect([sent[2].payload[0], dynamic.getUint32(2, true)]).toEqual([4, 1]);
    expect([0, 1, 2, 3].map(offset => dynamic.getUint16(6 + offset * 2, true))).toEqual(dynamicKey.bindings);
    expect(dynamic.getUint16(26, true)).toBe(9);

    const base = new DataView(sent[3].payload.buffer, sent[3].payload.byteOffset);
    expect(Array.from(sent[3].payload.slice(0, 7))).toEqual([RGBBaseMode.RgbBaseModeWave, 1, 2, 3, 4, 5, 6]);
    expect([base.getUint16(7, true), base.getUint16(9, true), sent[3].payload[11], sent[3].payload[12]]).toEqual([500, 0x2345, 44, 255]);

    const rgbFrame = new DataView(sent[4].payload.buffer, sent[4].payload.byteOffset);
    expect([sent[4].payload[0], rgbFrame.getUint16(1, true), sent[4].payload[3]]).toEqual([1, 5, RGBMode.RgbModeTrigger]);
    expect(Array.from(sent[4].payload.slice(4, 7))).toEqual([7, 8, 9]);
    expect(rgbFrame.getUint16(7, true)).toBe(1234);

    expect(controller.advanced_keys[0].config.mode).not.toBe(KeyMode.KeyAnalogSpeedMode);
    expect(controller.keymap).toEqual([[0xdead]]);
    expect(controller.dynamic_keys[0].bindings).toEqual([0, 0, 0, 0]);
    expect(controller.rgb_base_config.mode).toBe(RGBBaseMode.RgbBaseModeBlank);
    expect(controller.rgb_configs[0].mode).toBe(RGBMode.RgbModeLinear);
  });

  it('rejects malformed keymap pages and exposes device errors from standalone sends', async () => {
    const controller = new LibampKeyboardController();
    await expect(controller.send_keymap_packet(0, 0, 2, [0x1001])).rejects.toThrow('does not match');
    await expect(controller.send_keymap_packet(0, 0, 28, Array(28).fill(0))).rejects.toThrow('between 0 and 27');

    wireAutoResponder(controller, request => responseFor(request, new Uint8Array([0x11]), { error: true }));
    await expect(controller.send_rgb_packet(0, new RGBConfig())).rejects.toThrow('Device returned error 17');
  });

  it('propagates timeout and disconnect failures from standalone sends', async () => {
    vi.useFakeTimers();
    installMockNavigator();
    const controller = new LibampKeyboardController();
    wireAutoResponder(controller, () => undefined);

    const timedOut = controller.send_rgb_packet(0, new RGBConfig());
    const timeoutExpectation = expect(timedOut).rejects.toThrow('Timeout waiting for packet');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(200);
    await timeoutExpectation;

    const disconnected = controller.send_rgb_packet(0, new RGBConfig());
    await flushPromises();
    controller.disconnect();
    await expect(disconnected).rejects.toThrow('Device disconnected abruptly');
  });

  it('delegates keymap pages to the packet API while keeping RGB config pages batched', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = [new AdvancedKey()];
    controller.keymap = [Array.from({ length: 17 }, (_, index) => 0x1000 + index)];
    const dynamicKey = new DynamicKeyStroke4x4();
    dynamicKey.target_keys_location = [Object.assign(new KeyLocation(), { id: 0 })];
    controller.dynamic_keys = [dynamicKey];
    controller.rgb_configs = Array.from({ length: 8 }, (_, index) => ({
      mode: RGBMode.RgbModeFixed,
      rgb: { red: index, green: index + 1, blue: index + 2 },
      speed: 20 + index,
    }));
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });
    const advancedKeyPackets = vi.spyOn(controller, 'send_advanced_key_packet');
    const keymapPackets = vi.spyOn(controller, 'send_keymap_packet');
    const dynamicKeyPackets = vi.spyOn(controller, 'send_dynamic_key_packet');
    const rgbBasePacket = vi.spyOn(controller, 'send_rgb_base_packet');
    const rgbPackets = vi.spyOn(controller, 'send_rgb_packet');

    await controller.write_advanced_keys();
    await controller.write_keymap();
    await controller.write_dynamic_keys();
    await controller.write_rgb_configs();

    expect(advancedKeyPackets).toHaveBeenCalledWith(0, controller.advanced_keys[0]);
    expect(keymapPackets).toHaveBeenNthCalledWith(1, 0, 0, 16, Array.from({ length: 16 }, (_, index) => 0x1000 + index));
    expect(keymapPackets).toHaveBeenNthCalledWith(2, 0, 16, 1, [0x1010]);
    expect(dynamicKeyPackets).toHaveBeenCalledWith(0, dynamicKey);
    expect(rgbBasePacket).toHaveBeenCalledOnce();
    expect(rgbPackets).not.toHaveBeenCalled();
    const rgbFrames = sent.filter(frame => frame.type === 0x04);
    expect(rgbFrames.map(frame => frame.payload[0])).toEqual([7, 1]);
  });

  it('splits debug requests into five-key packets and merges their update event', async () => {
    const controller = new LibampKeyboardController();
    controller.advanced_keys = Array.from({ length: 6 }, () => new AdvancedKey());
    const sent = [] as ReturnType<typeof decodeFrame>[];
    const device = wireAutoResponder(controller, request => {
      sent.push(request);
      const packet = legacyPacketFromFrame(request);
      const requested = Array.from({ length: packet[2] }, (_, index) => new DataView(packet.buffer).getUint16(7 + index * 10, true));
      const response = new Uint8Array(64);
      response[0] = 0x02;
      response[1] = 0x08;
      response[2] = requested.length;
      const view = new DataView(response.buffer);
      view.setUint32(3, 99, true);
      requested.forEach((id, index) => {
        const base = 7 + index * 10;
        view.setUint16(base, id, true);
        response[base + 2] = 1;
        view.setUint16(base + 4, id + 100, true);
      });
      return responseFor(request, response.slice(2, 7 + requested.length * 10));
    });
    const updates = vi.fn();
    controller.addEventListener('updateDebugData', updates);

    await controller.request_debug_at([0, 1, 2, 3, 4, 5]);

    expect(sent.map(frame => frame.payload[0])).toEqual([5, 1]);
    expect(updates).toHaveBeenCalledOnce();
    expect(updates.mock.calls[0][0].detail).toEqual({ tick: 99, updated_keys: [0, 1, 2, 3, 4, 5] });
    expect(controller.advanced_keys[5].value).toBeCloseTo(105 / 65535, 8);
    expect(device.sentReports).toHaveLength(2);
  });

  it('paginates keymap and macro writes while preserving command contents', async () => {
    const controller = new LibampKeyboardController();
    controller.keymap = [Array.from({ length: 17 }, (_, index) => 0x1000 + index)];
    controller.macros = [[
      ...Array.from({ length: 5 }, (_, index) => ({
        delay: index + 10,
        event: { key_id: index, is_virtual: index % 2 === 0, event: index + 1, keycode: 0x2000 + index },
      })),
    ]];
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });

    await controller.write_keymap();
    await controller.write_macros();

    const keymapFrames = sent.filter(frame => frame.code === 0x01 && frame.type === 0x02);
    expect(keymapFrames).toHaveLength(2);
    expect(keymapFrames.map(frame => frame.payload[3])).toEqual([16, 1]);
    expect(new DataView(keymapFrames[0].payload.buffer, keymapFrames[0].payload.byteOffset).getUint16(4, true)).toBe(0x1000);
    expect(new DataView(keymapFrames[1].payload.buffer, keymapFrames[1].payload.byteOffset).getUint16(4, true)).toBe(0x1010);

    const macroFrames = sent.filter(frame => frame.code === 0x01 && frame.type === 0x0a);
    expect(macroFrames).toHaveLength(2);
    expect(macroFrames.map(frame => new DataView(frame.payload.buffer, frame.payload.byteOffset).getUint16(1, true))).toEqual([4, 1]);
    expect(new DataView(macroFrames[1].payload.buffer, macroFrames[1].payload.byteOffset).getUint32(3, true)).toBe(14);
  });

  it('uses start, payload, and end packets for script uploads', async () => {
    const controller = new LibampKeyboardController();
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });

    await controller.write_script_source('x'.repeat(52));
    await controller.write_script_bytecode(Uint8Array.from({ length: 52 }, (_, index) => index));

    const uploads = sent.filter(frame => frame.code === 0x04);
    const sourceUpload = uploads.filter(frame => frame.type === 0x0c);
    const bytecodeUpload = uploads.filter(frame => frame.type === 0x0d);
    for (const transfer of [sourceUpload, bytecodeUpload]) {
      expect(transfer.map(frame => frame.payload[0])).toEqual([0, 1, 1, 2]);
      expect(transfer[1].payload.slice(7)).toHaveLength(51);
      expect(transfer[2].payload.slice(7)).toHaveLength(transfer === sourceUpload ? 2 : 1);
    }
  });

  it('downloads large script source and bytecode through matching payload offsets', async () => {
    const source = new TextEncoder().encode('print(1)\0');
    const bytecode = Uint8Array.from([9, 8, 7, 6, 5]);
    const controller = new LibampKeyboardController();
    const requestedOffsets: number[] = [];
    wireAutoResponder(controller, request => {
      const typeData = request.type === 0x0c ? source : bytecode;
      const subCommand = request.payload[0];
      if (subCommand === 0) {
        const payload = new Uint8Array(9);
        new DataView(payload.buffer).setUint32(1, typeData.length, true);
        return responseFor(request, payload);
      }
      if (subCommand === 1) {
        const requestView = new DataView(request.payload.buffer, request.payload.byteOffset, request.payload.byteLength);
        const offset = requestView.getUint32(1, true);
        const requestedLength = requestView.getUint16(5, true);
        requestedOffsets.push(offset);
        const chunk = typeData.slice(offset, offset + requestedLength);
        const payload = new Uint8Array(7 + chunk.length);
        const payloadView = new DataView(payload.buffer);
        payload[0] = 1;
        payloadView.setUint32(1, offset, true);
        payloadView.setUint16(5, chunk.length, true);
        payload.set(chunk, 7);
        return responseFor(request, payload);
      }
      return echoResponse(request);
    });

    await controller.read_script_source();
    await controller.read_script_bytecode();

    expect(controller.get_script_source()).toBe('print(1)');
    expect(Array.from(controller.get_script_bytecode())).toEqual(Array.from(bytecode));
    expect(requestedOffsets).toEqual([0, 0]);
  });

  it('encodes public key events before sending them through the queued transport', async () => {
    const controller = new LibampKeyboardController();
    const sent = [] as ReturnType<typeof decodeFrame>[];
    wireAutoResponder(controller, request => {
      sent.push(request);
      return echoResponse(request);
    });
    const event = new KeyboardKeyEvent();
    Object.assign(event, { event: 3, keycode: 0x4567, key_id: 0x1234, is_virtual: true });

    await controller.emit(event, true);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ code: 0x00, type: 0, channel: 0 });
    expect(Array.from(sent[0].payload)).toEqual([3, 0x67, 0x45, 0x34, 0x12, 1, 1]);
  });
});
