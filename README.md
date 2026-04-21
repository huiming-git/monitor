# DM-H7 Attitude Monitor

> 达妙H7开发板 (DM_MC02) 实时姿态显示仪

基于达妙 DM_MC02 H7 开发板的实时姿态可视化系统。板载 BMI088 IMU 采集加速度和角速度数据，经姿态解算后通过 USB 虚拟串口传输至上位机，桌面端以 3D 模型实时渲染姿态。

## 系统架构

```
┌─────────────────────┐     USB CDC      ┌──────────────────────────┐
│   DM_MC02 H7 开发板  │ ──────────────→  │    Tauri 桌面应用         │
│                     │   串口数据帧      │                          │
│  BMI088 IMU (SPI2)  │                  │  ┌──────────────────────┐ │
│         ↓           │                  │  │  3D 姿态渲染 (Three.js)│ │
│  姿态解算 (Mahony)   │                  │  ├──────────────────────┤ │
│         ↓           │                  │  │  实时数据仪表盘        │ │
│  USB CDC 发送       │                  │  │  欧拉角 / 四元数 / 波形 │ │
│                     │                  │  └──────────────────────┘ │
└─────────────────────┘                  └──────────────────────────┘
```

## 功能规划

### 固件端 (Zephyr RTOS)

- [x] 板级支持 ([ctrboard-h7-zephyr-template](https://github.com/huiming-git/ctrboard-h7-zephyr-template))
- [ ] BMI088 SPI 驱动 (加速度计 + 陀螺仪)
- [ ] 姿态解算算法 (Mahony / Madgwick 互补滤波)
- [ ] USB CDC 数据帧协议定义与发送
- [ ] 可配置采样率 (100Hz / 200Hz / 500Hz)

### 桌面端 (Tauri + Vue + Three.js)

- [ ] 串口连接管理 (自动扫描、连接、断开)
- [ ] 数据帧解析
- [ ] 3D 姿态渲染 (Three.js 实时旋转模型)
- [ ] 实时数据面板 (Roll / Pitch / Yaw 欧拉角显示)
- [ ] 波形图 (加速度、角速度、欧拉角时序曲线)
- [ ] 数据录制与回放 (CSV 导出)

## 数据帧协议 (暂定)

固件以固定帧格式通过 USB CDC 发送数据：

```
| 帧头 (2B) | 类型 (1B) | 长度 (1B) | 数据 (NB)          | CRC16 (2B) |
| 0xAA 0x55 | 0x01      | 28        | quat + gyro + acc  | CRC-16     |
```

姿态数据帧 (type=0x01, 28 bytes):
- 四元数 q0, q1, q2, q3 (float32 x4 = 16B)
- 角速度 gx, gy, gz (float32 x3 = 12B, 单位: rad/s)

原始数据帧 (type=0x02, 24 bytes):
- 加速度 ax, ay, az (float32 x3 = 12B, 单位: m/s^2)
- 角速度 gx, gy, gz (float32 x3 = 12B, 单位: rad/s)

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 固件 RTOS | Zephyr 4.4 | 实时操作系统，驱动 SPI/USB |
| 姿态解算 | Mahony Filter | 轻量级互补滤波，适合 Cortex-M7 |
| 桌面框架 | Tauri 2.x | Rust 后端 + WebView 前端，轻量跨平台 |
| 前端 | Vue 3 + TypeScript | 响应式 UI |
| 3D 渲染 | Three.js | WebGL 3D 姿态可视化 |
| 串口通信 | tauri-plugin-serialplugin | Tauri 串口插件 |
| 图表 | ECharts | 实时波形绘制 |

## 目录结构

```
dm-h7-attitude-monitor/
├── firmware/                # 固件工程 (Zephyr)
│   ├── CMakeLists.txt
│   ├── prj.conf
│   ├── boards/              # 板级定义 (从模板引入)
│   │   └── ctrboard_h7/
│   └── src/
│       ├── main.c           # 主任务
│       ├── bmi088.c/h       # IMU 驱动
│       ├── attitude.c/h     # 姿态解算
│       └── protocol.c/h     # 串口协议
│
├── desktop/                 # 桌面应用 (Tauri)
│   ├── src-tauri/           # Rust 后端
│   │   └── src/
│   │       └── main.rs
│   ├── src/                 # Vue 前端
│   │   ├── components/
│   │   │   ├── Attitude3D.vue    # 3D 姿态渲染
│   │   │   ├── DataPanel.vue     # 数据面板
│   │   │   ├── WaveChart.vue     # 波形图
│   │   │   └── SerialPort.vue    # 串口管理
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   └── tauri.conf.json
│
└── docs/                    # 文档
    └── protocol.md          # 协议详细说明
```

## 硬件需求

- 达妙 DM_MC02 H7 开发板 (STM32H723VGT6)
- DAPLink/CMSIS-DAP 调试器 (SWD 烧录)
- USB 数据线 (连接板载 USB 口用于数据传输)

## 快速开始

### 固件编译烧录

```bash
cd ~/zephyrproject
west build -b ctrboard_h7 <本工程>/firmware -- -DBOARD_ROOT=<本工程>/firmware
west flash
```

### 桌面应用启动

```bash
cd desktop
pnpm install
pnpm tauri dev
```

## License

MIT
