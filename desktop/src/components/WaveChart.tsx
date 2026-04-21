import {
  LineChart,
  Line,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { AttitudeData } from "../protocol";
import type { Messages } from "../i18n";

export default function WaveChart({ history, lang }: { history: AttitudeData[]; lang: Messages }) {
  const data = history.map((d, i) => ({
    idx: i,
    roll: parseFloat(d.roll.toFixed(1)),
    pitch: parseFloat(d.pitch.toFixed(1)),
    yaw: parseFloat(d.yaw.toFixed(1)),
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
          {lang.eulerWave}
        </span>
        <div className="flex gap-3 text-[11px]">
          <span className="text-roll">{lang.roll}</span>
          <span className="text-pitch">{lang.pitch}</span>
          <span className="text-yaw">{lang.yaw}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
            <YAxis domain={[-180, 180]} stroke="#c1c6d7" fontSize={9} tickLine={false} axisLine={false} />
            <Line type="monotone" dataKey="roll" stroke="#e53935" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="monotone" dataKey="pitch" stroke="#43a047" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            <Line type="monotone" dataKey="yaw" stroke="#1e88e5" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
