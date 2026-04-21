import Attitude3D from "./components/Attitude3D";
import DataPanel from "./components/DataPanel";
import WaveChart from "./components/WaveChart";
import SerialPort from "./components/SerialPort";
import { useSerial } from "./hooks/useSerial";
import "./App.css";

function App() {
  const serial = useSerial();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <nav className="flex flex-col bg-surface-container-low w-52 h-full py-4 px-3 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-headline font-bold text-xs">
            H7
          </div>
          <div>
            <div className="font-headline text-on-surface font-bold text-[13px] leading-tight">DM-H7 Monitor</div>
            <div className="text-on-surface-variant text-[11px]">Attitude Visualizer</div>
          </div>
        </div>

        {/* Serial Connection */}
        <SerialPort
          ports={serial.ports}
          connected={serial.connected}
          currentPort={serial.currentPort}
          onScan={serial.scanPorts}
          onConnect={serial.connect}
          onDisconnect={serial.disconnect}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status footer */}
        <div className="flex flex-col gap-1 pt-3 mt-3 border-t border-outline-variant/15">
          <div className="flex items-center justify-between px-2 text-[11px] text-on-surface-variant">
            <span>FPS</span>
            <span className="font-mono font-medium text-on-surface">{serial.fps}</span>
          </div>
          <div className="flex items-center gap-2 px-2 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${serial.connected ? "bg-green-500" : "bg-outline-variant"}`} />
            <span className="text-on-surface-variant truncate">
              {serial.connected ? serial.currentPort : "Not connected"}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Center: 3D + Wave */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 3D Viewport */}
            <div className="flex-1 min-h-0 bg-surface-container-low bg-grid-pattern relative">
              <Attitude3D attitude={serial.attitude} />
              {/* Quick RPY readout */}
              {serial.attitude && (
                <div className="absolute top-3 right-3 glass rounded-md px-3 py-1.5 flex gap-3 text-[11px] font-mono font-medium ambient-shadow-sm">
                  <span className="text-roll">R {serial.attitude.roll.toFixed(1)}°</span>
                  <span className="text-pitch">P {serial.attitude.pitch.toFixed(1)}°</span>
                  <span className="text-yaw">Y {serial.attitude.yaw.toFixed(1)}°</span>
                </div>
              )}
            </div>
            {/* Waveform (inline, compact) */}
            <div className="h-48 shrink-0 bg-surface border-t border-outline-variant/10 px-4 py-2">
              <WaveChart history={serial.attitudeHistory} />
            </div>
          </div>

          {/* Right: Data Panel */}
          <aside className="w-56 bg-surface-container-low h-full overflow-y-auto no-scrollbar shrink-0">
            <div className="px-3 py-3 sticky top-0 bg-surface-container-low z-10">
              <h2 className="font-headline text-[13px] font-bold text-on-surface">Data</h2>
            </div>
            <div className="px-3 pb-4">
              <DataPanel
                attitude={serial.attitude}
                fps={serial.fps}
                connected={serial.connected}
              />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
