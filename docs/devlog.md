# 开发踩坑记录

本文档记录 Monitor 项目从零开始开发过程中遇到的所有问题及解决方案，用于学习参考。

---

## 1. Zephyr 环境搭建

### 问题：pip install west 报 externally-managed-environment

**现象：** Ubuntu 24.04 上 `pip3 install west` 报错，系统 Python 被标记为外部管理。

**原因：** PEP 668 规定系统 Python 不允许直接 pip 安装包，防止破坏系统依赖。

**解决：** 创建 Python 虚拟环境：
```bash
python3 -m venv ~/zephyrproject/.venv
source ~/zephyrproject/.venv/bin/activate
pip install west
```
在 `~/.bashrc` 里自动激活。

---

## 2. Zephyr 自定义板级支持

### 问题：west build 找不到自定义 board

**现象：** `west build -b ctrboard_h7` 报 `No board named 'ctrboard_h7' found`。

**原因：** 自定义板子定义在工程目录的 `boards/` 下，但 west 默认只搜索 Zephyr 源码树里的板子。

**解决：** 通过 `-DBOARD_ROOT` 告诉 CMake 去哪找：
```bash
west build -b ctrboard_h7 <工程路径> -- -DBOARD_ROOT=<工程路径>
```

### 问题：设备树 cdc_acm_uart0 未定义

**现象：** `devicetree error: undefined node label 'cdc_acm_uart0'`

**原因：** USB CDC ACM UART 节点不是 SoC 自带的，需要在板子的 `.dts` 里手动在 `usbotg_hs` 节点下定义。

**解决：**
```dts
zephyr_udc0: &usbotg_hs {
    ...
    cdc_acm_uart0: cdc_acm_uart0 {
        compatible = "zephyr,cdc-acm-uart";
    };
};
```

---

## 3. 烧录调试

### 问题：pyOCD 无法连接 DAPLink (Horco CMSIS-DAP)

**现象：** `Timeout reading from probe`，然后 `AssertionError`。

**原因：** 这款 Horco DAPLink 调试器与 pyOCD 的 pyusb backend 不兼容，通信超时后触发了 pyOCD 内部 bug。

**解决：** 改用 OpenOCD，它通过 CMSIS-DAPv2 协议直接连接，兼容性更好：
```cmake
# board.cmake
board_runner_args(openocd
  --target-handle=_CHIPNAME.cpu0
  "--config=interface/cmsis-dap.cfg"
  "--config=target/stm32h7x.cfg"
)
include(${ZEPHYR_BASE}/boards/common/openocd-stm32.board.cmake)
```

### 问题：OpenOCD 报 Debug Adapter has to be specified

**现象：** `west flash` 报错 `Error: Debug Adapter has to be specified`。

**原因：** west 调用了 Zephyr SDK 内置的 OpenOCD，但没传 adapter 配置文件（`cmsis-dap.cfg`）。

**解决：** 在 `board.cmake` 里显式传 `--config` 参数，指定 interface 和 target 配置文件。

---

## 4. BMI088 SPI 驱动 (Zephyr)

### 问题：SPI 读到全零 (Accel chip ID = 0x00)

这个问题折腾了最久，涉及三层原因：

#### 4.1 SPI 通信方式不对

**现象：** 逐字节 `spi_transceive` 读 BMI088 寄存器，返回全零。

**原因：** Zephyr SPI API 的 `spi_transceive` 是全双工同时收发。BMI088 加速度计 SPI 协议要求：发送寄存器地址后，需要一个 **dummy byte**（等待数据准备），然后才能读到数据。逐字节调用会在每个字节之间产生 CS 间隙。

**解决：** 改成一次 `spi_transceive` 发送完整序列：
```c
// 加速度计读：[reg|0x80, dummy, data...] 一次性收发
uint8_t tx[3] = { reg | 0x80, 0x00, 0x00 };
uint8_t rx[3];
// ... spi_transceive 一次完成
return rx[2]; // 数据在第 3 字节
```

#### 4.2 STM32H7 PC2_C 模拟开关未打开

**现象：** 改完 SPI 方式后仍然读到 0x00。

**原因：** STM32H723 的 PC2 引脚通过模拟开关（analog switch）连接，上电后默认关闭。MISO 接在 PC2_C 上，需要通过 SYSCFG_PMCR 寄存器打开开关。

**解决：** 在 SPI 初始化前手动写 SYSCFG 寄存器：
```c
volatile uint32_t *syscfg_pmcr = (volatile uint32_t *)0x58000404;
*syscfg_pmcr |= (1 << 9);  // PC2SO: 连通 PC2_C 到 PC2
```

**教训：** H7 系列的 _C 后缀引脚（PC2_C, PC3_C）都有这个问题，这在普通 STM32 上不会遇到。

#### 4.3 SPI 模式不匹配

**现象：** 打开模拟开关后，Mode 3 (CPOL=1 CPHA=1) 还是读不到。

**原因：** Zephyr STM32 SPI 驱动对 Mode 3 的时钟初始状态处理可能与 HAL 不同。

