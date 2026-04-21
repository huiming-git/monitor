// 数据帧协议定义
// | 帧头 (2B) | 类型 (1B) | 长度 (1B) | 数据 (NB) | CRC16 (2B) |
// | 0xAA 0x55 | type      | len       | payload   | crc        |

export const FRAME_HEADER = [0xaa, 0x55];
export const FRAME_TYPE_ATTITUDE = 0x01;
export const FRAME_TYPE_RAW = 0x02;

export interface AttitudeData {
  // 四元数
  q0: number;
  q1: number;
  q2: number;
  q3: number;
  // 角速度 (rad/s)
  gx: number;
  gy: number;
  gz: number;
  // 欧拉角 (从四元数计算, 度)
  roll: number;
  pitch: number;
  yaw: number;
  timestamp: number;
}

export interface RawImuData {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  timestamp: number;
}

function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
}

function readFloat32(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 4);
  return view.getFloat32(0, true); // little-endian
}

// 从四元数计算欧拉角 (度)
function quaternionToEuler(q0: number, q1: number, q2: number, q3: number) {
  const roll = Math.atan2(
    2 * (q0 * q1 + q2 * q3),
    1 - 2 * (q1 * q1 + q2 * q2)
  ) * (180 / Math.PI);

  const sinp = 2 * (q0 * q2 - q3 * q1);
  const pitch = (Math.abs(sinp) >= 1
    ? (Math.sign(sinp) * 90)
    : Math.asin(sinp) * (180 / Math.PI));

  const yaw = Math.atan2(
    2 * (q0 * q3 + q1 * q2),
    1 - 2 * (q2 * q2 + q3 * q3)
  ) * (180 / Math.PI);

  return { roll, pitch, yaw };
}

export type ParseResult =
  | { type: "attitude"; data: AttitudeData }
  | { type: "raw"; data: RawImuData };

export class FrameParser {
  private buffer: number[] = [];

  feed(bytes: Uint8Array): ParseResult[] {
    const results: ParseResult[] = [];
    for (const b of bytes) {
      this.buffer.push(b);
      // 寻找帧头
      while (this.buffer.length >= 2 &&
        !(this.buffer[0] === 0xaa && this.buffer[1] === 0x55)) {
        this.buffer.shift();
      }
      // 至少需要 header(2) + type(1) + len(1) = 4 字节才能读长度
      if (this.buffer.length < 4) continue;
      const payloadLen = this.buffer[3];
      const frameLen = 4 + payloadLen + 2; // header + type + len + payload + crc
      if (this.buffer.length < frameLen) continue;

      const frame = new Uint8Array(this.buffer.splice(0, frameLen));
      // 校验 CRC
      const dataPart = frame.slice(0, frameLen - 2);
      const crcReceived = frame[frameLen - 2] | (frame[frameLen - 1] << 8);
      if (crc16(dataPart) !== crcReceived) continue;

      const type = frame[2];
      const payload = frame.slice(4, 4 + payloadLen);
      const now = Date.now();

      if (type === FRAME_TYPE_ATTITUDE && payloadLen === 28) {
        const q0 = readFloat32(payload, 0);
        const q1 = readFloat32(payload, 4);
        const q2 = readFloat32(payload, 8);
        const q3 = readFloat32(payload, 12);
        const gx = readFloat32(payload, 16);
        const gy = readFloat32(payload, 20);
        const gz = readFloat32(payload, 24);
        const { roll, pitch, yaw } = quaternionToEuler(q0, q1, q2, q3);
        results.push({
          type: "attitude",
          data: { q0, q1, q2, q3, gx, gy, gz, roll, pitch, yaw, timestamp: now },
        });
      } else if (type === FRAME_TYPE_RAW && payloadLen === 24) {
        results.push({
          type: "raw",
          data: {
            ax: readFloat32(payload, 0),
            ay: readFloat32(payload, 4),
            az: readFloat32(payload, 8),
            gx: readFloat32(payload, 12),
            gy: readFloat32(payload, 16),
            gz: readFloat32(payload, 24),
            timestamp: now,
          },
        });
      }
    }
    return results;
  }

  reset() {
    this.buffer = [];
  }
}
