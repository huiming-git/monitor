import { useState, useRef, useCallback, useEffect } from "react";
import { SerialPort } from "tauri-plugin-serialplugin";
import { FrameParser, type AttitudeData, type RawImuData } from "../protocol";
import { TrajectoryEstimator, type TrajectoryPoint } from "../trajectory";

interface PortEntry {
  path: string;
  manufacturer?: string;
}

export interface DeviceInfo {
  id: string;
  port: string;
  name: string;
}

export interface SerialState {
  ports: PortEntry[];
  connected: boolean;
  currentPort: string;
  devices: DeviceInfo[];
  activeDeviceId: string;
  attitude: AttitudeData | null;
  rawImu: RawImuData | null;
  attitudeHistory: AttitudeData[];
  rawHistory: RawImuData[];
  fps: number;
  error: string | null;
  trajectory: TrajectoryPoint[];
}

const MAX_HISTORY = 200;
const SCAN_INTERVAL = 2000;

export function useSerial() {
  const [state, setState] = useState<SerialState>({
    ports: [],
    connected: false,
    currentPort: "",
    devices: [],
    activeDeviceId: "",
    attitude: null,
    rawImu: null,
    attitudeHistory: [],
    rawHistory: [],
    fps: 0,
    error: null,
    trajectory: [],
  });

  const parserRef = useRef(new FrameParser());
  const trajRef = useRef(new TrajectoryEstimator(500));
  const lastAttitudeRef = useRef<AttitudeData | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);

  const scanPorts = useCallback(async () => {
    try {
      const portsMap = await SerialPort.available_ports();
      const ports: PortEntry[] = Object.entries(portsMap)
        .filter(([path, info]) => {
          // 只保留真实 USB 设备，过滤掉虚拟串口 /dev/ttyS*
          if (/\/dev\/ttyS\d+$/.test(path)) return false;
          if (path.startsWith("COM") || /ttyACM|ttyUSB|cu\.|tty\.usb/i.test(path)) return true;
          if (info.type !== "PCI" && info.vid !== "Unknown") return true;
          return false;
        })
        .map(([path, info]) => ({
          path,
          manufacturer: info.manufacturer !== "Unknown" ? info.manufacturer : undefined,
        }));
      setState((s) => ({ ...s, ports }));
    } catch (e) {
      console.error("Scan failed:", e);
    }
  }, []);

  // 自动扫描
  useEffect(() => {
    scanPorts();
    const id = setInterval(() => {
      if (!connectedRef.current) scanPorts();
    }, SCAN_INTERVAL);
    return () => clearInterval(id);
  }, [scanPorts]);

  const connect = useCallback(async (path: string, baudRate = 115200) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const port = new SerialPort({ path, baudRate });
      await port.open();

      parserRef.current.reset();
      frameCountRef.current = 0;

      fpsIntervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, fps: frameCountRef.current }));
        frameCountRef.current = 0;
      }, 1000);

      await port.listen((data: { data: number[] }) => {
        const bytes = new Uint8Array(data.data);
        const results = parserRef.current.feed(bytes);
        for (const result of results) {
          frameCountRef.current++;
          if (result.type === "attitude") {
            lastAttitudeRef.current = result.data;
            setState((s) => ({
              ...s,
              attitude: result.data,
              attitudeHistory: [
                ...s.attitudeHistory.slice(-MAX_HISTORY + 1),
                result.data,
              ],
            }));
          } else {
            // 有加速度 + 姿态时计算轨迹
            const att = lastAttitudeRef.current;
            if (att) {
              trajRef.current.update(
                att.q0, att.q1, att.q2, att.q3,
                result.data.ax, result.data.ay, result.data.az,
                result.data.timestamp,
              );
              const trajectory = [...trajRef.current.getPoints()];
              setState((s) => ({
                ...s,
                rawImu: result.data,
                rawHistory: [
                  ...s.rawHistory.slice(-MAX_HISTORY + 1),
                  result.data,
                ],
                trajectory,
              }));
            } else {
              setState((s) => ({
                ...s,
                rawImu: result.data,
                rawHistory: [
                  ...s.rawHistory.slice(-MAX_HISTORY + 1),
                  result.data,
                ],
              }));
            }
          }
        }
      }, false);

      await port.startListening();

      portRef.current = port;
      connectedRef.current = true;
      const shortName = path.split("/").pop() || path;
      const deviceId = `dev_${Date.now()}`;
      const device: DeviceInfo = { id: deviceId, port: path, name: shortName };
      setState((s) => ({
        ...s,
        connected: true,
        currentPort: path,
        devices: [...s.devices.filter((d) => d.port !== path), device],
        activeDeviceId: deviceId,
      }));
    } catch (e: any) {
      const msg = e?.message || e?.toString() || "Connection failed";
      console.error("Connect failed:", e);
      setState((s) => ({ ...s, error: msg }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
        fpsIntervalRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.stopListening();
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (e) {
      console.error("Disconnect error:", e);
    }
    connectedRef.current = false;
    trajRef.current.reset();
    lastAttitudeRef.current = null;
    setState((s) => ({
      ...s,
      connected: false,
      trajectory: [],
      currentPort: "",
      activeDeviceId: "",
      fps: 0,
      error: null,
    }));
  }, []);

  return { ...state, scanPorts, connect, disconnect };
}
