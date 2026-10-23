# React Three Fiber 常用模式与材质速查

## 目录
- [基础场景模板](#基础场景模板)
- [常用材质参数速查](#常用材质参数速查)
- [包装行业常见产品几何体](#包装行业常见产品几何体)
- [常用 drei 组件](#常用-drei-组件)
- [常见坑](#常见坑)

---

## 基础场景模板

每个 R3F 场景的标准结构：

```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 4, 5], fov: 45 }}
      style={{ width: '100%', height: '100vh' }}
    >
      {/* 背景色 */}
      <color attach="background" args={['#f0f0f0']} />

      {/* 灯光 */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* 你的物体 */}
      {/* <YourObject /> */}

      {/* 地面阴影 */}
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={15} blur={2.5} far={6} />

      {/* 控制器 */}
      <OrbitControls
        makeDefault
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
```

---

## 常用材质参数速查

### MeshStandardMaterial（最常用）

| 参数 | 说明 | 包装场景典型值 |
|------|------|---------------|
| `color` | 基础颜色 | 纸箱：#e8dcc8；透明膜：#ffffff |
| `roughness` | 粗糙度 0-1 | 纸箱 0.8；塑料膜 0.3；金属带 0.2 |
| `metalness` | 金属度 0-1 | 纸箱 0.1；PET 带 0.8；膜 0.0 |
| `map` | 颜色贴图 | 包装印刷图 |
| `normalMap` | 法线贴图 | 增加表面细节 |
| `roughnessMap` | 粗糙度贴图 | 控制不同区域光泽 |

### MeshPhysicalMaterial（高级材质）

在 Standard 基础上增加：
- `clearcoat` — 清漆层（亮面塑料、覆膜包装用）
- `transmission` — 透射（透明膜、玻璃效果，0-1）
- `thickness` — 透射厚度
- `ior` — 折射率

**透明拉伸膜示例**：
```jsx
<meshPhysicalMaterial
  color="#ffffff"
  transmission={0.9}
  thickness={0.05}
  roughness={0.1}
  ior={1.4}
  transparent
/>
```

### 包装行业材质参考

| 产品 | 推荐材质 | 关键参数 |
|------|---------|---------|
| 纸箱（瓦楞） | MeshStandardMaterial | roughness 0.85, metalness 0.05, color #d4b896 |
| PET 塑钢带 | MeshStandardMaterial | roughness 0.3, metalness 0.6, color #2a2a2a（黑色带） |
| PE 拉伸膜 | MeshPhysicalMaterial | transmission 0.85, roughness 0.15 |
| PVC 包装膜 | MeshPhysicalMaterial | transmission 0.9, thickness 0.02 |
| 封箱胶带 | MeshPhysicalMaterial | transparent, opacity 0.8, roughness 0.2 |
| 木托盘 | MeshStandardMaterial | roughness 0.9, color #8b6914 |

---

## 包装行业常见产品几何体

### 纸箱（标准箱）
```jsx
<mesh castShadow receiveShadow>
  <boxGeometry args={[L, H, W]} />  // 长×高×宽，单位米
  <meshStandardMaterial color="#d4b896" roughness={0.85} />
</mesh>
```
常见外尺寸：20GP 内长 5.898m，40GP 内长 12.032m，40HQ 内高 2.69m。

### 卷状产品（卷膜、胶带卷）
```jsx
<mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
  <cylinderGeometry args={[半径, 半径, 宽度, 32]} />
  <meshStandardMaterial color="#ffffff" roughness={0.3} />
</mesh>
```
注意：CylinderGeometry 默认轴向是 Y 轴，横放需要 rotateX(PI/2)。

### 托盘
```jsx
{/* 托盘面板 */}
<mesh position={[0, 0.1, 0]} receiveShadow>
  <boxGeometry args={[1.2, 0.15, 1.0]} />
  <meshStandardMaterial color="#8b6914" roughness={0.9} />
</mesh>
{/* 托盘脚，9 个或 6 个 */}
{/* ... */}
```

### 20GP / 40GP / 40HQ 货柜
```jsx
{/* 简化版货柜外壳，只画内壁和地面 */}
<mesh position={[0, 1.3, 0]}>
  <boxGeometry args={[5.898, 2.352, 2.352]} />  // 20GP 内尺寸
  <meshStandardMaterial color="#cccccc" side={THREE.BackSide} />
</mesh>
```
关键尺寸：
- 20GP：内长 5.898 × 内宽 2.352 × 内高 2.393 m，限重 17t
- 40GP：内长 12.032 × 内宽 2.352 × 内高 2.393 m，限重 26.5t
- 40HQ：内长 12.032 × 内宽 2.352 × 内高 2.698 m，限重 26.5t

---

## 常用 drei 组件

| 组件 | 用途 |
|------|------|
| `OrbitControls` | 旋转缩放控制器 |
| `Environment` | 环境贴图（自动反射，提升材质质感） |
| `ContactShadows` | 柔和接触阴影，不需要地面平面 |
| `Grid` | 参考网格地面 |
| `useTexture` | 加载贴图 Hook |
| `Html` | 在 3D 场景中放 HTML 标签 |
| `RoundedBox` | 圆角立方体（适合软包/产品） |
| `Text` | 3D 文字 |
| `Center` | 自动居中物体 |
| `Bounds` | 自动适配相机范围 |

---

## 常见坑

1. **贴图不显示**：检查贴图路径是否正确，R3F 中 `useTexture` 需要图片在 `public/` 目录下
2. **物体看不见**：检查相机位置，物体是否在相机视野内；检查背景色是否和物体同色
3. **阴影不显示**：Canvas 要加 `shadows`，灯光加 `castShadow`，物体加 `castShadow` 和 `receiveShadow`
4. **纹理模糊**：贴图尺寸太小，或没有设置 `texture.colorSpace = THREE.SRGBColorSpace`
5. **性能差**：几何体分段太高，或贴图分辨率太大
