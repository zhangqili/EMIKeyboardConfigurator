# emi-keyboard-controller

`emi-keyboard-controller` 是 EMI Keyboard Configurator 的浏览器端键盘控制器库。它将不同键盘的 WebHID 设备筛选、连接、配置读写与布局描述封装为统一的 TypeScript 接口；应用只需根据实际硬件选择对应的控制器类。

本包面向配置器和浏览器应用开发，不需要、也不能在 Node.js 中直接连接真实键盘。libamp 设备使用 64 字节 Raw HID 与固件通信；协议细节见仓库根目录的 [LIBAMP_PROTOCOL.md](../../LIBAMP_PROTOCOL.md)。

## 环境与构建

运行时需要浏览器提供 [WebHID](https://developer.mozilla.org/docs/Web/API/WebHID_API)（即 `navigator.hid`）。请在支持 WebHID 的浏览器和安全上下文中运行；没有该能力时，`detect()` 会返回空设备列表。

控制器源码会导入键盘布局和产品说明的 `?raw` 资源，因此消费者应使用支持该资源查询的浏览器构建工具。该包不适合作为纯 Node.js HID 库。

在本仓库中构建和测试：

```bash
cd EMIKeyboardConfigurator
pnpm install
cd emi-keyboard-controller
pnpm run build
pnpm test
```

构建结果位于 `dist/`，入口为 `dist/index.js` 和 `dist/index.d.ts`。

## 选择控制器

从包根入口导入与硬件匹配的具体控制器。每个控制器的 `detect()` 都带有自己的 VID、PID 和 Usage Page 过滤条件；不要用一个型号的控制器去连接另一个型号。

| 控制器 | 对应硬件/用途 |
| --- | --- |
| `TrinityPadController` | Trinity Pad |
| `OholeoKeyboardController` | Oholeo Keyboard |
| `OholeoKeyboardV2Controller` | Oholeo Keyboard V2 |
| `Zellia80Controller` | Zellia 80 |
| `Zellia60Controller` | Zellia 60 |
| `ZelliaStarlightController` | Zellia Starlight |
| `ANSI104SampleController` | ANSI 104 示例控制器 |
| `DestrezAsuralLeftController` | Destrez Asural 左半键盘 |
| `DestrezAsuralRightController` | Destrez Asural 右半键盘 |
| `Open28SController` | Open28S |
| `AT32KeyboardController` | AT32 Keyboard |

`LibampKeyboardController` 是 libamp 协议的内部基类，并未由包根入口单独导出。需要 libamp 功能时，使用继承它的具体控制器（例如 `OholeoKeyboardV2Controller` 或 `AT32KeyboardController`）。

## 连接、读取、修改与保存

`detect(false)` 会调用浏览器的设备选择器，必须在点击等用户手势的回调中调用。`detect(true)` 不弹出选择器，只返回此前已授权且当前在线的匹配设备，适合应用启动后的恢复连接。

连接成功后，libamp 控制器会自动读取设备版本与配置。应在 `updateData` 事件之后读取或修改配置缓存。

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
    throw new Error("当前浏览器不支持 WebHID");
  }

  const controller = new OholeoKeyboardV2Controller();

  controller.addEventListener("consoleData", ((event: CustomEvent) => {
    const { text } = event.detail as { text: string };
    console.info("键盘日志:", text);
  }) as EventListener);

  controller.addEventListener("deviceDisconnected", () => {
    console.info("键盘已断开");
  });

  // 此函数应由按钮点击等用户手势触发。
  const devices = await controller.detect(false);
  const device = devices[0];
  if (!device) {
    return; // 用户取消选择，或没有匹配的设备。
  }

  const loaded = once(controller, "updateData");
  if (!(await controller.connect(device))) {
    throw new Error("无法打开 HID 设备");
  }
  await loaded;

  // 控制器维护的是本地配置缓存；先修改缓存，再下发。
  const keymap = controller.get_keymap();
  keymap[0][0] = Keycode.Escape;
  controller.set_keymap(keymap);

  const config = controller.get_config();
  config.nkro = true;
  controller.set_config(config);

  await controller.save(); // 下发当前配置、按键、灯光、宏及受支持的脚本。
  controller.flash(); // 请求固件将当前配置持久化；该方法不返回 Promise。

  controller.disconnect();
}

