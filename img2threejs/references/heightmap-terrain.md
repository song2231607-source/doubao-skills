# 高度图 / 地形 3D 生成指南

## 目录
- [高度图原理](#高度图原理)
- [完整实现：PlaneGeometry + 顶点位移](#完整实现planegeometry--顶点位移)
- [读取像素数据](#读取像素数据)
- [地形着色](#地形着色)
- [法线图处理](#法线图处理)
- [参数调优](#参数调优)

---

## 高度图原理

高度图是一张灰度图：
- **越亮（白）→ 越高**
- **越暗（黑）→ 越低**

把灰度值（0-255）映射到 3D 网格的 Y 轴高度上，就得到了起伏的地形。

---

## 完整实现：PlaneGeometry + 顶点位移

这是最常用的方式——用 Canvas 读取图片像素，逐顶点设置高度。

```jsx
import * as THREE from 'three'
import { useMemo, useState, useEffect } from 'react'
import { useTexture } from '@react-three/drei'

function HeightmapTerrain({ textureUrl, heightScale = 2, size = 10, segments = 128 }) {
  const texture = useTexture(textureUrl)
  const [geometry, setGeometry] = useState(null)

  useEffect(() => {
    // 1. 创建高细分平面
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)  // 放平

    // 2. 读取图片像素数据
    const image = texture.image
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    const imageData = ctx.getImageData(0, 0, image.width, image.height)
    const pixels = imageData.data

    // 3. 逐顶点设置高度
    const positionAttribute = geo.attributes.position
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const z = positionAttribute.getZ(i)

      // 将世界坐标映射到像素坐标
      const u = (x / size + 0.5) * image.width
      const v = (z / size + 0.5) * image.height

      // 采样灰度值
      const px = Math.floor(u)
      const py = Math.floor(v)
      const idx = (py * image.width + px) * 4
      const gray = pixels[idx] / 255.0  // 0-1

      positionAttribute.setY(i, gray * heightScale)
    }

    positionAttribute.needsUpdate = true
    geo.computeVertexNormals()  // 重新计算法线，保证光照正确

    setGeometry(geo)
  }, [texture, size, segments, heightScale])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#8b7355"
        roughness={0.9}
        metalness={0.1}
        flatShading={false}
      />
    </mesh>
  )
}
```

---

## 读取像素数据

关键点：
1. **一定要等图片加载完**才能读像素（`useTexture` 会自动处理）
2. Canvas 尺寸要和原图一致
3. 坐标映射：把 3D 空间坐标 [-size/2, size/2] 映射到像素坐标 [0, imageWidth]

### 简化版（用 drei 的 useTexture + onLoad）

```jsx
const texture = useTexture(textureUrl, (loadedTex) => {
  // 图片加载完成后在这里处理顶点
  applyHeightmap(loadedTex.image)
})
```

---

## 地形着色

根据高度自动着色（低=沙色，中=绿色，高=雪白）：

```jsx
function applyVertexColors(geometry, heightScale) {
  const position = geometry.attributes.position
  const colors = []

  const lowColor = new THREE.Color('#c2b280')   // 低处：沙色
  const midColor = new THREE.Color('#5a8f3c')   // 中间：草地
  const highColor = new THREE.Color('#ffffff')  // 高处：雪

  for (let i = 0; i < position.count; i++) {
    const h = position.getY(i) / heightScale  // 归一化 0-1
    const color = new THREE.Color()

    if (h < 0.5) {
      color.lerpColors(lowColor, midColor, h * 2)
    } else {
      color.lerpColors(midColor, highColor, (h - 0.5) * 2)
    }

    colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
}
```

材质中开启顶点色：
```jsx
<meshStandardMaterial vertexColors roughness={0.9} />
```

---

## 法线图处理

法线图（Normal Map）是彩色的表面凹凸信息，不是高度图。

**两种用法**：
1. **当贴图用**：直接作为 `normalMap` 贴到普通几何体上，增加表面细节（不需要变形成 3D）
2. **转高度图**：从法线图估算高度，但效果不如直接用高度图

推荐用法（作为细节贴图）：
```jsx
function DetailedSurface({ normalMapUrl }) {
  return (
    <mesh>
      <boxGeometry args={[2, 1, 2]} />
      <meshStandardMaterial
        color="#cccccc"
        normalMap={useTexture(normalMapUrl)}
        normalScale={[0.5, 0.5]}  // 控制凹凸强度
      />
    </mesh>
  )
}
```

---

## 参数调优

| 参数 | 建议值 | 说明 |
|------|--------|------|
| `segments` | 128 ~ 256 | 越高越精细，但顶点数指数增长 |
| `heightScale` | 0.5 ~ 5 | 地形起伏高度，根据场景调整 |
| `size` | 5 ~ 20 | 地形整体宽度 |
| `flatShading` | false | 平滑着色，true 是低多边形风格 |

### 性能建议

- 浏览器端实时渲染：segments 不超过 256（顶点数 ~6.6 万）
- 如果需要更精细，用高度图位移贴图（DisplacementMap）代替顶点位移
- 高度图分辨率建议和 segments 一致或略高

### DisplacementMap 方式（GPU 端位移）

更高效，适合大地形：
```jsx
function GPUDisplacementTerrain({ heightmapUrl }) {
  const displacementMap = useTexture(heightmapUrl)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10, 128, 128]} />
      <meshStandardMaterial
        displacementMap={displacementMap}
        displacementScale={2}
        displacementBias={-1}
        color="#8b7355"
        roughness={0.9}
      />
    </mesh>
  )
}
```

优点：不需要 JS 读像素，性能好。
缺点：精度低一些，不能做顶点色。
