import { useState, useEffect } from "react";
import type { Messages } from "../i18n";

interface SerialPortProps {
  ports: { path: string; manufacturer?: string }[];
  connected: boolean;
  currentPort: string;
  onConnect: (path: string, baudRate: number) => void;
  onDisconnect: () => void;
  error: string | null;
  lang: Messages;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export default function SerialPort({
  ports,
  connected,
  currentPort,
  onConnect,
  onDisconnect,
  error,
  lang,
}: SerialPortProps) {
  const [selectedPort, setSelectedPort] = useState("");
  const [baudRate, setBaudRate] = useState(115200);

  useEffect(() => {
    if (ports.length > 0 && (!selectedPort || !ports.find((p) => p.path === selectedPort))) {
      setSelectedPort(ports[0].path);
    }
  }, [ports, selectedPort]);

  if (connected) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-1 text-[12px]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-on-surface truncate font-medium">{currentPort}</span>
        </div>
        <button
          onClick={onDisconnect}
          className="w-full py-2 rounded-md bg-surface-container-highest text-on-surface text-[12px] font-medium hover:bg-surface-container-high transition-colors"
        >
          {lang.disconnect}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selectedPort}
        onChange={(e) => setSelectedPort(e.target.value)}
        className="w-full bg-surface-container-high border-none rounded-md py-2 px-2 text-[12px] text-on-surface focus:outline-none appearance-none cursor-pointer truncate"
      >
        {ports.length === 0 && <option value="">{lang.noPorts}</option>}
        {ports.map((p) => (
          <option key={p.path} value={p.path}>{p.path}</option>
        ))}
      </select>
      <select
        value={baudRate}
        onChange={(e) => setBaudRate(Number(e.target.value))}
        className="w-full bg-surface-container-high border-none rounded-md py-2 px-2 text-[12px] text-on-surface focus:outline-none appearance-none cursor-pointer"
      >
        {BAUD_RATES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button
        onClick={() => onConnect(selectedPort, baudRate)}
        disabled={!selectedPort}
        className="w-full py-2 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {lang.connect}
      </button>
      {error && <div className="text-[10px] text-red-600 px-1">{error}</div>}
    </div>
  );
}
