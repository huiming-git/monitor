import { useState } from "react";
import Attitude3D from "./components/Attitude3D";
import DataPanel from "./components/DataPanel";
import WaveChart from "./components/WaveChart";
import SerialPort from "./components/SerialPort";
import { useSerial } from "./hooks/useSerial";
import { t, type Lang } from "./i18n";
import "./App.css";

function App() {
  const serial = useSerial();
  const [lang, setLang] = useState<Lang>("zh");
  const m = t(lang);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <nav className="flex flex-col bg-surface-container-low w-56 h-full py-5 px-4 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-headline font-bold text-xs">
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-headline text-on-surface font-bold text-[15px] leading-tight">{m.brand}</div>
            <div className="text-on-surface-variant text-[12px]">{m.subtitle}</div>
          </div>
          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors shrink-0"
            title={lang === "zh" ? "Switch to English" : "切换中文"}
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
        </div>

        {/* Serial Connection */}
        <SerialPort
          ports={serial.ports}
          connected={serial.connected}
          currentPort={serial.currentPort}
          onConnect={serial.connect}
          onDisconnect={serial.disconnect}
          error={serial.error}
          lang={m}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status footer */}
        <div className="flex items-center justify-between px-2 text-[12px] text-on-surface-variant">
          <span>{m.fps}</span>
          <span className="font-mono font-medium text-on-surface">{serial.fps}</span>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <main className="flex-1 flex overflow-hidden">
          {/* Center: 3D + Wave */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 bg-surface-container-low bg-grid-pattern relative">
              <Attitude3D attitude={serial.attitude} />
              {serial.attitude && (
                <div className="absolute top-3 right-3 glass rounded-md px-3 py-1.5 flex gap-3 text-[11px] font-mono font-medium ambient-shadow-sm">
                  <span className="text-roll">R {serial.attitude.roll.toFixed(1)}°</span>
                  <span className="text-pitch">P {serial.attitude.pitch.toFixed(1)}°</span>
                  <span className="text-yaw">Y {serial.attitude.yaw.toFixed(1)}°</span>
                </div>
              )}
            </div>
            <div className="h-48 shrink-0 bg-surface border-t border-outline-variant/10 px-5 py-3">
              <WaveChart history={serial.attitudeHistory} lang={m} />
            </div>
          </div>

          {/* Right: Data Panel */}
          <aside className="w-60 bg-surface-container-low h-full overflow-y-auto no-scrollbar shrink-0">
            <div className="px-4 py-4 sticky top-0 bg-surface-container-low z-10">
              <h2 className="font-headline text-[14px] font-bold text-on-surface">{m.data}</h2>
            </div>
            <div className="px-4 pb-5">
              <DataPanel
                attitude={serial.attitude}
                fps={serial.fps}
                connected={serial.connected}
                lang={m}
              />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
