# LibampKeyboardController API Reference

`LibampKeyboardController` is the browser-side base controller for keyboards that implement libamp 0.1 over 64-byte Raw HID reports. It supplies AmpFrame v2 transport, serialized request/response handling, configuration caching, data loading, bulk persistence, debug requests, and large script transfers.

For application-level controller selection and the general WebHID workflow, see the [package README](../../../README.md). This document describes the API exposed by the libamp base controller. Wire layouts, channels, frame flags, and packet offsets are specified in the repository-root [LIBAMP_PROTOCOL.md](../../../../../LIBAMP_PROTOCOL.md), not duplicated here.

The domain types referenced below (`IAdvancedKey`, `IRGBConfig`, `KeyboardConfig`, `FirmwareVersion`, `KeyboardKeyEvent`, and others) are declared in [interface.ts](https://github.com/zhangqili/EMIKeyboardConfigurator/blob/main/emi-keyboard-controller/src/interface.ts).

## Class model and intended use

```text
KeyboardController
  └─ LibampKeyboardController
       └─ Concrete keyboard controller (for example, OholeoKeyboardV2Controller)
```

`LibampKeyboardController` extends `KeyboardController` and is exported by its source module, but it is **not** exported from the package root. Applications should instantiate a concrete, hardware-specific controller from the package root. The base class is intended for in-repository controller implementations and advanced integrations that already know the target keyboard's HID identity and default configuration shape.

The controller uses WebHID and browser globals (`navigator.hid`, `window`, and `EventTarget`); it is not a Node.js HID implementation. Automatic configuration loading accepts firmware versions with major version `0` and minor version `1`.

## Implementing a concrete controller

A concrete controller supplies the model-specific HID filter, default cache contents, and layout metadata. It may also adjust the public feature descriptor and profile count.

```ts
import { LibampKeyboardController } from "../libamp_keyboard_controller/controller";
import { detectHIDDevice, RGBBaseConfig } from "../../interface";

export class ExampleKeyboardController extends LibampKeyboardController {
  constructor() {
    super();
    this.profile_number = 1;
    this.feature.advanced_key_flag = true;
    this.feature.rgb_flag = false;
    this.reset_to_default();
  }

  async detect(silent = false): Promise<HIDDevice[]> {
    return detectHIDDevice(
      { vendorId: 0x1234, productId: 0x5678, usagePage: 0xff60 },
      silent,
    );
  }

  reset_to_default(): void {
    super.reset_to_default();
    this.rgb_base_config = new RGBBaseConfig();
    this.keymap = [[/* model-specific Keycode values */]];
    this.advanced_keys = [/* model-specific AdvancedKey values */];
    this.rgb_configs = [];
    this.dynamic_keys = [];
    this.macros = [[]];
  }

  get_layout_json(): string {
    return "[]"; // Return the model's layout JSON text.
  }
}
```

Override or configure the following members for every model:

| Member | Responsibility |
| --- | --- |
| `detect(silent)` | Match the model's VID, PID, and `0xff60` usage page. `silent = false` requests browser permission; `true` only returns previously authorized devices. |
| `reset_to_default()` | Allocate model-sized `advanced_keys`, `rgb_configs`, `keymap`, `dynamic_keys`, and `macros`, and provide sensible defaults. |
| `get_layout_json()` | Return the model layout JSON consumed by the configurator. |
| `get_layout_labels()` and `get_readme_markdown()` | Optionally provide layout labels and model documentation. |
| `profile_number` | Set the number of firmware configuration profiles. |
| `feature` | Declare controller capabilities: `advanced_key_flag`, `rgb_flag`, and `script_level`. These flags control the automatic read/save workflow. |

Use the cache getter and setter methods rather than relying on direct mutation of the public fields. The key cache fields are `advanced_keys`, `rgb_base_config`, `rgb_configs`, `keymap`, `dynamic_keys`, `macros`, `script_source`, and `script_bytecode`.

## Connection and transport

| Method | Returns | Behavior |
| --- | --- | --- |
| `connect(device: HIDDevice)` | `Promise<boolean>` | Opens `device` if necessary, installs `inputreport` and WebHID disconnect listeners, and starts asynchronous version/configuration loading. `true` means the device was opened or was already open; configuration loading continues after the promise resolves. |
| `disconnect()` | `void` | Removes listeners, closes the active device, rejects pending and queued requests, and clears reload state. Safe to call after a physical disconnect. |
| `get_connection_state()` | `boolean` | Returns whether the controller currently holds a device reference. Use the successful result of `connect()` as the open-device confirmation. |
| `write(buf: Uint8Array)` | `number` | Converts a legacy libamp packet to an unacknowledged AmpFrame and sends it. Returns `buf.byteLength`; transport failures are logged asynchronously instead of being returned to the caller. |
| `read(buf)` | `number` | Not implemented; throws. |
| `read_timeout(buf, timeout)` | `number` | Not implemented; throws. |
| `fetch()` | `void` | Not implemented; throws. |

`connect()` calls `request()` without awaiting it. Register event listeners before connecting and wait for `updateData` before using device-loaded cache values. Requests that require a response are serialized internally so one response cannot be consumed by another request.

### Events

The controller inherits `addEventListener()`, `removeEventListener()`, and `dispatchEvent()` from `KeyboardController`.

| Event | Detail | When it is dispatched |
| --- | --- | --- |
| `updateDataStart` | none | A supported version was accepted and a configuration reload begins. |
| `updateData` | none | `read_data()` completed and updated the local cache. |
| `updateDebugData` | `{ tick: number; updated_keys: number[] }` | A debug response updated one or more advanced-key cache entries. |
| `consoleData` | `{ text: string; data: Uint8Array }` | A Console-channel frame arrives. `text` is UTF-8 decoded; `data` is the raw payload. |
| `deviceDisconnected` | none | The active HID device is physically disconnected. Pending requests are cancelled first. |

Invalid, non-v2, or malformed frames are dropped and logged; they do not produce an application event.

## Configuration cache API

The following methods are inherited from `KeyboardController`. Getters return the current local cache; setters replace the associated cache. They do not communicate with the device until a read/write method or `save()` is called.

| Data | Getter | Setter | Type |
| --- | --- | --- | --- |
| Advanced keys | `get_advanced_keys()` | `set_advanced_keys(keys)` | `IAdvancedKey[]` |
| RGB base configuration | `get_rgb_base_config()` | `set_rgb_base_config(config)` | `IRGBBaseConfig` |
| Per-key RGB configuration | `get_rgb_configs()` | `set_rgb_configs(configs)` | `IRGBConfig[]` |
| Layer keymap | `get_keymap()` | `set_keymap(keymap)` | `number[][]` |
| Dynamic keys | `get_dynamic_keys()` | `set_dynamic_keys(keys)` | `IDynamicKey[]` |
| Keyboard options | `get_config()` | `set_config(config)` | `KeyboardConfig` |
| Macros | `get_macros()` | `set_macros(macros)` | `IMacroAction[][]` |
| Script source | `get_script_source()` | `set_script_source(source)` | `string` |
| Script bytecode | `get_script_bytecode()` | `set_script_bytecode(bytecode)` | `Uint8Array` |

`set_advanced_keys()` normalizes supplied values into `AdvancedKey` instances. Other setters retain the supplied value or array as the controller cache.

### Capability, layout, and firmware metadata

| Method | Returns | Notes |
| --- | --- | --- |
| `get_feature()` | `IFeature` | The controller's capability descriptor. Its values determine which data groups `read_data()` and `save()` process. |
| `get_firmware_version()` | `FirmwareVersion` | The most recently parsed version; initial value is `{ major: 0, minor: 0, patch: 0, info: "" }`. |
| `get_profile_num()` | `number` | Current `profile_number`. |
| `get_profile_index()` | `number` | Current controller profile index. |
| `get_layout_json()` | `string` | Layout JSON; concrete controllers should override it. |
| `get_layout_labels()` | `string[][]` | Optional model-specific labels. |
| `get_readme_markdown()` | `string` | Model documentation. The base implementation returns `"Powered by libamp"`. |

## Loading, reading, and writing configuration

### Lifecycle methods

| Method | Returns | Behavior |
| --- | --- | --- |
| `request_version()` | `Promise<FirmwareVersion \| null>` | Queries and parses the firmware version. Errors are logged and result in `null`. |
| `request()` | `Promise<void>` | Requests the version and, for supported `0.1.x` firmware, loads the complete configuration. Errors are logged. Normally invoked by `connect()`. |
| `read_data()` | `Promise<void>` | Reads the configuration cache in dependency order, honoring `feature`, current cache sizes, and `profile_number`, then dispatches `updateData`. |
| `save()` | `Promise<void>` | Writes configuration, advanced keys, RGB, keymap, dynamic keys, macros, and enabled scripts from the local cache. It does not persist the result to non-volatile storage. |
| `flash()` | `void` | Queues the firmware save command that requests persistence. It cannot be awaited and does not report completion to the caller. |

`read_data()` reads keyboard options first, then advanced keys, RGB, keymap, dynamic keys, macros, the selected profile, and enabled scripts. The exact groups depend on the model's feature flags and the cache arrays supplied by `reset_to_default()`.

### Explicit configuration I/O

The methods below operate on the existing cache and are normally used through `read_data()` or `save()`. Reads deserialize successful responses into the cache; writes serialize the cache into protocol pages.

| Data group | Read | Write | Paging / behavior |
| --- | --- | --- | --- |
| Keyboard options | `read_config()` | `write_config()` | Sends all `KeyboardConfigCode` values in one configuration request. |
| Advanced keys | `read_advanced_keys()` | `write_advanced_keys()` | One request per advanced-key index. |
| RGB base and per-key RGB | `read_rgb_configs()` | `write_rgb_configs()` | Base configuration plus consecutive per-key pages of at most **7** RGB entries. |
| Layer keymap | `read_keymap()` | `write_keymap()` | Consecutive pages of **16** keycodes per layer. |
| Dynamic keys | `read_dynamic_keys()` | `write_dynamic_keys()` | One request per dynamic-key index. |
| Macros | `read_macros()` | `write_macros()` | Four macro actions per page. |
| Active profile | `read_config_index()` | `set_profile_index(index)` | Profile switching uses a keyboard operation, then schedules a reload after acknowledgement. |

Most bulk reads and writes catch individual transport failures, log them, and continue with later items or pages. Consequently, their returned promise can resolve even though some device operations failed. `save()` inherits this best-effort behavior for those groups.

### Profiles and firmware operations

| Method | Returns | Behavior |
| --- | --- | --- |
| `set_profile_index(index)` | `Promise<void>` | Stores `index`, requests a firmware profile switch, and schedules a reload after acknowledgement. A failed request is logged and clears the pending-reload flag; the local index is not rolled back. |
| `calibrate()` | `void` | Queues the firmware calibration operation. |
| `system_reset()` | `void` | Queues a firmware reboot. |
| `factory_reset()` | `void` | Queues the firmware factory-reset operation. |
| `enter_bootloader()` | `void` | Queues entry into the bootloader. |

The `void` firmware-operation methods enqueue commands internally and do not expose acknowledgement or failure to their caller. Application UIs should confirm destructive operations before invoking them and use product-specific feedback to determine completion.

## Debug and virtual key events

| Method | Returns | Behavior |
| --- | --- | --- |
| `request_debug()` | `Promise<void>` | Requests debug data for every configured advanced-key index. |
| `request_debug_at(ids)` | `Promise<void>` | Requests debug data only for the supplied key indices. An empty array performs no request. |
| `start_debug()` | `void` | Queues the firmware command that enables debug reporting. |
| `stop_debug()` | `void` | Queues the firmware command that disables debug reporting. |
| `emit(event, use_keymap)` | `Promise<void>` | Sends a `KeyboardKeyEvent`. `use_keymap` asks firmware to apply the active keymap when processing the event. Failures are logged and the promise resolves. |

Debug requests use pages of up to five keys. A request is skipped while configuration reload or a profile switch is pending, and concurrent debug requests are suppressed. Successful responses update `advanced_keys` before `updateDebugData` is emitted.

## Single-packet write API

These methods issue one acknowledged request and return `Promise<void>`. They use a fresh packet buffer and **do not update the controller cache**. Update the matching cache first if a later `save()` must preserve the change.

| Method | Arguments | Constraints and effect |
| --- | --- | --- |
| `send_advanced_key_packet(index, advancedKey)` | `number`, `IAdvancedKey` | Serializes the complete advanced-key configuration for one index. |
| `send_keymap_packet(layer, start, length, keymap)` | `number`, `number`, `number`, `number[]` | Writes the exact `keymap` segment at `start`. `length` must be an integer from `0` to **27**, and `keymap.length` must equal `length`; invalid input rejects with `RangeError`. |
| `send_dynamic_key_packet(index, dynamicKey)` | `number`, `IDynamicKey` | Serializes a Stroke, ModTap, ToggleKey, or Mutex dynamic key. Required target key locations must exist for the chosen type. |
| `send_rgb_base_packet(rgbBaseConfig)` | `IRGBBaseConfig` | Writes the RGB base configuration. |
| `send_rgb_packet(index, rgbConfig)` | `number`, `IRGBConfig` | Writes exactly one per-key RGB configuration. |

Direct packet methods reject if the device is not connected, a response has the protocol error flag, the request times out, or the device disconnects. The normal acknowledgement timeout is 200 ms. `send_keymap_packet()` and missing dynamic-key targets are additionally validated before transport.

`write_rgb_configs()` intentionally does not call `send_rgb_packet()` in a loop: it keeps the more efficient seven-entry RGB page encoding.

## Scripts and large data

| Method | Returns | Behavior |
| --- | --- | --- |
| `write_script_source(sourceCode)` | `Promise<void>` | UTF-8 encodes source with a terminating NUL and sends it through the Large Data protocol. |
| `read_script_source()` | `Promise<void>` | Reads Large Data source, strips data after the first NUL or `0xff`, and updates `script_source`. |
| `write_script_bytecode(bytecode)` | `Promise<void>` | Sends bytecode through the Large Data protocol. |
| `read_script_bytecode()` | `Promise<void>` | Reads Large Data bytecode and updates `script_bytecode` when data is returned. |

`save()` sends script source when `feature.script_level` is not `Disable`; it also sends bytecode when the level is `AOT`. Large-data methods can reject on normal request failures, unlike the best-effort per-item bulk configuration methods.

## RequestQueue

`RequestQueue` is exported from the same module and serializes asynchronous tasks. `LibampKeyboardController` uses a private instance to ensure that only one acknowledged HID request is in flight at a time.

| Method | Returns | Behavior |
| --- | --- | --- |
| `add<T>(task: () => Promise<T>)` | `Promise<T>` | Adds `task` to the FIFO queue. The returned promise resolves or rejects with the task result after all earlier tasks finish. |
| `clear(reason = new Error("Queue cleared"))` | `void` | Rejects queued tasks that have not started and removes them. It does not cancel a task already executing. |

Use `RequestQueue` only when an integration owns all operations in that queue. Do not mix an external queue with the controller's private request sequencing to bypass controller serialization.

## Failure model and API boundary

- AmpFrame decoding drops malformed frames and unknown/duplicate responses rather than exposing low-level callbacks.
- `disconnect()` rejects pending response waits and tasks still waiting in the internal queue with a disconnect error.
- Direct single-packet and Large Data calls expose transport failures through rejected promises. Handle them with `try`/`catch`.
- Most page-oriented read/write methods log an individual failure and continue. Inspect application state or firmware feedback when a complete write must be verified.
- `packet_process*`, legacy packet conversion, frame codecs, channel selection, and request sequencing are implementation details. Although TypeScript currently exposes some packet-processing methods without a `private` modifier, they are not stable consumer APIs. Use the typed methods documented here and the [libamp protocol](../../../../../LIBAMP_PROTOCOL.md) for interoperability work.
