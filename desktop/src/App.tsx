import { useState, useRef, useCallback, useEffect } from "react";
import { Layout, Model, TabNode, IJsonModel, Actions } from "flexlayout-react";
import "flexlayout-react/style/light.css";
import Attitude3D from "./components/Attitude3D";
import Trajectory3D from "./components/Trajectory3D";
import { EulerPanel, QuaternionPanel, AngularVelocityPanel } from "./components/DataPanel";
import WaveChart from "./components/WaveChart";
import SerialPort from "./components/SerialPort";
import { useSerial } from "./hooks/useSerial";
import { t, type Lang } from "./i18n";
import { createLayout, tabName } from "./layout";
import "./App.css";

function App() {
  const serial = useSerial();
  const [lang, setLang] = useState<Lang>("zh");
  const m = t(lang);
  const [zoom, setZoom] = useState(100);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [model, setModel] = useState(() => Model.fromJson(createLayout(m) as IJsonModel));
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const sidebarDragging = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 语言切换时更新所有 tab 名称
  useEffect(() => {
    model.visitNodes((node) => {
      if (node.getType() === "tab") {
        const comp = (node as TabNode).getComponent();
        if (comp) {
          const newName = tabName(comp, m);
          model.doAction(Actions.renameTab(node.getId(), newName));
        }
      }
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetLayout = () => {
    setModel(Model.fromJson(createLayout(m) as IJsonModel));
  };

  const onSidebarDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sidebarDragging.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!sidebarDragging.current) return;
      const newW = Math.max(180, Math.min(400, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      sidebarDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(URL.createObjectURL(file));
  };

  const resetModel = () => {
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent();
    switch (component) {
      case "3d-viewer":
        return (
          <div className="w-full h-full bg-surface-container-low bg-grid-pattern relative">
            <Attitude3D attitude={serial.attitude} modelUrl={modelUrl} />
            {serial.attitude && (
              <div className="absolute top-3 right-3 glass rounded-md px-3 py-1.5 flex gap-3 text-[11px] font-mono font-medium ambient-shadow-sm">
                <span className="text-roll">R {serial.attitude.roll.toFixed(1)}°</span>
                <span className="text-pitch">P {serial.attitude.pitch.toFixed(1)}°</span>
                <span className="text-yaw">Y {serial.attitude.yaw.toFixed(1)}°</span>
              </div>
            )}
          </div>
        );
      case "trajectory":
        return (
          <div className="w-full h-full bg-surface-container-low bg-grid-pattern relative">
            <Trajectory3D points={serial.trajectory} />
            {serial.trajectory.length > 0 && (
              <div className="absolute top-3 right-3 glass rounded-md px-3 py-1.5 text-[11px] font-mono font-medium ambient-shadow-sm">
                <span className="text-on-surface-variant">{serial.trajectory.length} pts</span>
              </div>
            )}
            {serial.trajectory.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-on-surface-variant pointer-events-none">
                {lang === "zh" ? "等待 IMU 数据..." : "Waiting for IMU data..."}
              </div>
            )}
          </div>
        );
      case "waveform":
        return (
          <div className="w-full h-full bg-surface px-4 py-2">
            <WaveChart history={serial.attitudeHistory} lang={m} />
          </div>
        );
      case "euler":
        return (
          <div className="w-full h-full bg-surface overflow-auto">
            <EulerPanel attitude={serial.attitude} lang={m} />
          </div>
        );
      case "quaternion":
        return (
          <div className="w-full h-full bg-surface overflow-auto">
            <QuaternionPanel attitude={serial.attitude} />
          </div>
        );
      case "angular-velocity":
        return (
          <div className="w-full h-full bg-surface overflow-auto">
            <AngularVelocityPanel attitude={serial.attitude} />
          </div>
        );
      default:
        return <div>Unknown: {component}</div>;
    }
  }, [serial.attitude, serial.attitudeHistory, serial.trajectory, modelUrl, m, lang]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ zoom: `${zoom}%` }}>
      {/* ── Sidebar ── */}
      <nav className="flex flex-col bg-surface-container-low h-full py-5 px-4 shrink-0 z-10 relative" style={{ width: sidebarWidth }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-4">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-headline font-bold text-xs">
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-headline text-on-surface font-bold text-[15px] leading-tight">{m.brand}</div>
            <div className="text-on-surface-variant text-[12px]">{m.subtitle}</div>
          </div>
          <button
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors shrink-0"
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
        </div>

        {/* Serial */}
        <SerialPort
          ports={serial.ports}
          connected={serial.connected}
          currentPort={serial.currentPort}
          onConnect={serial.connect}
          onDisconnect={serial.disconnect}
          error={serial.error}
          lang={m}
        />

        {/* Devices */}
        {serial.devices.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider px-2 mb-2">{m.devices}</div>
            <div className="flex flex-col gap-1">
              {serial.devices.map((dev) => (
                <div
                  key={dev.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] transition-colors ${
                    dev.id === serial.activeDeviceId
                      ? "bg-surface-container-highest/60 text-on-surface font-medium"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    serial.connected && dev.id === serial.activeDeviceId ? "bg-green-500" : "bg-outline-variant"
                  }`} />
                  <span className="truncate">{dev.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Upload */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider px-2 mb-2">3D Model</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 py-1.5 rounded-md bg-surface-container-high text-on-surface text-[11px] font-medium hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1"
            >
              <span className="icon !text-[14px]">upload_file</span>
              {m.uploadModel}
            </button>
            {modelUrl && (
              <button onClick={resetModel} className="px-2 py-1.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] hover:bg-surface-container-highest transition-colors">
                {m.resetModel}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleModelUpload} />
        </div>

        <div className="flex-1" />

        {/* Footer */}
        <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/15">
          {/* Reset layout */}
          <button
            onClick={resetLayout}
            className="flex items-center justify-center gap-1.5 mx-2 py-1.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] font-medium hover:bg-surface-container-highest transition-colors"
          >
            <span className="icon !text-[14px]">dashboard_customize</span>
            {m.resetLayout}
          </button>
          <div className="flex items-center justify-between px-2 text-[12px] text-on-surface-variant">
            <span className="icon !text-[14px]">zoom_in</span>
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="bg-surface-container-high border-none rounded py-0.5 px-1.5 text-[11px] text-on-surface font-mono focus:outline-none appearance-none cursor-pointer"
            >
              <option value={75}>75%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
            </select>
          </div>
          <div className="flex items-center justify-between px-2 text-[12px] text-on-surface-variant">
            <span>{m.fps}</span>
            <span className="font-mono font-medium text-on-surface">{serial.fps}</span>
          </div>
        </div>
        {/* Resize handle */}
        <div
          onMouseDown={onSidebarDragStart}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-20"
        />
      </nav>

      {/* ── FlexLayout Main ── */}
      <div className="flex-1 relative">
        <Layout model={model} factory={factory} />
      </div>
    </div>
  );
}

export default App;
