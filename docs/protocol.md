# Monitor 嵌入式设备对接协议 v1.1

## 概述

Monitor 是一个通用姿态可视化上位机，通过串口（USB CDC / UART）与嵌入式设备通讯。设备端只需按照本协议发送数据帧，即可在上位机实现：

- 3D 姿态实时渲染
- 欧拉角 / 四元数 / 角速度数据面板
- 波形图
- 实时轨迹估算（需同时发送姿态帧和原始帧）

**最小对接只需实现两个函数：`crc16()` 和 `send_frame()`，然后周期性调用 `send_attitude()`。**

---

## 1. 物理层

| 参数 | 值 | 备注 |
|------|-----|------|
| 接口 | USB CDC / UART | 上位机自动扫描 USB 设备 |
| 波特率 | 115200 (默认) | 上位机可选 9600~921600 |
| 数据位 | 8 | |
| 停止位 | 1 | |
| 校验 | None | |
| 字节序 | **Little-Endian** | 所有多字节字段 |

---

## 2. 帧格式

```
字节偏移:  0     1     2      3       4 ... 4+N-1    4+N   5+N
         ┌─────┬─────┬──────┬───────┬─────────────┬──────┬──────┐
         │ 0xAA│ 0x55│ Type │  Len  │   Payload   │CRC_L │CRC_H │
         └─────┴─────┴──────┴───────┴─────────────┴──────┴──────┘
          ← Header →                                ← CRC16 →
```

| 字段 | 偏移 | 大小 | 说明 |
|------|------|------|------|
| Header | 0 | 2B | 固定 `0xAA 0x55` |
| Type | 2 | 1B | 帧类型 |
| Len | 3 | 1B | Payload 字节数 (0~255) |
| Payload | 4 | Len | 内容由 Type 决定 |
| CRC16 | 4+Len | 2B | 校验 [0 ~ 3+Len]，小端 |

---

## 3. CRC16

CRC-16/MODBUS。多项式 `0xA001`，初值 `0xFFFF`。

```c
uint16_t crc16(const uint8_t *data, uint16_t len)
{
    uint16_t crc = 0xFFFF;
    for (uint16_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (uint8_t j = 0; j < 8; j++)
            crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
    return crc;
}
```

---

## 4. 帧类型

| Type | 方向 | 名称 | Payload | 必须 |
|------|------|------|---------|------|
| `0x01` | 设备→上位机 | 姿态帧 | 28B | **是** |
| `0x02` | 设备→上位机 | 原始 IMU 帧 | 24B | 可选 |
| `0x10` | 设备→上位机 | 设备信息帧 | 24B | 推荐 |
| `0x20` | 上位机→设备 | 配置帧 | 4B | 可选 |
| `0x21` | 设备→上位机 | 配置应答帧 | 3B | 可选 |

### 4.1 姿态帧 `0x01` (28B) — 必须

上位机据此渲染 3D 模型、计算欧拉角、显示角速度。

| 偏移 | 类型 | 字段 | 单位 | 说明 |
|------|------|------|------|------|
| 0 | float32 | q0 | - | 四元数 w (标量) |
| 4 | float32 | q1 | - | 四元数 x |
| 8 | float32 | q2 | - | 四元数 y |
| 12 | float32 | q3 | - | 四元数 z |
| 16 | float32 | gx | rad/s | 角速度 X |
| 20 | float32 | gy | rad/s | 角速度 Y |
| 24 | float32 | gz | rad/s | 角速度 Z |

**四元数要求：**
- 单位四元数 `q0² + q1² + q2² + q3² = 1`
- 表示 body → world 旋转
- q0 (w) 在前

**上位机自动计算欧拉角：**
```
roll  = atan2(2(q0·q1 + q2·q3), 1 - 2(q1² + q2²))
pitch = asin(clamp(2(q0·q2 - q3·q1), -1, 1))
yaw   = atan2(2(q0·q3 + q1·q2), 1 - 2(q2² + q3²))
```

### 4.2 原始 IMU 帧 `0x02` (24B) — 可选

