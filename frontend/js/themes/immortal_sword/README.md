# 仙途凌霄 (Immortal Sword) - 主题设计与架构文档

> **主题标识**: `immortal_sword`  
> **设计哲学**: 中国仙侠风骨 · 3D 混元太极剑阵 · 宋韵玄墨素简长卷 · 空灵水墨霜华  
> **对标标杆**: 《死亡圣器》高奢 3D 几何线条与法阵流光质感  

---

## 1. 设计内核：风骨、质感与去平面化

仙途凌霄主题彻底颠覆了传统 2D 实心剪贴画与高饱和塑料感页游风格，确立了正统高级东方仙侠美学体系：

1. **拒绝 2D 平面贴纸**：
   - 彻底摒弃实心填色色块，全面转为 **高精分层工笔白描线条 (Geometric Line Art)**；
   - 采用 `perspective: 800px` 与 `transform-style: preserve-3d`，注入 `rotateX/rotateY` 空间多轴立体漂浮，使法宝悬浮于界面之上。

2. **双向自转天轨与八荒玄符**：
   - **外天轨 (Orbit Outer)**：古金虚线环（`stroke-dasharray: 8 14 3 14`），26s 顺时针沉稳自转；
   - **中天轨 (Orbit Mid)**：冷翡素玉环（`stroke-dasharray: 4 10 2 10`），18s 逆时针交织运转；
   - **八荒玄符星位 (Rune Ring)**：8 个极简乾坤卦印与星宿点阵，鼠标悬停时幽然显现。

3. **灵气奔流流光系统 (Flow Lines)**：
   - 太极外圆环与 S 形分界流轨搭载 `stroke-dashoffset` 线性流动流光；
   - 中央天心本命飞剑纵贯法阵，带有剑脊金芒与破空剑尖微光。

4. **阴阳阵眼多频微光灵核**：
   - 阳鱼灵核（霜华白）与阴鱼灵核（冷翡玉）具有独立周期的呼吸脉动与光环扩散。

5. **天心剑脉中轴与左右交错悬浮灵牒 (Staggered Floating Jade Slips)**：
   - 彻底打破死板垂直卡片列表；
   - 模态框中央贯穿一条 **天心剑脉流光中轴 (Meridian Spine)**；
   - 6 大修真子应用以 **左右交错（Staggered Alternating）浮岛** 形态排列；
   - 每个应用图标内嵌于 **八角几何玉印 (Geometric Jade Seal Ring)** 中，悬停时玉印自转 45 度并散发暗金光泽；
   - 灵牒搭载多频独立的 **仙风时差浮动 (`@keyframes immortalSlipFloat`)**，宛如凌空漂浮于虚空云海中的六道仙家灵台。

6. **中式八荒切角飞檐折页框架**：
   - 模态框框架基于八荒斜切角、四象工笔如意角花白描与顶部/底部素金横梁，彻底消除呆板黑方盒感。

---

## 2. 核心文件架构

```text
frontend/js/themes/immortal_sword/
├── manifest.json            # 主题元数据
├── index.js                 # 主题入口与生命周期
├── state.js                 # 状态管理器
├── ui.js                    # 3D 容器 DOM 挂载、视口校准与手势拖拽
├── assets.js                # 混元太极剑阵 SVG、宋简长卷框架与白描图标库
├── immortal_particles.js    # Canvas 水墨微尘、淡墨轻雾与月白破空剑意物理引擎
├── README.md                # 本设计架构说明
└── scenes/                  # 专属场景实现
    ├── home.js              # 修真秘卷主页玉简场景
    ├── incoming_call.js     # 全屏沉浸式飞剑传书场景 (双阶段)
    ├── eavesdrop.js         # 全屏沉浸式神识探查场景 (双阶段)
    └── shared.js            # 共享白描导航与全屏构建器

frontend/css/themes/immortal_sword/
├── index.css                # 聚合样式入口
├── trigger.css              # 3D 混元太极剑印、天轨流光与呼吸悬浮动效
├── modal.css                # 宋简长卷模态框、Tabs、玉简卡片与各工坊覆盖样式
└── fullscreen_call.css      # 玄黑天幕全屏通话/窃听场景样式
```

---

## 3. 核心动效与流光关键帧

```css
/* 太极金芒流光 */
@keyframes immortal-gold-flow-circle {
    to { stroke-dashoffset: -67; }
}

@keyframes immortal-gold-flow-s {
    to { stroke-dashoffset: -44; }
}

/* 3D 漂浮与倾斜 */
@keyframes immortal-float-3d {
    0%, 100% { transform: scale(0.96) rotateY(-4deg) rotateX(2deg); }
    25%       { transform: scale(1.0) rotateY(3deg) rotateX(-2deg); }
    50%       { transform: scale(1.04) rotateY(5deg) rotateX(2deg); }
    75%       { transform: scale(1.0) rotateY(-2deg) rotateX(-3deg); }
}
```
