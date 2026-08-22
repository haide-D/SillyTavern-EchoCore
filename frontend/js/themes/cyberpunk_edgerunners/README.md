# 夜之城·边缘行者 (cyberpunk_edgerunners) 主题定制与架构指南

本文档为 ST-Direct-TTS **「夜之城·边缘行者 (Cyberpunk: Edgerunners)」** 高定主题的开发与定制指南。本主题严格对标《死亡圣器》与《落樱雅境》的最高工艺标准，采用 **SVG-First 矢量架构** 与 **Canvas 粒子物理系统**。

---

## 1. 美学体系与色彩方案

- **设计理念**: 极高对比度赛博霓虹与军规 HUD 战术风格。
- **调色盘**:
  - 边缘行者明黄 (`#FFE600` / `#FFF000`): 战术焦点、高亮边框、主按钮;
  - 深网赛博青蓝 (`#00F0FF` / `#00FFE0`): 神经潜行流光、次级高亮、状态就绪光环;
  - 荒坂警报绯红 (`#FF003C`): 致命故障态、通话高急迫度警报、断开按钮;
  - 碳纤维深渊黑 (`#080C14` / `#0B0F19`): 模态框与底板背景，高对比度护眼。

---

## 2. 目录结构与分层

```text
frontend/js/themes/cyberpunk_edgerunners/
├── manifest.json            # 主题元数据声明文件
├── index.js                 # 核心主题生命周期与路由入口
├── state.js                 # 内部状态管理与拖拽状态机
├── ui.js                    # DOM 挂载、视口居中与自由拖拽绑定
├── assets.js                # 100% 高精细线矢量 SVG 图元库
├── cyber_particles.js       # Canvas 光子火花与数据流物理系统
├── README.md                # 本开发与定制指南
└── scenes/
    ├── home.js              # 专属主页场景 (战术 HUD 矩阵卡片)
    ├── incoming_call.js     # 专属全屏脑机通话场景 (含波形与动态字幕)
    ├── eavesdrop.js         # 专属全屏深网破冰监听场景 (含多角色光环)
    └── shared.js            # 专属导航栏与公共组件构建器

frontend/css/themes/
├── cyberpunk_edgerunners.css      # 全局样式总入口
└── cyberpunk_edgerunners/
    ├── index.css                  # 模块化样式聚合入口
    ├── trigger.css                # 战术 HUD 悬浮入口样式与 3D 动效
    ├── modal.css                  # 军规 HUD 模态框与战术矩阵样式
    └── fullscreen_call.css        # 全屏沉浸通话与窃听场景样式
```

---

## 3. 核心特性

1. **战术 HUD 全息准星悬浮入口**:
   - 3D 空间倾角浮动透视 (`perspective: 800px`);
   - 八角战术装甲外框 + 顺/逆双层自转数据纳米刻度轨 + 准星十字光标;
   - 支持全屏任意自由拖放与 localStorage 坐标持久化。
2. **军规 HUD 模态框**:
   - 45° 倒角战术装甲框架，内嵌纯净几何矢量 SVG 背景，抗拉伸抗畸变;
   - 导航栏与标题绝对水平居中，自适应移动端与 PC 端。
3. **100% 细线矢量图元 (绝对杜绝 Emoji)**:
   - 脑机通讯 (`incoming_call`)、深网潜行 (`eavesdrop`)、超梦刻录 (`workshop`)、核心记忆 (`favorites`)、义体医生 (`theme_store`)、底层内核 (`settings`)。
4. **Canvas 光子火花物理系统**:
   - 持续生成光子火花微粒与升腾数据流;
   - 点击或状态变化时触发超频等离子冲击波 (`burst()`)。