用于波形图显示原始传感器数据，以及轨迹估算。
**轨迹功能需要同时发送 0x01 和 0x02。**

| 偏移 | 类型 | 字段 | 单位 |
|------|------|------|------|
| 0 | float32 | ax | m/s² |
| 4 | float32 | ay | m/s² |
| 8 | float32 | az | m/s² |
| 12 | float32 | gx | rad/s |
| 16 | float32 | gy | rad/s |
| 20 | float32 | gz | rad/s |

**坐标系约定（静止水平放置时）：**
- az ≈ +9.81 (Z 轴朝上)
- ax ≈ 0, ay ≈ 0

### 4.3 设备信息帧 `0x10` (24B) — 推荐

上电后发送一次。上位机据此在设备列表中显示设备名称。

| 偏移 | 类型 | 字段 | 说明 |
|------|------|------|------|
| 0 | uint8 | protocol_ver | 协议版本，填 `0x01` |
| 1 | uint8 | device_type | 见设备类型表 |
| 2 | uint16 | sample_rate | 采样率 Hz |
| 4 | char[16] | device_name | UTF-8，不足补 `0x00` |
| 20 | uint32 | firmware_ver | `(major<<16)\|(minor<<8)\|patch` |

**设备类型表：**

| 值 | 设备 |
|----|------|
| `0x01` | DM_MC02 H7 (STM32H723 + BMI088) |
| `0x02` | STM32 + MPU6050 |
| `0x03` | STM32 + ICM42688 |
| `0x04` | ESP32 + BMI270 |
| `0x10` | 通用设备 |
| `0xFF` | 未知 |

### 4.4 配置帧 `0x20` (4B) — 可选

上位机 → 设备。设备可以不实现，忽略即可。

| 偏移 | 类型 | 字段 |
|------|------|------|
| 0 | uint8 | config_id |
| 1 | uint8 | reserved (0) |
| 2 | uint16 | value |

| config_id | 配置项 | value |
|-----------|--------|-------|
| `0x01` | 采样率 | Hz (100/200/500/1000) |
| `0x02` | 数据模式 | 0=姿态, 1=原始, 2=全部 |
| `0x03` | LED 控制 | 0=关, 1=开 |

### 4.5 配置应答帧 `0x21` (3B) — 可选

| 偏移 | 类型 | 字段 |
|------|------|------|
| 0 | uint8 | config_id |
| 1 | uint8 | result: 0=OK, 1=不支持, 2=参数无效 |
| 2 | uint8 | reserved (0) |

---

## 5. 对接步骤

### 最小对接（只要姿态显示）

```
1. 复制 crc16() 和 send_frame() 到你的工程
2. 在主循环中：
   - 读取 IMU 数据
   - 运行姿态解算（Mahony / Madgwick / EKF）
   - 调用 send_attitude(q, gyro) 发送
3. 上位机连接即可看到 3D 模型旋转
```

### 完整对接（姿态 + 轨迹 + 设备识别）

```
1. 复制 crc16()、send_frame()、send_attitude()、send_raw_imu()、send_device_info()
2. USB CDC 枚举完成后，调用 send_device_info() 一次
3. 在主循环中同时调用：
   - send_attitude(q, gyro)   → 姿态 + 角速度
   - send_raw_imu(acc, gyro)  → 加速度 + 角速度（用于轨迹）
4. （可选）解析收到的配置帧 0x20，回复 0x21
```

---

## 6. 完整 C 参考实现

直接复制到你的嵌入式工程中使用。只需自行实现 `uart_send()`。

