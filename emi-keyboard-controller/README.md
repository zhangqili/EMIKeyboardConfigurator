# emi-keyboard-controller

[简体中文](README.zh-CN.md)

`emi-keyboard-controller` is the browser-side keyboard controller library used by EMI Keyboard Configurator. It provides a consistent TypeScript interface for WebHID device selection, connection, configuration I/O, and keyboard layout descriptions across different keyboards. Applications only need to select the controller class that matches their hardware.

The package is intended for configurators and browser applications. It neither needs nor can directly connect to physical keyboards from Node.js. libamp devices communicate with firmware over 64-byte Raw HID reports; see the repository-root [LIBAMP_PROTOCOL.md](../../LIBAMP_PROTOCOL.md) for protocol details.

## Requirements and build

At runtime, the browser must provide [WebHID](https://developer.mozilla.org/docs/Web/API/WebHID_API) through `navigator.hid`. Use a WebHID-capable browser in a secure context. When WebHID is unavailable, `detect()` returns an empty device list.

The controller source imports keyboard layouts and product documentation through `?raw` resource imports. Consumers should therefore use a browser build tool that supports this query syntax. This package is not a general-purpose Node.js HID library.

Build and test it in this repository:

```bash
cd EMIKeyboardConfigurator
pnpm install
cd emi-keyboard-controller
pnpm run build
pnpm test
```

Build artifacts are written to `dist/`, with `dist/index.js` and `dist/index.d.ts` as the entry points.

## Choosing a controller

Import the concrete controller that matches the hardware from the package root. Each controller's `detect()` method has its own VID, PID, and Usage Page filters; do not use one model's controller to connect to another model.

| Controller | Hardware / purpose |
| --- | --- |
| `TrinityPadController` | Trinity Pad |
| `OholeoKeyboardController` | Oholeo Keyboard |
| `OholeoKeyboardV2Controller` | Oholeo Keyboard V2 |
| `Zellia80Controller` | Zellia 80 |
| `Zellia60Controller` | Zellia 60 |
| `ZelliaStarlightController` | Zellia Starlight |
| `ANSI104SampleController` | ANSI 104 sample controller |
| `DestrezAsuralLeftController` | Destrez Asural left half |
| `DestrezAsuralRightController` | Destrez Asural right half |
| `Open28SController` | Open28S |
| `AT32KeyboardController` | AT32 Keyboard |

`LibampKeyboardController` is the internal base class for the libamp protocol and is not exported as an independent class from the package root. To use libamp functionality, use a concrete controller that extends it, such as `OholeoKeyboardV2Controller` or `AT32KeyboardController`.

## Connect, load, modify, and save

`detect(false)` invokes the browser's device picker and must be called from a user-gesture callback such as a click handler. `detect(true)` does not open the picker: it only returns matching devices that were previously authorized and are currently online, which is useful when restoring a connection at application startup.

After a successful connection, a libamp controller automatically loads the device version and configuration. Read or modify the configuration cache only after the `updateData` event.

```ts
import {
  Keycode,
  OholeoKeyboardV2Controller,
} from "emi-keyboard-controller";

function once(controller: EventTarget, type: string): Promise<Event> {
  return new Promise((resolve) => {
    controller.addEventListener(type, resolve, { once: true });
  });
}

async function configureKeyboard(): Promise<void> {
  if (!("hid" in navigator)) {
    throw new Error("This browser does not support WebHID");
  }

  const controller = new OholeoKeyboardV2Controller();

  controller.addEventListener("consoleData", ((event: CustomEvent) => {
    const { text } = event.detail as { text: string };
    console.info("Keyboard log:", text);
  }) as EventListener);

  controller.addEventListener("deviceDisconnected", () => {
    console.info("Keyboard disconnected");
  });

  // This function must be called from a user gesture, such as a button click.
  const devices = await controller.detect(false);
  const device = devices[0];
  if (!device) {
    return; // The user cancelled, or no matching device was found.
  }

  const loaded = once(controller, "updateData");
  if (!(await controller.connect(device))) {
    throw new Error("Could not open the HID device");
  }
  await loaded;

  // The controller maintains a local configuration cache. Modify it before sending.
  const keymap = controller.get_keymap();
  keymap[0][0] = Keycode.Escape;
  controller.set_keymap(keymap);

  const config = controller.get_config();
  config.nkro = true;
  controller.set_config(config);

  await controller.save(); // Send configuration, keys, lighting, macros, and supported scripts.
  controller.flash(); // Ask firmware to persist the current configuration; this method returns no Promise.

  controller.disconnect();
}

document.querySelector("#connect")?.addEventListener("click", () => {
  void configureKeyboard();
});
```

When the application already has permission, use `await controller.detect(true)` to look up devices and then call `connect(device)` on a returned device. The device picker may return more than one device, so a production UI should let the user choose instead of always selecting the first result.

## Core interface and configuration cache

Every controller implements `IKeyboardController`. Constructors populate a model-specific default cache, and the automatic load after connecting updates that cache with device data.

| Data | Read / set | Description |
| --- | --- | --- |
| Advanced keys | `get_advanced_keys()` / `set_advanced_keys()` | `IAdvancedKey`, including `AdvancedKeyConfiguration`, state, and analog data. |
| Base and per-key RGB | `get_rgb_base_config()`, `get_rgb_configs()` / matching setters | Uses `IRGBBaseConfig`, `IRGBConfig`, and `RGBMode`. |
| Layer keymaps | `get_keymap()` / `set_keymap()` | `number[][]`; the first dimension is the layer and the second is the key index. Use `Keycode` and related enums for key codes. |
| Dynamic keys | `get_dynamic_keys()` / `set_dynamic_keys()` | Uses `IDynamicKey` and the four concrete forms selected by `DynamicKeyType`. |
| Keyboard boolean configuration | `get_config()` / `set_config()` | `KeyboardConfig`, including NKRO, Win lock, debug, reporting, and console switches. |
| Macros | `get_macros()` / `set_macros()` | `IMacroAction[][]`; each action contains a delay and a `KeyboardKeyEvent`. |
| Scripts | `get_script_source()`, `get_script_bytecode()` / matching setters | Availability is determined by `get_feature().script_level`. |
| Configuration profiles | `get_profile_num()`, `get_profile_index()`, `set_profile_index()` | The available number depends on the firmware and controller. |
| Layout and product information | `get_layout_json()`, `get_layout_labels()`, `get_readme_markdown()` | Used by configurators to render the layout, optional layout labels, and product information. |

Common operations include:

- `save()`: sends the current local cache to the device in batches.
- `flash()`: sends the firmware save command to persist the current configuration.
- `request_debug()` and `request_debug_at(ids)`: request advanced-key debug data; `start_debug()` and `stop_debug()` control debugging.
- `calibrate()`, `system_reset()`, `factory_reset()`, and `enter_bootloader()`: send the corresponding firmware commands. Present a confirmation UI according to the product firmware's capabilities before calling them.

Supported features vary by model. Before sending scripts, RGB settings, profile changes, or debug requests, inspect `get_feature()` and the model's default data sizes. Do not treat a key count, layer count, or macro count from one model as a universal value.

## Events

Controllers extend `EventTarget`. Register listeners before `connect()` to avoid missing events emitted during the automatic load.

| Event | `detail` | Purpose |
| --- | --- | --- |
| `updateDataStart` | None | The automatic configuration load has started; use it to show loading state. |
| `updateData` | None | Automatic loading is complete and the local cache is ready to render. |
| `updateDebugData` | `{ tick, updated_keys }` | A debug request completed; provides the sample tick and updated advanced-key indices. |
| `consoleData` | `{ text, data }` | A firmware Console-channel message. `text` is UTF-8-decoded text and `data` is the raw `Uint8Array`. |
| `deviceDisconnected` | None | The browser reported that the active HID device was physically disconnected. |

For example, after `updateDebugData`, a debug panel can read the relevant items from `get_advanced_keys()` again. The event only identifies the updated indices; the controller cache already holds the updated state.

## Advanced libamp single-packet operations

Concrete controllers that extend libamp expose the following `Promise<void>` methods for advanced UIs that need to write a single configuration item. They send a packet directly and **do not update the controller's local cache**. A later `save()` sends the cached values in full and may overwrite a single-packet update.

| Method | Purpose |
| --- | --- |
| `send_advanced_key_packet(index, advancedKey)` | Writes a complete advanced-key configuration. |
| `send_keymap_packet(layer, start, length, keymap)` | Writes a keycode segment from a layer and starting index. `keymap.length` must equal `length`, and one packet can contain at most 27 entries. |
| `send_dynamic_key_packet(index, dynamicKey)` | Writes one dynamic key; its target key locations must satisfy the selected dynamic-key type. |
| `send_rgb_base_packet(rgbBaseConfig)` | Writes the base RGB configuration. |
| `send_rgb_packet(index, rgbConfig)` | Writes one RGB configuration entry. |

```ts
const controller = new OholeoKeyboardV2Controller();
// After detect, connect, and updateData:
await controller.send_keymap_packet(0, 0, 2, [Keycode.Escape, Keycode.Key1]);
```

Use `save()` for a complete save. RGB entries are still sent in consecutive protocol pages of at most seven entries rather than by calling `send_rgb_packet()` once per entry.

## Errors and limitations

- If the browser does not support WebHID, detection returns an empty list. Check `navigator.hid` first and show a compatibility message.
- `connect()` can return `false` when the user cancels, the device is in use, or it cannot be opened. Do not access device data until it succeeds.
- libamp single-packet methods reject when disconnected, on a device error response, on a response timeout, or when the device is unplugged; handle them with `try`/`catch`. Individual operations inside batch `save()` log their failures and continue with later items, so a resolved call does not prove that every item was acknowledged by firmware.
- A physical disconnect cancels pending requests. Listen for `deviceDisconnected` and disable or dispose the associated UI.
- libamp currently does not implement the synchronous `read()`, `read_timeout()`, or `fetch()` APIs. Use the automatic load after connecting, the `get_*`/`set_*` methods, and request-based debug APIs instead.
- `flash()` queues an asynchronous command and returns `void`; it does not report whether firmware persistence completed or failed. For reliable feedback, design a confirmation flow around firmware capabilities, Console messages, or a read after reconnecting.

## Product documentation and protocol

This README describes the common integration workflow. Default layouts, shortcuts, supported features, and firmware limitations are specific to each product:

- [Oholeo Keyboard documentation](src/controllers/oholeo_keyboard_controller/README.md)
- [Oholeo Keyboard V2 documentation](src/controllers/oholeo_keyboard_v2_controller/README.md)
- [libamp 0.1 protocol](../../LIBAMP_PROTOCOL.md)

When adding hardware, implement or select its concrete controller, provide its layout JSON, and make `detect()` use the correct HID filters. Do not change another model's device-selection rules.
