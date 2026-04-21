import Attitude3D from "./components/Attitude3D";
import DataPanel from "./components/DataPanel";
import WaveChart from "./components/WaveChart";
import SerialPort from "./components/SerialPort";
import { useSerial } from "./hooks/useSerial";
import "./App.css";

function App() {
  const serial = useSerial();

  return (
    <div className="app">
      <header className="app-header">
        <h1>DM-H7 Attitude Monitor</h1>
        <SerialPort
          ports={serial.ports}
          connected={serial.connected}
          currentPort={serial.currentPort}
          onScan={serial.scanPorts}
          onConnect={serial.connect}
          onDisconnect={serial.disconnect}
        />
      </header>

      <main className="app-main">
        <div className="left-panel">
          <div className="view-3d">
            <Attitude3D attitude={serial.attitude} />
          </div>
          <WaveChart history={serial.attitudeHistory} />
        </div>
        <div className="right-panel">
          <DataPanel
            attitude={serial.attitude}
            rawImu={serial.rawImu}
            fps={serial.fps}
            connected={serial.connected}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