```c
/*
 * monitor_protocol.h — Monitor 上位机对接协议
 * 复制此文件到你的嵌入式工程，实现 uart_send() 即可使用
 */
#ifndef MONITOR_PROTOCOL_H
#define MONITOR_PROTOCOL_H

#include <stdint.h>
#include <string.h>

/* ---- 帧类型 ---- */
#define MON_TYPE_ATTITUDE    0x01
#define MON_TYPE_RAW_IMU     0x02
#define MON_TYPE_DEVICE_INFO 0x10
#define MON_TYPE_CONFIG      0x20
#define MON_TYPE_CONFIG_ACK  0x21

/* ---- 需要你实现的函数 ---- */
extern void uart_send(const uint8_t *data, uint16_t len);

/* ---- CRC16 ---- */
static inline uint16_t mon_crc16(const uint8_t *data, uint16_t len)
{
    uint16_t crc = 0xFFFF;
    for (uint16_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (uint8_t j = 0; j < 8; j++)
            crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
    return crc;
}

/* ---- 发送一帧 ---- */
static inline void mon_send_frame(uint8_t type, const uint8_t *payload, uint8_t len)
{
    uint8_t buf[261];
    buf[0] = 0xAA;
    buf[1] = 0x55;
    buf[2] = type;
    buf[3] = len;
    if (len > 0) memcpy(&buf[4], payload, len);
    uint16_t crc = mon_crc16(buf, 4 + len);
    buf[4 + len] = (uint8_t)(crc & 0xFF);
    buf[5 + len] = (uint8_t)(crc >> 8);
    uart_send(buf, 6 + len);
}

/* ---- 发送姿态帧 (必须) ---- */
static inline void mon_send_attitude(const float q[4], const float gyro[3])
{
    uint8_t p[28];
    memcpy(&p[0],  &q[0], 4);     /* q0 (w) */
    memcpy(&p[4],  &q[1], 4);     /* q1 (x) */
    memcpy(&p[8],  &q[2], 4);     /* q2 (y) */
    memcpy(&p[12], &q[3], 4);     /* q3 (z) */
    memcpy(&p[16], &gyro[0], 4);  /* gx */
    memcpy(&p[20], &gyro[1], 4);  /* gy */
    memcpy(&p[24], &gyro[2], 4);  /* gz */
    mon_send_frame(MON_TYPE_ATTITUDE, p, 28);
}

/* ---- 发送原始 IMU 帧 (可选，轨迹功能需要) ---- */
static inline void mon_send_raw_imu(const float acc[3], const float gyro[3])
{
    uint8_t p[24];
    memcpy(&p[0],  &acc[0], 4);   /* ax */
    memcpy(&p[4],  &acc[1], 4);   /* ay */
    memcpy(&p[8],  &acc[2], 4);   /* az */
    memcpy(&p[12], &gyro[0], 4);  /* gx */
    memcpy(&p[16], &gyro[1], 4);  /* gy */
    memcpy(&p[20], &gyro[2], 4);  /* gz */
    mon_send_frame(MON_TYPE_RAW_IMU, p, 24);
}

/* ---- 发送设备信息帧 (推荐，上电调用一次) ---- */
static inline void mon_send_device_info(
    uint8_t device_type,
    uint16_t sample_rate_hz,
    const char *name,        /* 最长 16 字符 */
    uint8_t fw_major,
    uint8_t fw_minor,
    uint8_t fw_patch)
{
    uint8_t p[24] = {0};
    p[0] = 0x01;  /* protocol version */
    p[1] = device_type;
    p[2] = (uint8_t)(sample_rate_hz & 0xFF);
    p[3] = (uint8_t)(sample_rate_hz >> 8);
    strncpy((char *)&p[4], name, 16);
    uint32_t fw = ((uint32_t)fw_major << 16) | ((uint32_t)fw_minor << 8) | fw_patch;
    memcpy(&p[20], &fw, 4);
    mon_send_frame(MON_TYPE_DEVICE_INFO, p, 24);
}

/* ---- 解析配置帧 (可选) ---- */
typedef struct {
    uint8_t  config_id;
    uint16_t value;
} mon_config_t;

static inline int mon_parse_config(const uint8_t *payload, uint8_t len, mon_config_t *out)
{
    if (len < 4) return -1;
    out->config_id = payload[0];
    out->value = (uint16_t)payload[2] | ((uint16_t)payload[3] << 8);
    return 0;
}

/* ---- 发送配置应答帧 (可选) ---- */
static inline void mon_send_config_ack(uint8_t config_id, uint8_t result)
{
    uint8_t p[3] = { config_id, result, 0 };
    mon_send_frame(MON_TYPE_CONFIG_ACK, p, 3);
}

#endif /* MONITOR_PROTOCOL_H */
```