document.querySelector("#connect")?.addEventListener("click", () => {
  void configureKeyboard();
});
```

如果应用已经获得过授权，可用 `await controller.detect(true)` 查询设备；随后仍需对返回的设备调用 `connect(device)`。设备选择器可能返回多个设备，应用应自行让用户选择，而不是固定取第一个。

## 核心接口与配置缓存

所有控制器都实现 `IKeyboardController`。控制器构造时会填充该型号的默认缓存；连接后的自动读取会用设备数据更新缓存。

| 数据 | 读取/设置 | 说明 |
| --- | --- | --- |
| 高级键 | `get_advanced_keys()` / `set_advanced_keys()` | `IAdvancedKey`，包含 `AdvancedKeyConfiguration`、状态与模拟量数据。 |
| RGB 基础与逐键配置 | `get_rgb_base_config()`、`get_rgb_configs()` / 对应 setter | 使用 `IRGBBaseConfig`、`IRGBConfig` 和 `RGBMode`。 |
| 层键位 | `get_keymap()` / `set_keymap()` | `number[][]`；层号为第一维、键位索引为第二维，键码使用 `Keycode` 等枚举。 |
| 动态键 | `get_dynamic_keys()` / `set_dynamic_keys()` | 使用 `IDynamicKey` 和 `DynamicKeyType` 的四种具体结构。 |
| 键盘布尔配置 | `get_config()` / `set_config()` | `KeyboardConfig`，包括 NKRO、Win 锁、调试、报告和控制台开关。 |
| 宏 | `get_macros()` / `set_macros()` | `IMacroAction[][]`，每个动作含延时和 `KeyboardKeyEvent`。 |
| 脚本 | `get_script_source()`、`get_script_bytecode()` / 对应 setter | 是否可用由设备 `get_feature().script_level` 决定。 |
| 配置档位 | `get_profile_num()`、`get_profile_index()`、`set_profile_index()` | 具体数量取决于固件和控制器。 |
| 布局与说明 | `get_layout_json()`、`get_layout_labels()`、`get_readme_markdown()` | 用于配置器渲染键盘布局、可选布局标签和产品说明。 |

常用动作包括：

- `save()`：将当前本地缓存分批发送给设备。
- `flash()`：发送固件保存命令，使设备将当前配置写入持久化存储。
- `request_debug()`、`request_debug_at(ids)`：请求高级键调试数据；`start_debug()` 与 `stop_debug()` 控制调试。
- `calibrate()`、`system_reset()`、`factory_reset()`、`enter_bootloader()`：发送对应的固件操作命令。调用前应根据产品固件能力提供确认界面。

各型号可实现的功能不同。发送脚本、RGB、配置档位或调试请求前，先读取 `get_feature()` 与该型号的默认数据规模；不要把某个型号的键数、层数或宏数量硬编码为通用规则。

## 事件

控制器继承 `EventTarget`。在 `connect()` 前注册监听器，可避免错过自动读取期间的事件。

| 事件 | `detail` | 用途 |
| --- | --- | --- |
| `updateDataStart` | 无 | 设备配置开始自动读取；可显示加载状态。 |
| `updateData` | 无 | 自动读取完成，本地缓存可用于渲染。 |
| `updateDebugData` | `{ tick, updated_keys }` | 调试请求返回后，指出采样时钟和已更新的高级键索引。 |
| `consoleData` | `{ text, data }` | 固件 Console 通道消息；`text` 为 UTF-8 解码文本，`data` 为原始 `Uint8Array`。 |
| `deviceDisconnected` | 无 | 浏览器报告当前 HID 设备物理断开后触发。 |

例如，调试面板可在 `updateDebugData` 后再次从 `get_advanced_keys()` 读取对应项；事件只提供更新索引，实际状态已写入控制器缓存。

## libamp 单包高级用法

继承 libamp 的具体控制器提供以下 `Promise<void>` 方法，适合只写入一个配置项的高级界面。它们直接发送数据包，**不会修改控制器本地缓存**；若之后调用 `save()`，缓存中的值仍会被完整下发并可能覆盖该单项写入。

| 方法 | 用途 |
| --- | --- |
| `send_advanced_key_packet(index, advancedKey)` | 写入一个高级键的完整配置。 |
| `send_keymap_packet(layer, start, length, keymap)` | 从指定层和起始索引写入一段键码。`keymap.length` 必须等于 `length`，且单包最多 27 项。 |
| `send_dynamic_key_packet(index, dynamicKey)` | 写入一个动态键；目标键位置必须满足对应动态键类型的要求。 |
| `send_rgb_base_packet(rgbBaseConfig)` | 写入 RGB 基础配置。 |
| `send_rgb_packet(index, rgbConfig)` | 写入一个 RGB 配置项。 |

```ts
const controller = new OholeoKeyboardV2Controller();
// 完成 detect、connect 与 updateData 后：
await controller.send_keymap_packet(0, 0, 2, [Keycode.Escape, Keycode.Key1]);
```

完整保存使用 `save()`。其中 RGB 项仍按协议连续分页发送，每包最多携带 7 项，而不会逐项调用 `send_rgb_packet()`。

## 错误处理与限制

- 浏览器没有 WebHID 时，设备检测会得到空列表；应用应在调用前检查 `navigator.hid` 并显示兼容性提示。
- `connect()` 可能因用户取消、设备被占用或无法打开而返回 `false`，不要在返回成功前访问设备数据。
- 单包 libamp 方法会在未连接、设备错误响应、响应超时或设备断开时 reject，应使用 `try`/`catch` 处理。批量 `save()` 的子项写入会记录失败后继续发送其余项，因此调用成功并不代表每一项均已被固件确认。
- 设备物理断开会取消正在等待的请求；监听 `deviceDisconnected` 并销毁或禁用对应 UI。
- libamp 当前不实现同步读取接口 `read()`、`read_timeout()` 与 `fetch()`；通过连接后的自动读取、各类 `get_*`/`set_*` 方法和请求式调试 API 操作数据。
- `flash()` 是异步命令投递接口，返回 `void`，不会向调用方报告固件持久化完成或失败。需要可靠提示时，应结合固件能力、Console 消息或重新连接后的读取流程设计确认机制。

## 产品资料与协议

本 README 描述的是通用集成方式。键盘的默认布局、快捷键、已支持功能和固件限制应以具体产品资料为准：

- [Oholeo Keyboard 说明](src/controllers/oholeo_keyboard_controller/README.md)
- [Oholeo Keyboard V2 说明](src/controllers/oholeo_keyboard_v2_controller/README.md)
- [libamp 0.1 协议](../../LIBAMP_PROTOCOL.md)

新增硬件时，应实现或选择对应的具体控制器、提供布局 JSON，并让 `detect()` 使用该硬件的正确 HID 过滤条件；不要修改其他型号控制器的设备筛选规则。
