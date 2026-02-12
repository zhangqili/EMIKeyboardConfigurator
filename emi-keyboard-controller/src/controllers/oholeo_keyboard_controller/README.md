# Oholeo Keyboard

磁轴键盘，可以支持RT功能。带上位机驱动。板载蜂鸣器，带电磁阀驱动。

硬件工程: [https://oshwhub.com/dwdwdw37/keyboard_origin](https://oshwhub.com/dwdwdw37/keyboard_origin)

固件工程: [https://github.com/zhangqili/oholeo-keyboard-firmware](https://github.com/zhangqili/oholeo-keyboard-firmware)

配置器: [https://github.com/zhangqili/EMIKeyboardConfigurator](https://github.com/zhangqili/EMIKeyboardConfigurator)

旧版配置器(固件版本v1.0): [https://github.com/dwdwdw5163/oholeo_keyboard_software](https://github.com/dwdwdw5163/oholeo_keyboard_software)

演示视频: [https://www.bilibili.com/video/BV1kK411x7Po](https://www.bilibili.com/video/BV1kK411x7Po)

下单教程: [https://www.bilibili.com/video/BV1n94y1u7g1](https://www.bilibili.com/video/BV1n94y1u7g1)

复现或使用过程中遇到问题可加QQ群或去oholeo-keyboard-firmware仓库提issue

<img src="https://image.lceda.cn/oshwhub/pullImage/74b4eb7baf0c4d73b46bc9cb39ff5efd.jpg" width="33%">

## 特性
+ 支持传统触发、快速触发(Rapid Trigger)、差速触发三种模式
+ 支持Mod tap、Mutex(类似Rappy Snappy)、DKS等高级按键
+ 支持绑定键盘，鼠标，媒体控制，系统控制按键
+ 支持板载Flash切换配置
+ 支持最多5层按键绑定
+ 支持切换6键无冲与全键无冲模式
+ 支持模拟游戏摇杆与按键，可通过Steam重映射
+ 支持模拟MIDI键盘
+ 支持低延迟模式，该模式会关闭大部分灯效
+ 配套免驱配置器
+ 支持Windows动态光效(实验性，需要在keyboard_conf.h中取消注释LIGHTING_ENABLE，可能会干扰ADC采样)
+ 支持硬件录制播放按键宏
+ 核心函数经过封装，便于移植
+ ~~没有主机也能玩贪食蛇~~

## TODO
+ 免映射模拟游戏手柄
+ 使用蜂鸣器播放MIDI音符

## 使用说明

### 上电至灯效结束后

|按键|功能|
|---|---|
|`Esc`|进入Bootloarder|
|`FN`|清除所有数据，恢复出厂设置并重启|
|`Backspace`|恢复默认配置并重启|

### 默认快捷键

|按键|功能|
|---|---|
|`FN`+`DEL`+`D`|进入Debug状态|
|`FN`+`DEL`+`B`|切换使能蜂鸣器|
|`FN`+`DEL`+`M`|切换使能电磁阀|
|`FN`+`DEL`+`N`|恢复默认状态，取消使能蜂鸣器，取消使能电磁阀，关闭低延迟模式，开启全键无冲|
|`FN`+`DEL`+`R`|重启|
|`FN`+`DEL`+`F`|清除所有数据并恢复出厂设置|
|`FN`+`DEL`+`S`|将当前配置写入至Flash|
|`FN`+`DEL`+`L`|切换低延迟模式|
|`FN`+`DEL`+`T`|切换全键无冲与六键无冲模式|
|`FN`+`DEL`+`Esc`|进入Bootloader|
|`FN`+`DEL`+`Backspace`|恢复默认配置|
|`FN`+`DEL`+`1`|使用配置文件0|
|`FN`+`DEL`+`2`|使用配置文件1|
|`FN`+`DEL`+`3`|使用配置文件2|
|`FN`+`DEL`+`4`|使用配置文件3|
|`FN`+`DEL`+`CapsLock`|在键盘上玩贪食蛇|
|`FN`+`DEL`+`Win`|切换锁定Win键|

### 贪食蛇快捷键

|按键|功能|
|---|---|
|`Backspace`|退出|
|`方向键`|~~应该不用说~~|
|`Right Shift`|减速|
|`DEL`|加速|
|`Space`|暂停|


## 更新历史

2025-11-20：将部分元件替换为SMT基础库中的元件

2024-01-06：初版