**解决：** 改用 Mode 0 (CPOL=0 CPHA=0)，BMI088 同时支持 Mode 0 和 Mode 3，换成 Mode 0 后立即读到正确的 chip ID。

---

## 5. USB CDC 通信

### 问题：usb_enable 返回错误，固件直接退出

**现象：** 固件启动后 USB 枚举成功，但 `usb_enable()` 返回非零值，`main` 直接 return。

**原因：** `prj.conf` 里配了 `CONFIG_USB_DEVICE_INITIALIZE_AT_BOOT=y`，USB 在内核启动时就已经初始化了。再次调用 `usb_enable()` 会返回 "already enabled" 错误。

**解决：** 忽略 `usb_enable` 的返回值：
```c
usb_enable(NULL); // 可能返回错误，忽略
```

### 问题：printk 输出看不到

**现象：** USB CDC 枚举成功，但 `cat /dev/ttyACM0` 没有任何输出。

**原因：** USB CDC 需要主机端打开端口并设置 DTR 信号后，设备端的 `uart_poll_out` 才会实际发送数据。`cat` 不会设置 DTR。

**解决：** 用 `picocom` 或 Python `serial.Serial(dtr=True)` 打开端口。后续改为固定延时 `k_msleep(3000)` 等待枚举完成，不再依赖 DTR。

---

## 6. 上位机串口数据接收

### 问题：tauri-plugin-serialplugin listen 收到数据但格式不对

**现象：** `listen` 回调被调用（`cb` 计数在涨），但帧解析器输出 0 帧。

**原因：** 插件的 `listen(callback, false)` 虽然传了 `isDecode=false`（二进制模式），但实际返回的数据仍然经过了 UTF-8 编码处理。二进制数据中的 `0xAA 0x55` 等字节被 UTF-8 解码器破坏，导致帧头匹配失败。

**解决：** 在回调里对收到的数据做多格式兼容处理：
```typescript
let bytes: Uint8Array;
if (rawData instanceof Uint8Array) {
  bytes = rawData;
} else if (rawData?.data) {
  bytes = new Uint8Array(rawData.data);
} else if (typeof rawData === 'string') {
  bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i) & 0xFF;
  }
}
```

---

## 7. 协议帧解析

### 问题：RangeError: Length out of range of buffer（致命 bug）

**现象：** 上位机连接成功，`listen` 回调在触发，但界面无数据显示。Console 刷屏 `RangeError: Length out of range of buffer`。

**原因：** `protocol.ts` 中 raw IMU 帧（type=0x02, payload=24 字节）的 `gz` 字段偏移写成了 **24**，但 payload 只有 24 字节（有效 index 0-23），正确偏移应该是 **20**。

```typescript
// 错误
gz: readFloat32(payload, 24),  // ← 越界！payload[24] 不存在
// 正确
gz: readFloat32(payload, 20),
```

**影响：** 每次收到 raw IMU 帧就抛异常，异常被 catch 吞掉后静默失败。由于姿态帧和原始帧交替发送（每 5ms 一对），异常几乎连续触发，导致看起来完全没有数据。

**修复：** 改正偏移，并给 `readFloat32` 加越界保护：
```typescript
function readFloat32(buf: Uint8Array, offset: number): number {
  if (offset + 4 > buf.length) return 0;
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 4);
  return view.getFloat32(0, true);
}
```

**教训：** 
1. 二进制协议的字段偏移必须仔细对照文档逐字节核对
2. DataView 越界不会返回 0 而是直接抛异常
3. 异常在回调里被吞掉时，表现为"没有数据"而不是明显的报错

---

## 8. Tauri 开发经验

### 串口插件权限

Tauri 的插件需要在 `capabilities/default.json` 里声明权限：
```json
"permissions": ["core:default", "opener:default", "serialplugin:default"]
```
同时 Rust 端要注册插件：
```rust
.plugin(tauri_plugin_serialplugin::init())
```

### Linux udev 规则

没有 udev 规则时，普通用户无法访问 USB 串口设备。需要添加：
```
SUBSYSTEM=="usb", ATTR{idVendor}=="faed", ATTR{idProduct}=="4870", MODE="0666"
```

### 热更新

`pnpm tauri dev` 启动后，修改前端代码（`.tsx`、`.css`、`.ts`）保存后会自动热更新。修改 Rust 代码需要重新编译。

---

## 调试方法论总结

1. **分层排查**：USB 枚举 → 串口打开 → 数据接收 → 帧解析 → UI 渲染，逐层验证
2. **Python 是最好的串口调试工具**：用 `pyserial` 快速验证数据格式，比上位机调试效率高 10 倍
3. **二进制协议一定要用 hex dump 验证**：不要相信 "应该没问题"，`xxd` / `data.hex()` 看原始字节
4. **在界面上加可见的调试指标**：`cb:N fr:N` 这种计数器比 console.log 直观得多
5. **STM32H7 的坑比普通 STM32 多**：模拟开关、双核、多 SRAM 区域、Cache，每个都可能踩