---

## 7. 使用示例

### Zephyr RTOS (USB CDC)

```c
#include <zephyr/kernel.h>
#include <zephyr/usb/usb_device.h>
#include <zephyr/drivers/uart.h>
#include "monitor_protocol.h"

static const struct device *cdc_dev;

void uart_send(const uint8_t *data, uint16_t len)
{
    for (uint16_t i = 0; i < len; i++) {
        uart_poll_out(cdc_dev, data[i]);
    }
}

int main(void)
{
    cdc_dev = DEVICE_DT_GET(DT_CHOSEN(zephyr_console));
    usb_enable(NULL);
    k_sleep(K_SECONDS(2));

    /* 上报设备信息 */
    mon_send_device_info(0x01, 200, "DM_MC02_H7", 1, 0, 0);

    float q[4] = {1, 0, 0, 0};
    float gyro[3] = {0};
    float acc[3] = {0, 0, 9.81f};

    while (1) {
        /* 读取 IMU、运行姿态解算... */
        // imu_read(&acc, &gyro);
        // attitude_update(acc, gyro, &q);

        mon_send_attitude(q, gyro);
        mon_send_raw_imu(acc, gyro);

        k_sleep(K_MSEC(5));  /* 200 Hz */
    }
}
```

### STM32 HAL (UART)

```c
#include "monitor_protocol.h"

extern UART_HandleTypeDef huart1;

void uart_send(const uint8_t *data, uint16_t len)
{
    HAL_UART_Transmit(&huart1, (uint8_t *)data, len, 100);
}

/* 在你的主循环或 RTOS 任务中调用 */
void monitor_task(void)
{
    mon_send_device_info(0x02, 100, "MY_BOARD", 1, 0, 0);

    while (1) {
        float q[4], gyro[3], acc[3];
        /* 你的 IMU 读取和姿态解算 */
        mon_send_attitude(q, gyro);
        mon_send_raw_imu(acc, gyro);
        HAL_Delay(10);  /* 100 Hz */
    }
}
```

### ESP-IDF (USB CDC / UART)

```c
#include "monitor_protocol.h"
#include "driver/uart.h"

void uart_send(const uint8_t *data, uint16_t len)
{
    uart_write_bytes(UART_NUM_0, data, len);
}
```

---

## 8. 字节序示例

姿态帧，q0=1.0 其余为零：

```
偏移  十六进制             说明
----  -------------------  ----------------
 0    AA 55                帧头
 2    01                   Type = 姿态帧
 3    1C                   Len = 28
 4    00 00 80 3F          q0 = 1.0f (LE)
 8    00 00 00 00          q1 = 0.0f
12    00 00 00 00          q2 = 0.0f
16    00 00 00 00          q3 = 0.0f
20    00 00 00 00          gx = 0.0f
24    00 00 00 00          gy = 0.0f
28    00 00 00 00          gz = 0.0f
32    XX XX                CRC16 (对 [0..31] 计算)
```

---

## 9. 常见问题

**Q: 最少需要实现什么？**
A: 只需 `crc16()` + `mon_send_frame()` + `mon_send_attitude()`。把 `monitor_protocol.h` 复制到工程，实现 `uart_send()`，在主循环里每隔 5~10ms 调用一次 `mon_send_attitude()`。

**Q: 上位机为什么收不到数据？**
A: 检查：①波特率是否匹配 ②帧头是否为 `0xAA 0x55` ③CRC 是否正确 ④字节序是否为小端

**Q: 轨迹功能为什么没有数据？**
A: 轨迹需要同时发送 `0x01`（姿态帧）和 `0x02`（原始帧）。只发姿态帧没有加速度数据，无法积分位置。

**Q: 发送频率多少合适？**
A: 推荐 100~500 Hz。低于 50 Hz 姿态渲染会有卡顿感，高于 500 Hz 串口带宽可能不够（115200 波特率下约 400 帧/秒上限）。

**Q: 不想实现设备信息帧可以吗？**
A: 可以。上位机会用串口路径名代替设备名称。但推荐实现，方便多设备区分。
