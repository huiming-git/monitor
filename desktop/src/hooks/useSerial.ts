import { useState, useRef, useCallback } from "react";
import { SerialPort } from "tauri-plugin-serialplugin";
import { FrameParser, type AttitudeData, type RawImuData } from "../protocol";

interface PortEntry {
  path: string;
  manufacturer?: string;
}

export interface SerialState {
  ports: PortEntry[];
  connected: boolean;
  currentPort: string;
  attitude: AttitudeData | null;
  rawImu: RawImuData | null;
  attitudeHistory: AttitudeData[];
  rawHistory: RawImuData[];
  fps: number;
}

const MAX_HISTORY = 200;

export function useSerial() {
  const [state, setState] = useState<SerialState>({
    ports: [],
    connected: false,
    currentPort: "",
    attitude: null,
    rawImu: null,
    attitudeHistory: [],
    rawHistory: [],
    fps: 0,
  });

  const parserRef = useRef(new FrameParser());
  const portRef = useRef<SerialPort | null>(null);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scanPorts = useCallback(async () => {
    try {
      const portsMap = await SerialPort.available_ports();
      const ports: PortEntry[] = Object.entries(portsMap).map(
        ([path, info]) => ({
          path,
          manufacturer: info.manufacturer !== "Unknown" ? info.manufacturer : undefined,
        })
      );
      setState((s) => ({ ...s, ports }));
    } catch (e) {
      console.error("Failed to scan ports:", e);
    }
  }, []);

  const connect = useCallback(async (path: string, baudRate = 115200) => {
    try {
      const port = new SerialPort({
        path,
        baudRate,
      });
      await port.open();

      parserRef.current.reset();
      frameCountRef.current = 0;

      // FPS 计算
      fpsIntervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, fps: frameCountRef.current }));
        frameCountRef.current = 0;
      }, 1000);

      // 监听数据 (binary mode)
      await port.listen((data: { data: number[] }) => {
        const bytes = new Uint8Array(data.data);
        const results = parserRef.current.feed(bytes);
        for (const result of results) {
          frameCountRef.current++;
          if (result.type === "attitude") {
            setState((s) => ({
              ...s,
              attitude: result.data,
              attitudeHistory: [
                ...s.attitudeHistory.slice(-MAX_HISTORY + 1),
                result.data,
              ],
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
      }, false);

      await port.startListening();

      portRef.current = port;
      setState((s) => ({ ...s, connected: true, currentPort: path }));
    } catch (e) {
      console.error("Failed to connect:", e);
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
      setState((s) => ({
        ...s,
        connected: false,
        currentPort: "",
        fps: 0,
      }));
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
  }, []);

  return { ...state, scanPorts, connect, disconnect };
}
