import type { AttitudeData, RawImuData } from "../protocol";

interface DataPanelProps {
  attitude: AttitudeData | null;
  rawImu: RawImuData | null;
  fps: number;
  connected: boolean;
}

function formatNum(n: number | undefined, digits = 2): string {
  return n !== undefined ? n.toFixed(digits) : "--";
}

export default function DataPanel({ attitude, fps, connected }: DataPanelProps) {
  return (
    <div className="data-panel">
      <div className="panel-section">
        <h3>状态</h3>
        <div className="status-row">
          <span className={`status-dot ${connected ? "on" : "off"}`} />
          <span>{connected ? "已连接" : "未连接"}</span>
          {connected && <span className="fps">{fps} FPS</span>}
        </div>
      </div>

      <div className="panel-section">
        <h3>欧拉角</h3>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Roll</span>
            <span className="value roll">{formatNum(attitude?.roll)}°</span>
          </div>
          <div className="data-item">
            <span className="label">Pitch</span>
            <span className="value pitch">{formatNum(attitude?.pitch)}°</span>
          </div>
          <div className="data-item">
            <span className="label">Yaw</span>
            <span className="value yaw">{formatNum(attitude?.yaw)}°</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3>四元数</h3>
        <div className="data-grid quat">
          <div className="data-item">
            <span className="label">q0</span>
            <span className="value">{formatNum(attitude?.q0, 4)}</span>
          </div>
          <div className="data-item">
            <span className="label">q1</span>
            <span className="value">{formatNum(attitude?.q1, 4)}</span>
          </div>
          <div className="data-item">
            <span className="label">q2</span>
            <span className="value">{formatNum(attitude?.q2, 4)}</span>
          </div>
          <div className="data-item">
            <span className="label">q3</span>
            <span className="value">{formatNum(attitude?.q3, 4)}</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3>角速度 (rad/s)</h3>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">Gx</span>
            <span className="value">{formatNum(attitude?.gx, 3)}</span>
          </div>
          <div className="data-item">
            <span className="label">Gy</span>
            <span className="value">{formatNum(attitude?.gy, 3)}</span>
          </div>
          <div className="data-item">
            <span className="label">Gz</span>
            <span className="value">{formatNum(attitude?.gz, 3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
