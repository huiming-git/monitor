import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AttitudeData } from "../protocol";

interface WaveChartProps {
  history: AttitudeData[];
}

export default function WaveChart({ history }: WaveChartProps) {
  const data = history.map((d, i) => ({
    idx: i,
    roll: parseFloat(d.roll.toFixed(2)),
    pitch: parseFloat(d.pitch.toFixed(2)),
    yaw: parseFloat(d.yaw.toFixed(2)),
  }));

  return (
    <div className="wave-chart">
      <h3>欧拉角波形</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="idx" hide />
          <YAxis domain={[-180, 180]} stroke="#888" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#1e1e1e", border: "1px solid #444" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="roll"
            stroke="#ff6b6b"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="pitch"
            stroke="#51cf66"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="yaw"
            stroke="#339af0"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
