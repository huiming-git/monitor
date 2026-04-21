# Monitor — 嵌入式姿态可视化平台

开源的实时姿态显示系统，支持任何实现了 [Monitor 协议](docs/protocol.md) 的嵌入式设备接入。

上位机通过 USB 虚拟串口接收设备数据，3D 实时渲染姿态，显示欧拉角、四元数、角速度、波形图和运动轨迹。

## 效果

```
┌─────────────────────┐    USB CDC     ┌────────────────────────────────────┐
│  嵌入式设备           │ ────────────→ │  Monitor 桌面端                     │
│                     │   200Hz 帧     │                                    │
│  IMU → 姿态解算      │               │  3D 模型实时旋转 │ 欧拉角/四元数     │
│      → 协议打包      │               │  波形图          │ 角速度/轨迹       │
│      → USB CDC 发送  │               │  多设备管理      │ 中英文切换        │
└─────────────────────┘               └────────────────────────────────────┘
```

## 功能

### 桌面端

- 3D 姿态实时渲染（React Three Fiber，四元数驱动，slerp 平滑）
- 欧拉角 / 四元数 / 角速度数据面板
- 欧拉角实时波形图（Recharts）
- 运动轨迹 3D 估算（加速度二次积分）
- 自定义 3D 模型上传（GLB/GLTF）
- 串口自动扫描，过滤虚拟端口，只显示真实 USB 设备
- VS Code 风格可拖拽面板布局（flexlayout-react）
- 中英文一键切换，鸿蒙 HarmonyOS Sans 字体
- 界面缩放（75%~200%）
- 侧边栏宽度可拖拽
- 重置布局按钮

### 固件端（参考实现：DM_MC02 H7）

- Zephyr RTOS 板级支持（STM32H723VGT6, 550MHz）
- BMI088 六轴 IMU SPI 驱动
- Mahony AHRS 姿态解算（200Hz）
- 上电陀螺仪零偏标定（1000 次采样）
- Monitor 协议 v1.0 帧打包 + USB CDC 发送
- 同时发送姿态帧（0x01）和原始 IMU 帧（0x02）

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2.x | Rust 后端 + WebView，轻量跨平台 |
| 前端 | React 18 + TypeScript | UI 框架 |
| 3D 渲染 | React Three Fiber + Drei | 声明式 Three.js |
| 图表 | Recharts | 实时波形 |
| 布局 | flexlayout-react | 可拖拽面板 |
| 串口 | tauri-plugin-serialplugin | Tauri 串口插件 |
| 样式 | Tailwind CSS 4 | Precision Gallery 设计系统 |
| 字体 | HarmonyOS Sans SC | 鸿蒙中文字体 |
| 固件 RTOS | Zephyr 4.4 | 实时操作系统 |
| 姿态解算 | Mahony Filter | 互补滤波 |
| 通讯协议 | Monitor Protocol v1.0 | CRC16 校验二进制帧 |

## 目录结构

```
monitor/
├── desktop/                  # 桌面应用 (Tauri + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Attitude3D.tsx      # 3D 姿态渲染
│   │   │   ├── Trajectory3D.tsx    # 3D 轨迹渲染
│   │   │   ├── DataPanel.tsx       # 数据面板
│   │   │   ├── WaveChart.tsx       # 波形图
│   │   │   └── SerialPort.tsx      # 串口管理
│   │   ├── hooks/useSerial.ts      # 串口通信 hook
│   │   ├── protocol.ts            # 协议帧解析
│   │   ├── trajectory.ts          # 轨迹估算器
│   │   ├── i18n.ts                # 国际化
│   │   ├── layout.ts              # 面板布局定义
│   │   ├── App.tsx / App.css       # 主界面
│   │   └── assets/fonts/           # 鸿蒙字体
│   ├── src-tauri/                  # Rust 后端
│   ├── package.json
│   └── tauri.conf.json
│
└── docs/
    ├── protocol.md             # 通讯协议文档 v1.1
    └── devlog.md               # 开发踩坑记录
```

## 快速开始

### 环境要求

- Node.js 18+, pnpm
- Rust 1.70+
- Linux: `libwebkit2gtk-4.1-dev libgtk-3-dev`

### 启动桌面端

```bash
cd desktop
pnpm install
pnpm tauri dev
```

### 打包桌面端

```bash
pnpm tauri build
```

生成 deb / rpm / AppImage（Linux）或 dmg / msi（macOS / Windows）。

### 固件编译烧录（Zephyr，需要 Zephyr SDK）

```bash
cd ~/zephyrproject
west build -b ctrboard_h7 <固件工程路径> -- -DBOARD_ROOT=<固件工程路径>
west flash
```

## 接入自己的设备

任何设备只要实现 [Monitor 协议](docs/protocol.md)，就能接入本上位机：

1. 实现 CRC16 和帧打包函数（协议文档里有 C 参考代码）
2. 上电发送一帧设备信息帧（0x10）
3. 周期性发送姿态帧（0x01），推荐 100~500Hz
4. （可选）同时发送原始 IMU 帧（0x02），用于轨迹估算
5. USB CDC 或 UART 连接电脑

支持的设备类型见 [protocol.md](docs/protocol.md#43-设备信息帧-type--0x10)。

## License

MIT
