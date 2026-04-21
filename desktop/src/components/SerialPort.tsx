import { useState, useEffect } from "react";

interface SerialPortProps {
  ports: { path: string; manufacturer?: string }[];
  connected: boolean;
  currentPort: string;
  onScan: () => void;
  onConnect: (path: string, baudRate: number) => void;
  onDisconnect: () => void;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export default function SerialPort({
  ports,
  connected,
  currentPort,
  onScan,
  onConnect,
  onDisconnect,
}: SerialPortProps) {
  const [selectedPort, setSelectedPort] = useState("");
  const [baudRate, setBaudRate] = useState(115200);

  useEffect(() => { onScan(); }, [onScan]);

  useEffect(() => {
    if (ports.length > 0 && !selectedPort) {
      setSelectedPort(ports[0].path);
    }
  }, [ports, selectedPort]);

  if (connected) {
    return (
      <button
        onClick={onDisconnect}
        className="w-full flex items-center justify-center gap-1.5 bg-surface-container-highest text-on-surface py-1.5 px-3 rounded-md text-[12px] font-medium transition-colors hover:bg-surface-container-high"
      >
        <span className="icon !text-[14px]">link_off</span>
        {currentPort}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={selectedPort}
        onChange={(e) => setSelectedPort(e.target.value)}
        className="w-full bg-surface-container-high border-none rounded-md py-1.5 px-2.5 text-[11px] text-on-surface focus:outline-none appearance-none cursor-pointer"
      >
        {ports.length === 0 && <option value="">No ports</option>}
        {ports.map((p) => (
          <option key={p.path} value={p.path}>{p.path}</option>
        ))}
      </select>
      <div className="flex gap-1">
        <select
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
          className="flex-1 bg-surface-container-high border-none rounded-md py-1.5 px-2.5 text-[11px] text-on-surface focus:outline-none appearance-none cursor-pointer"
        >
          {BAUD_RATES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={onScan}
          className="px-1.5 py-1 rounded-md bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          title="Refresh"
        >
          <span className="icon !text-[14px]">refresh</span>
        </button>
      </div>
      <button
        onClick={() => onConnect(selectedPort, baudRate)}
        disabled={!selectedPort}
        className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-br from-primary to-primary-container text-on-primary py-1.5 px-3 rounded-md text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <span className="icon !text-[14px]">link</span>
        Connect
      </button>
    </div>
  );
}
