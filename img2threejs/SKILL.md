---
name: img2threejs
description: "将 2D 图片转换为可交互的 Three.js / React Three Fiber 3D 场景。支持三种模式：(1) 图片转 3D 场景——根据产品图、包装设计图、概念图自动生成对应的 3D 场景代码；(2) 图片贴 3D 模型——将用户提供的图片作为纹理/贴图映射到现成的 3D 模型上；(3) 深度图/法线图转 3D——基于输入的深度图、法线图或灰度高度图生成可交互的 3D 地形或物体。当用户需要从图片生成 Three.js 代码、给 3D 模型贴图片纹理、把高度图变成 3D 地形、做产品 3D 展示包装可视化时使用。输出可直接运行的 React Three Fiber 组件或原生 Three.js 场景代码。"
---

# Img2ThreeJS

## Overview

从 2D 图片生成可交互的 Three.js / React Three Fiber 3D 场景代码。根据输入图片类型和用户目标，选择对应的转换模式，输出结构清晰、可直接运行的前端代码。

## 模式选择决策树

先判断用户输入的图片类型和目标，再进入对应工作流：

```
用户给了一张图，想做 3D
├── 图片是产品/包装/物体照片或设计稿，想整体变成 3D 展示
│   └── 模式 1：图片转 3D 场景
├── 已有 3D 模型（或基础几何体），想把图片当贴图贴上去
│   └── 模式 2：图片贴 3D 模型
└── 图片是灰度图/深度图/法线图/等高线图，想变成起伏的 3D 表面
    └── 模式 3：高度图转 3D
```

如果用户没有明确说要哪种模式，根据图片内容判断：照片/设计稿 → 模式 1；用户提到"贴图/贴到模型上" → 模式 2；灰度渐变/地形扫描/深度图 → 模式 3。判断不确定时主动问一句。

---

## 模式 1：图片转 3D 场景

### 适用场景

- 用户上传一张产品图、包装图、设计稿，想做成 360° 可旋转的 3D 展示
- 用户描述一个物体（如"做一个纸箱的 3D 模型"），需要从零搭场景
- 包装行业：把 PET 带、PE 膜、封箱胶、拉伸膜等产品做成 3D 可视化

### 工作流程

1. **分析图片**：观察图片中的主体形状、尺寸比例、颜色、材质、周围环境
   - 如果是产品图：判断是长方体/圆柱体/不规则形状，提取主色调和材质特征
   - 如果是包装设计稿：识别箱子形状、印刷图案区域、开窗/提手等结构
2. **选择基础几何体**：根据物体形状选最接近的 Three.js 基础几何体
   - 纸箱/盒子 → `BoxGeometry`
   - 圆柱形产品（卷膜、胶带卷） → `CylinderGeometry`
   - 瓶状/异形 → 用多个几何体组合，或参考 `LatheGeometry` 旋转成型
3. **搭建场景**：场景 + 相机 + 灯光 + 渲染器 + 控制器
4. **应用材质**：根据图片质感选择 MeshStandardMaterial / MeshPhysicalMaterial
   - 塑料/膜类 → 高粗糙度、低金属度、可加 clearcoat
   - 纸箱 → 高粗糙度、偏哑光
   - 金属带 → 高金属度、低粗糙度
5. **加入交互**：OrbitControls 旋转缩放 + 鼠标悬停高亮（如需要）

### 输出规范

- **默认输出 React Three Fiber 组件**（用户技术栈偏好），除非用户明确要原生 Three.js
- 组件自包含，包含 Canvas、相机、灯光、控制器、主体网格
- 尺寸用近似值，单位统一为"米"（包装场景常用）
- 代码要有合理的注释，标注哪里需要替换成实际贴图

### 关键代码骨架

```jsx
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'

function ProductBox({ position }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[2, 1.5, 1.5]} />
      <meshStandardMaterial color="#e8dcc8" roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [4, 3, 4], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <ProductBox position={[0, 0.75, 0]} />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2} />
      <OrbitControls makeDefault />
    </Canvas>
  )
}
```

详细的 R3F 模式和材质参数参考 [references/r3f-patterns.md](references/r3f-patterns.md)。

---

## 模式 2：图片贴 3D 模型

### 适用场景

- 用户有一张产品图/包装平面图，想贴到一个箱子/圆柱体/球体 3D 模型上
- 包装行业：把设计稿贴到货柜/托盘/纸箱模型上做预览
- 用户指定了基础几何体（如"贴到一个立方体上"）

### 工作流程

