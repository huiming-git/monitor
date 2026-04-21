import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import * as THREE from "three";
import type { AttitudeData } from "../protocol";

interface BoardModelProps {
  attitude: AttitudeData | null;
}

function BoardModel({ attitude }: BoardModelProps) {
  const meshRef = useRef<THREE.Group>(null);
  const targetQuat = useRef(new THREE.Quaternion());

  useFrame(() => {
    if (!meshRef.current) return;
    if (attitude) {
      // Zephyr 四元数 (w, x, y, z) -> Three.js Quaternion (x, y, z, w)
      targetQuat.current.set(attitude.q1, attitude.q2, attitude.q3, attitude.q0);
    }
    meshRef.current.quaternion.slerp(targetQuat.current, 0.3);
  });

  return (
    <group ref={meshRef}>
      {/* 开发板 PCB */}
      <mesh>
        <boxGeometry args={[3, 0.15, 2]} />
        <meshStandardMaterial color="#1a6b3c" />
      </mesh>
      {/* 芯片 */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.8, 0.12, 0.8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* USB 接口 */}
      <mesh position={[1.55, 0.1, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.5]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 前方向标记 */}
      <mesh position={[1.2, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.3, 4]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      {/* X 轴标签 (红) */}
      <arrowHelper args={[
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.2, 0xff0000, 0.2, 0.1
      ]} />
      {/* Y 轴标签 (绿) */}
      <arrowHelper args={[
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 2.2, 0x00ff00, 0.2, 0.1
      ]} />
      {/* Z 轴标签 (蓝) */}
      <arrowHelper args={[
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 2.2, 0x0088ff, 0.2, 0.1
      ]} />
    </group>
  );
}

interface Attitude3DProps {
  attitude: AttitudeData | null;
}

export default function Attitude3D({ attitude }: Attitude3DProps) {
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 300 }}>
      <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <BoardModel attitude={attitude} />
        <Grid
          args={[10, 10]}
          position={[0, -1.5, 0]}
          cellColor="#444"
          sectionColor="#666"
          fadeDistance={15}
        />
        <OrbitControls enableDamping dampingFactor={0.1} />
        {/* 轴标签 */}
        <Text position={[2.5, 0, 0]} fontSize={0.3} color="red">X</Text>
        <Text position={[0, 2.5, 0]} fontSize={0.3} color="green">Y</Text>
        <Text position={[0, 0, 2.5]} fontSize={0.3} color="#0088ff">Z</Text>
      </Canvas>
    </div>
  );
}
