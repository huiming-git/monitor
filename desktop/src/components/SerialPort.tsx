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

  useEffect(() => {
    onScan();
  }, [onScan]);

  useEffect(() => {
    if (ports.length > 0 && !selectedPort) {
      setSelectedPort(ports[0].path);
    }
  }, [ports, selectedPort]);

  return (
    <div className="serial-port">
      <div className="serial-controls">
        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          disabled={connected}
        >
          {ports.length === 0 && <option value="">无可用端口</option>}
          {ports.map((p) => (
            <option key={p.path} value={p.path}>
              {p.path}
              {p.manufacturer ? ` (${p.manufacturer})` : ""}
            </option>
          ))}
        </select>

        <select
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
          disabled={connected}
        >
          {BAUD_RATES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <button
          className="scan-btn"
          onClick={onScan}
          disabled={connected}
        >
          扫描
        </button>

        {connected ? (
          <button className="disconnect-btn" onClick={onDisconnect}>
            断开
          </button>
        ) : (
          <button
            className="connect-btn"
            onClick={() => onConnect(selectedPort, baudRate)}
            disabled={!selectedPort}
          >
            连接
          </button>
        )}
      </div>
      {connected && (
        <span className="connected-info">已连接: {currentPort}</span>
      )}
    </div>
  );
}
