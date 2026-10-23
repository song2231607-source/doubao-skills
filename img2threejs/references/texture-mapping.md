# 纹理贴图映射指南

## 目录
- [UV 映射基础](#uv-映射基础)
- [各几何体贴图方式](#各几何体贴图方式)
- [多面材质数组](#多面材质数组)
- [圆柱展开贴图](#圆柱展开贴图)
- [贴图加载与优化](#贴图加载与优化)
- [常见问题](#常见问题)

---

## UV 映射基础

Three.js 中每个顶点都有 UV 坐标（0-1），决定贴图如何映射到表面。
- U 轴：水平方向（左到右）
- V 轴：垂直方向（下到上）

不同几何体有默认的 UV 展开方式，理解它们才能正确贴图。

---

## 各几何体贴图方式

### BoxGeometry（立方体/纸箱）

默认 UV：每个面独立贴整张图。如果给一张 `map`，六个面都会贴同一张图。

**单面色块**（只想正面有印刷）：
```jsx
<mesh>
  <boxGeometry args={[2, 1.5, 1.5]} />
  {/* 材质数组顺序：右, 左, 上, 下, 前, 后 */}
  <meshStandardMaterial color="#d4b896" />  {/* right */}
  <meshStandardMaterial color="#d4b896" />  {/* left */}
  <meshStandardMaterial color="#d4b896" />  {/* top */}
  <meshStandardMaterial color="#d4b896" />  {/* bottom */}
  <meshStandardMaterial map={frontTexture} />  {/* front */}
  <meshStandardMaterial color="#d4b896" />  {/* back */}
</mesh>
```

### PlaneGeometry（平面/标签）

最简单，整张图直接贴上去，没有变形。适合：
- 产品标签
- 平面设计稿预览
- 广告牌

```jsx
<mesh>
  <planeGeometry args={[2, 1.5]} />
  <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
</mesh>
```

### CylinderGeometry（圆柱/卷膜/胶带）

UV 展开：侧面是一个矩形（环绕一圈），上下底面是圆形。

```jsx
<mesh>
  {/* 半径顶, 半径底, 高度, 径向分段, 高度分段, openEnded */}
  <cylinderGeometry args={[0.1, 0.1, 0.3, 32, 1, true]} />
  <meshStandardMaterial map={wrapTexture} />
</mesh>
```

**注意**：
- `openEnded=true` 只贴侧面，不画上下底（适合卷膜侧面印刷）
- 如果要上下底也贴，需要用材质数组：`[侧面, 顶面, 底面]`

### SphereGeometry（球体）

UV 展开像地球仪，两极会拉伸变形。
适合：气球、球形包装等。

---

## 多面材质数组

BoxGeometry 的材质数组顺序：
```
[
  materials[0], // +X 面（右）
  materials[1], // -X 面（左）
  materials[2], // +Y 面（上）
  materials[3], // -Y 面（下）
  materials[4], // +Z 面（前）
  materials[5], // -Z 面（后）
]
```

**包装纸箱六面印刷示例**：
```jsx
import { useTexture } from '@react-three/drei'

function PrintedBox({ textures }) {
  // textures: { front, back, left, right, top, bottom }
  const sideMat = useMemo(() =>
    new THREE.MeshStandardMaterial({ color: '#d4b896', roughness: 0.85 }), [])

  return (
    <mesh castShadow>
      <boxGeometry args={[0.4, 0.3, 0.3]} />
      <meshStandardMaterial map={textures.right || sideMat.map} />
      <meshStandardMaterial map={textures.left || sideMat.map} />
      <meshStandardMaterial map={textures.top || sideMat.map} />
      <meshStandardMaterial map={textures.bottom || sideMat.map} />
      <meshStandardMaterial map={textures.front} />
      <meshStandardMaterial map={textures.back || sideMat.map} />
    </mesh>
  )
}
```

---

## 圆柱展开贴图

卷状产品（拉伸膜卷、胶带卷）的侧面贴图：

**正确做法**：
1. 设计一张矩形展开图（宽度 = 周长 = 2πr，高度 = 卷宽）
2. 直接贴到 CylinderGeometry 侧面

**常见问题**：
- 图案接缝对不上：调整贴图的 `offset.x`
- 图案拉伸：保持展开图宽高比 = 周长:高度

```jsx
const texture = useTexture('/textures/film-wrap.jpg')
texture.wrapS = THREE.RepeatWrapping  // 水平方向可重复
texture.offset.x = 0  // 调整接缝位置
```

---

## 贴图加载与优化

### R3F 加载方式

```jsx
import { useTexture } from '@react-three/drei'

function MyMesh() {
  const texture = useTexture('/textures/my-image.jpg')
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

文件位置：放在 `public/textures/` 目录下，用绝对路径 `/textures/xxx.jpg` 引用。

### 颜色空间

```jsx
// 加载后设置（R3F 通常自动处理，但保险起见）
texture.colorSpace = THREE.SRGBColorSpace
```

### 贴图优化建议

| 场景 | 建议尺寸 |
|------|---------|
| 产品小贴图 | 512×512 ~ 1024×1024 |
| 包装设计预览 | 1024×1024 ~ 2048×2048 |
| 地形大贴图 | 2048×2048 ~ 4096×4096 |
| UI/标签 | 256×256 ~ 512×512 |

格式：优先 WebP 或 JPG（照片类），PNG（需要透明通道时）。

---

## 常见问题

1. **贴图颜色发灰/发暗**：没设置 `colorSpace = SRGBColorSpace`
2. **贴图翻转了**：设置 `texture.flipY = false`（某些坐标系下需要）
3. **贴图重复排列**：设置 `texture.wrapS = ClampToEdgeWrapping` 和 `wrapT = ClampToEdgeWrapping`
4. **材质数组不生效**：注意 JSX 中材质元素的顺序要和数组索引对应
5. **透明贴图边缘白边**：贴图格式不对，应该用带 alpha 通道的 PNG，并设置 `transparent: true`
