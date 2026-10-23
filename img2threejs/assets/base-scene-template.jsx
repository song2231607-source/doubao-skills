import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'

/**
 * Img2ThreeJS 基础场景模板
 * 复制此文件作为新场景的起点，替换 YourObject 部分
 */

function YourObject() {
  return (
    <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
      {/* 替换成你需要的几何体 */}
      <boxGeometry args={[1, 1, 1]} />
      {/* 替换成你需要的材质 */}
      <meshStandardMaterial color="#e8dcc8" roughness={0.8} />
    </mesh>
  )
}

export default function BaseScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [4, 3, 5], fov: 45 }}
      style={{ width: '100%', height: '100vh', background: '#f5f5f5' }}
    >
      {/* 环境光 */}
      <ambientLight intensity={0.4} />

      {/* 主光源（投影） */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* 补光 */}
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* 你的物体 */}
      <YourObject />

      {/* 接触阴影 */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={15}
        blur={2.5}
        far={6}
      />

      {/* 参考网格（可选） */}
      <Grid
        position={[0, 0, 0]}
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#cccccc"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#999999"
        fadeDistance={20}
        infiniteGrid
      />

      {/* 轨道控制器 */}
      <OrbitControls
        makeDefault
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0.5, 0]}
      />
    </Canvas>
  )
}