1. **确认目标几何体**：用户要贴到什么形状上？立方体、圆柱、球体、平面？
2. **加载贴图**：用 `useTexture`（R3F）或 `TextureLoader`（原生）加载图片
3. **处理 UV 映射**：根据几何体类型调整贴图方式
   - 立方体 → 默认 BoxGeometry UV 会把图贴到每个面（如果是单面包装图，考虑用多个材质数组，只在正面贴）
   - 圆柱体 → CylinderGeometry 侧面是展开的矩形，适合卷状产品
   - 平面 → PlaneGeometry 直接贴
4. **调整材质参数**：贴图 + 粗糙度/金属度配合
5. **导出可运行的示例**：包含贴图加载逻辑

### 输出规范

- 贴图路径用占位符（如 `/textures/product.jpg`），并在注释中说明替换位置
- 如果是包装多面印刷，用材质数组：`[right, left, top, bottom, front, back]`
- 注意贴图颜色空间：R3F 中默认 sRGB，原生 Three.js 需要手动设置 `texture.colorSpace = THREE.SRGBColorSpace`

### 关键代码骨架

```jsx
import { useTexture } from '@react-three/drei'

function TexturedBox({ textureUrl }) {
  const texture = useTexture(textureUrl)
  return (
    <mesh castShadow>
      <boxGeometry args={[2, 1.5, 1.5]} />
      <meshStandardMaterial map={texture} roughness={0.7} />
    </mesh>
  )
}
```

多面材质数组写法、圆柱展开贴图、材质常用参数详见 [references/texture-mapping.md](references/texture-mapping.md)。

---

## 模式 3：高度图 / 深度图转 3D

### 适用场景

- 用户给了一张灰度图（高度图），想变成起伏的 3D 地形
- 用户有一张法线图，想重建 3D 表面
- 扫描数据 / 地形高度图 → 可视化成 3D

### 工作流程

1. **确认输入类型**：
   - 高度图（灰度图，越亮越高）→ 直接用位移
   - 法线图（彩色渐变图）→ 需要转换或提示用户用高度图更直接
   - 深度图（ depth map ）→ 类似高度图
2. **选择实现方式**：
   - **简单方式**：`PlaneGeometry` 高细分 + `DisplacementMaterial` 或顶点位移
   - **精细方式**：读取图片像素数据，逐顶点设置 y 坐标
3. **生成网格**：
   - PlaneGeometry 宽高分段设大一些（如 128x128 到 256x256）
   - 旋转 -90° 放平
   - 根据灰度值设置顶点高度
4. **应用材质**：标准材质 + 可加顶点颜色 / 颜色贴图
5. **交互**：OrbitControls 从斜视角观察地形

### 输出规范

- 默认用高细分 PlaneGeometry + 顶点位移
- 如果要读像素数据，用 `canvas` + `ImageData` 处理
- 高度缩放参数做成可调变量（如 `heightScale`）
- 地形颜色可根据高度渐变（可选用顶点色）

### 关键代码骨架

```jsx
import * as THREE from 'three'
import { useMemo } from 'react'

function HeightmapTerrain({ textureUrl, heightScale = 2 }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 10, 128, 128)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  // 实际位移需要在 useTexture 加载完成后读取像素
  // 详见 references/heightmap-terrain.md 中的完整实现
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#8b7355" roughness={0.9} />
    </mesh>
  )
}
```

完整的高度图像素读取、法线图处理、地形着色实现详见 [references/heightmap-terrain.md](references/heightmap-terrain.md)。

---

## 通用输出规范

### 技术栈选择

- **默认 React Three Fiber**（用户主力技术栈）
- 用户明确说"原生 Three.js"或"不依赖 React"时，输出纯 Three.js + Vite/HTML 单文件版本
- 依赖包：`three`, `@react-three/fiber`, `@react-three/drei`

### 场景必备元素

每个生成的 3D 场景必须包含：
1. 相机（透视相机，位置能看清主体）
2. 至少两盏光（环境光/半球光 + 方向光/点光）
3. OrbitControls（可旋转缩放）
4. 接地阴影（ContactShadows 或 ShadowMaterial）
5. 合理的初始相机角度

### 性能注意

- 几何体分段不要太高（地形除外）
- 贴图注意压缩和尺寸
- 开启 `shadows` 但只用一个主光源投影

---

## Resources

### references/

- **[r3f-patterns.md](references/r3f-patterns.md)** — React Three Fiber 常用模式、材质参数速查、包装行业常见产品几何体参考
- **[texture-mapping.md](references/texture-mapping.md)** — 各种几何体的 UV 映射方式、多面材质数组、圆柱展开贴图、常见坑
- **[heightmap-terrain.md](references/heightmap-terrain.md)** — 高度图像素读取、顶点位移完整实现、法线图转高度、地形着色

### assets/

- 可复用的 R3F 场景模板和常用组件
