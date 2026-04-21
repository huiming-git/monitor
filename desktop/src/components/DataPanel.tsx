import type { AttitudeData } from "../protocol";
import type { Messages } from "../i18n";

interface DataPanelProps {
  attitude: AttitudeData | null;
  fps: number;
  connected: boolean;
  lang: Messages;
}

function fmt(n: number | undefined, d = 2): string {
  return n !== undefined ? n.toFixed(d) : "—";
}

export default function DataPanel({ attitude, lang }: DataPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Euler Angles */}
      <section>
        <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          {lang.eulerAngles}
        </h3>
        <div className="bg-surface-container-lowest rounded-md p-3 ambient-shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">{lang.roll}</span>
            <span className="font-mono text-[13px] font-medium text-roll">{fmt(attitude?.roll)}°</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">{lang.pitch}</span>
            <span className="font-mono text-[13px] font-medium text-pitch">{fmt(attitude?.pitch)}°</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">{lang.yaw}</span>
            <span className="font-mono text-[13px] font-medium text-yaw">{fmt(attitude?.yaw)}°</span>
          </div>
        </div>
      </section>

      {/* Quaternion */}
      <section>
        <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          {lang.quaternion}
        </h3>
        <div className="bg-surface-container-lowest rounded-md p-3 ambient-shadow-sm grid grid-cols-2 gap-x-3 gap-y-1">
          {(["q0", "q1", "q2", "q3"] as const).map((key) => (
            <div key={key} className="flex justify-between">
              <span className="text-[12px] text-on-surface-variant">{key}</span>
              <span className="font-mono text-[12px] font-medium text-on-surface">{fmt(attitude?.[key], 4)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Angular Velocity */}
      <section>
        <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          {lang.angularVelocity}
        </h3>
        <div className="bg-surface-container-lowest rounded-md p-3 ambient-shadow-sm flex flex-col gap-2">
          {([["Gx", attitude?.gx], ["Gy", attitude?.gy], ["Gz", attitude?.gz]] as const).map(([label, val]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">{label}</span>
              <span className="font-mono text-[12px] font-medium text-on-surface">
                {fmt(val as number | undefined, 3)} <span className="text-on-surface-variant text-[9px]">rad/s</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
