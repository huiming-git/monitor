// 实时轨迹估算器
// 原理：将 body 坐标系的加速度通过四元数旋转到 world 坐标系，
//       减去重力后做二次积分得到位置。
// 注意：纯 IMU 积分会漂移，这里加了高通滤波抑制低频漂移。

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number; // ms timestamp
}

const GRAVITY = 9.81;
const DECAY = 0.98; // 速度衰减系数，抑制积分漂移

export class TrajectoryEstimator {
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private px = 0;
  private py = 0;
  private pz = 0;
  private lastT = 0;
  private points: TrajectoryPoint[] = [];
  private maxPoints: number;

  constructor(maxPoints = 500) {
    this.maxPoints = maxPoints;
  }

  // 输入：四元数 (w,x,y,z) + 加速度 body 坐标系 (m/s²)
  update(
    q0: number, q1: number, q2: number, q3: number,
    ax: number, ay: number, az: number,
    timestamp: number,
  ): TrajectoryPoint {
    // dt (秒)
    const dt = this.lastT > 0 ? (timestamp - this.lastT) / 1000 : 0;
    this.lastT = timestamp;

    if (dt <= 0 || dt > 0.1) {
      // 第一帧或时间跳变，不积分
      const pt = { x: this.px, y: this.py, z: this.pz, t: timestamp };
      this.pushPoint(pt);
      return pt;
    }

    // 四元数旋转：将 body 加速度转到 world 坐标系
    // v' = q * v * q^(-1)，展开后：
    const wx = (1 - 2*(q2*q2 + q3*q3)) * ax + 2*(q1*q2 - q0*q3) * ay + 2*(q1*q3 + q0*q2) * az;
    const wy = 2*(q1*q2 + q0*q3) * ax + (1 - 2*(q1*q1 + q3*q3)) * ay + 2*(q2*q3 - q0*q1) * az;
    const wz = 2*(q1*q3 - q0*q2) * ax + 2*(q2*q3 + q0*q1) * ay + (1 - 2*(q1*q1 + q2*q2)) * az;

    // 减去重力 (假设 Z 轴朝上)
    const awx = wx;
    const awy = wy;
    const awz = wz - GRAVITY;

    // 积分加速度 → 速度 (带衰减)
    this.vx = (this.vx + awx * dt) * DECAY;
    this.vy = (this.vy + awy * dt) * DECAY;
    this.vz = (this.vz + awz * dt) * DECAY;

    // 积分速度 → 位置
    this.px += this.vx * dt;
    this.py += this.vy * dt;
    this.pz += this.vz * dt;

    const pt = { x: this.px, y: this.py, z: this.pz, t: timestamp };
    this.pushPoint(pt);
    return pt;
  }

  private pushPoint(pt: TrajectoryPoint) {
    this.points.push(pt);
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }

  getPoints(): TrajectoryPoint[] {
    return this.points;
  }

  reset() {
    this.vx = this.vy = this.vz = 0;
    this.px = this.py = this.pz = 0;
    this.lastT = 0;
    this.points = [];
  }
}
