import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text, Line } from "@react-three/drei";
import type { TrajectoryPoint } from "../trajectory";

function TrajectoryLine({ points }: { points: TrajectoryPoint[] }) {
  const linePoints = useMemo(() => {
    if (points.length < 2) return null;
    return points.map((p) => [p.x, p.z, -p.y] as [number, number, number]); // Y-up for Three.js
  }, [points]);

  if (!linePoints) return null;

  // 渐变色：旧的点淡，新的点亮
  const colors = useMemo(() => {
    return linePoints.map((_, i) => {
      const t = i / (linePoints.length - 1);
      // 从灰蓝到亮蓝
      return [0.1 + t * 0.0, 0.3 + t * 0.3, 0.7 + t * 0.3] as [number, number, number];
    });
  }, [linePoints]);

  return (
    <>
      <Line
        points={linePoints}
        vertexColors={colors}
        lineWidth={2}
      />
      {/* 当前位置标记 */}
      {linePoints.length > 0 && (
        <mesh position={linePoints[linePoints.length - 1]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#0058bc" emissive="#0058bc" emissiveIntensity={0.5} />
        </mesh>
      )}
      {/* 起点标记 */}
      {linePoints.length > 0 && (
        <mesh position={linePoints[0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#43a047" />
        </mesh>
      )}
    </>
  );
}

interface Trajectory3DProps {
  points: TrajectoryPoint[];
}

export default function Trajectory3D({ points }: Trajectory3DProps) {
  // 自动计算相机距离
  const maxRange = useMemo(() => {
    if (points.length === 0) return 3;
    let max = 0;
    for (const p of points) {
      const d = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      if (d > max) max = d;
    }
    return Math.max(3, max * 2);
  }, [points]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [maxRange * 0.8, maxRange * 0.6, maxRange * 0.8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1} />

        <TrajectoryLine points={points} />

        <Grid
          args={[20, 20]}
          position={[0, -0.01, 0]}
          cellColor="#e2e2e2"
          sectionColor="#c1c6d7"
          fadeDistance={30}
          cellSize={0.5}
          sectionSize={2}
        />

        <OrbitControls enableDamping dampingFactor={0.08} />

        {/* 轴标签 */}
        <Text position={[2, 0, 0]} fontSize={0.15} color="#e53935">X</Text>
        <Text position={[0, 2, 0]} fontSize={0.15} color="#43a047">Z</Text>
        <Text position={[0, 0, -2]} fontSize={0.15} color="#1e88e5">Y</Text>
      </Canvas>
    </div>
  );
}
