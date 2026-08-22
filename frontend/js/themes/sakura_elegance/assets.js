/**
 * 平安京·落樱雅境 (sakura_elegance) - 专属高精矢量资产库
 * 追求平安公卿风雅与莫兰迪薄樱美学：和纸莳绘 · 描金折扇 · 纸鹤式神 · 莫兰迪烟粉 · 100% 矢量
 */

// 1. 悬浮入口：落樱折扇·晴明结界印 (Sakura Ougi & Seimei Crest)
export const SAKURA_ELEGANCE_TRIGGER_SVG = `
<svg class="sakura-ougi-trigger-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 莫兰迪樱粉柔光滤镜 -->
    <filter id="sakuraPrismGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="sakuraFanGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5D0A9" />
      <stop offset="50%" stop-color="#E5A696" />
      <stop offset="100%" stop-color="#D48C9E" />
    </linearGradient>
    <linearGradient id="sakuraPetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255, 240, 245, 0.9)" />
      <stop offset="100%" stop-color="rgba(232, 165, 176, 0.6)" />
    </linearGradient>
  </defs>

  <!-- 1. 外圈阴阳结界天轨 (Double Counter-Rotating Celestial Orbits) -->
  <circle class="sakura-orbit-outer" cx="32" cy="32" r="30" />
  <circle class="sakura-orbit-mid" cx="32" cy="32" r="26.5" />

  <!-- 2. 十二辰宿与落樱星位环 (12 Sakura Nodes Ring) -->
  <g class="sakura-rune-ring">
    <circle cx="32" cy="32" r="28.5" fill="none" stroke="rgba(229, 166, 150, 0.2)" stroke-width="0.3" stroke-dasharray="2,3" />
    <!-- 顶部主樱位 -->
    <path class="sakura-mini-petal" d="M 32,3.5 C 31,4.5 31,6 32,7 C 33,6 33,4.5 32,3.5 Z" />
    <!-- 底部主樱位 -->
    <path class="sakura-mini-petal" d="M 32,57 C 31,58 31,59.5 32,60.5 C 33,59.5 33,58 32,57 Z" />
    <!-- 右侧星位 -->
    <circle class="sakura-star-dot" cx="58.5" cy="32" r="0.8" />
    <!-- 左侧星位 -->
    <circle class="sakura-star-dot" cx="5.5" cy="32" r="0.8" />
    <!-- 四维对角小花瓣星位 -->
    <circle class="sakura-star-dot" cx="50" cy="14" r="0.6" />
    <circle class="sakura-star-dot" cx="14" cy="14" r="0.6" />
    <circle class="sakura-star-dot" cx="50" cy="50" r="0.6" />
    <circle class="sakura-star-dot" cx="14" cy="50" r="0.6" />
  </g>

  <!-- 3. 和风落樱描金折扇 (Sakura Ougi Fan Geometry) -->
  <g class="sakura-fan-group">
    <!-- 折扇扇面外弧轮廓 (透光莫兰迪薄粉) -->
    <path class="sakura-fan-rim" d="M 14,38 A 21,21 0 0,1 50,38 L 45,41 A 15,15 0 0,0 19,41 Z" />
    
    <!-- 扇骨金丝游线 (Fan Ribs) -->
    <line class="sakura-fan-rib" x1="32" y1="46" x2="14" y2="38" />
    <line class="sakura-fan-rib" x1="32" y1="46" x2="20" y2="28" />
    <line class="sakura-fan-rib" x1="32" y1="46" x2="28" y2="22" />
    <line class="sakura-fan-rib" x1="32" y1="46" x2="36" y2="22" />
    <line class="sakura-fan-rib" x1="32" y1="46" x2="44" y2="28" />
    <line class="sakura-fan-rib" x1="32" y1="46" x2="50" y2="38" />

    <!-- 扇轴要心 (Fan Pivot Hub) -->
    <circle class="sakura-fan-pivot" cx="32" cy="46" r="1.8" />
    <circle class="sakura-fan-pivot-ring" cx="32" cy="46" r="3.2" />

    <!-- 扇面飘散的三瓣樱花微雕 -->
    <path class="sakura-floating-petal p1" d="M 23,32 C 22,30 24,28 26,29 C 27,31 25,33 23,32 Z" />
    <path class="sakura-floating-petal p2" d="M 37,28 C 36,26 38,24 40,25 C 41,27 39,29 37,28 Z" />
    <path class="sakura-floating-petal p3" d="M 31,18 C 30,16 32,15 33,16 C 34,18 32,19 31,18 Z" />
  </g>

  <!-- 4. 晴明桔梗五芒印与流光阵眼 (Seimei Pentagram Crest & Core Glow) -->
  <g class="sakura-seimei-crest" filter="url(#sakuraPrismGlow)">
    <!-- 结界五芒星线 (工笔浅金) -->
    <path class="seimei-star" d="M 32,15 L 36.8,30 L 24.2,20.8 L 39.8,20.8 L 27.2,30 Z" />
    <!-- 五芒星流动金芒 (Dash Flow) -->
    <path class="seimei-star-flow" d="M 32,15 L 36.8,30 L 24.2,20.8 L 39.8,20.8 L 27.2,30 Z" />

    <!-- 中央樱花微晶阵眼 (Sakura Node Gem) -->
    <circle class="sakura-gem-core" cx="32" cy="24" r="2.2" />
    <circle class="sakura-gem-halo" cx="32" cy="24" r="4.8">
      <animate attributeName="opacity" values="0.3;0.85;0.3" dur="3.5s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- 5. 扇底同心结与水引流苏 (Mizuhiki Tassels) -->
  <g class="sakura-tassel-group">
    <path class="sakura-tassel-knot" d="M 30,48 C 30,51 34,51 34,48 C 34,51 38,51 38,48 C 38,46 34,46 32,48 C 30,46 26,46 26,48 C 26,51 30,51 30,48 Z" />
    <line class="sakura-tassel-cord left" x1="30.5" y1="50" x2="28" y2="56" />
    <line class="sakura-tassel-cord right" x1="33.5" y1="50" x2="36" y2="56" />
  </g>
</svg>
`;

// 2. 模态框：和纸莳绘屏风流光框架 (Mizuhiki & 莳绘 Screen Frame - 纯净几何抗拉伸结构)
export const SAKURA_SCROLL_FRAME_SVG = `
<svg class="sakura-scroll-svg" viewBox="0 0 400 660" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 和纸夜樱绀青与星夜深蓝渐变底衬 (清透通透、高对比度护眼) -->
    <radialGradient id="sakuraWashiPaperBg" cx="50%" cy="35%" r="85%">
      <stop offset="0%" stop-color="#111c2e" stop-opacity="0.96" />
      <stop offset="55%" stop-color="#0b1321" stop-opacity="0.97" />
      <stop offset="100%" stop-color="#060a12" stop-opacity="0.99" />
    </radialGradient>
    <linearGradient id="sakuraGoldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(245, 208, 169, 0.85)" />
      <stop offset="50%" stop-color="rgba(244, 166, 184, 0.6)" />
      <stop offset="100%" stop-color="rgba(147, 197, 253, 0.55)" />
    </linearGradient>
  </defs>

  <!-- 1. 和纸屏风主体 (微切角优雅轮廓) -->
  <path d="M 22,8 L 378,8 L 392,22 L 392,638 L 378,652 L 22,652 L 8,638 L 8,22 Z" 
        fill="url(#sakuraWashiPaperBg)" 
        stroke="url(#sakuraGoldBorderGrad)" 
        stroke-width="0.9" />
  
  <!-- 2. 内层莳绘金粉虚线 (Double 莳绘 Thread) -->
  <path d="M 24,12 L 376,12 L 388,24 L 388,636 L 376,648 L 24,648 L 12,636 L 12,24 Z" 
        fill="none" 
        stroke="rgba(244, 166, 184, 0.3)" 
        stroke-width="0.6" 
        stroke-dasharray="6,4" />

  <!-- 3. 四角工笔金丝如意折角 (Corner Insets) -->
  <!-- 左上角 -->
  <g stroke="rgba(245, 208, 169, 0.7)" stroke-width="0.8" fill="none">
    <path d="M 12,30 L 12,24 L 24,12 L 30,12" />
    <circle cx="18" cy="18" r="1.2" fill="#F5D0A9" />
  </g>
  <!-- 右上角 -->
  <g stroke="rgba(245, 208, 169, 0.7)" stroke-width="0.8" fill="none">
    <path d="M 388,30 L 388,24 L 376,12 L 370,12" />
    <circle cx="382" cy="18" r="1.2" fill="#F5D0A9" />
  </g>
  <!-- 左下角 -->
  <g stroke="rgba(245, 208, 169, 0.7)" stroke-width="0.8" fill="none">
    <path d="M 12,630 L 12,636 L 24,648 L 30,648" />
    <circle cx="18" cy="642" r="1.2" fill="#F5D0A9" />
  </g>
  <!-- 右下角 -->
  <g stroke="rgba(245, 208, 169, 0.7)" stroke-width="0.8" fill="none">
    <path d="M 388,630 L 388,636 L 376,648 L 370,648" />
    <circle cx="382" cy="642" r="1.2" fill="#F5D0A9" />
  </g>

  <!-- 4. 顶部与底部极简微光导轨 (Top/Bottom Rails) -->
  <line x1="140" y1="9" x2="260" y2="9" stroke="rgba(245, 208, 169, 0.45)" stroke-width="0.6" />
  <circle cx="200" cy="9" r="1.5" fill="#F5D0A9" />
  <line x1="140" y1="651" x2="260" y2="651" stroke="rgba(245, 208, 169, 0.35)" stroke-width="0.6" />
  <circle cx="200" cy="651" r="1.2" fill="#F4A6B8" />
</svg>
`;

// 3. 专属 100% 细线高精矢量 App 图标库 (严禁 Emoji)
export const SAKURA_ICONS = {
  // ① 来电：纸鹤式神·传音 (Origami Crane Messenger)
  incoming_call: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- 纸鹤主体折纸线条 -->
    <path d="M 12 3 L 4 11 L 12 10 L 20 11 Z" />
    <path d="M 12 10 L 12 21 L 7 16" />
    <path d="M 12 10 L 17 16" />
    <path d="M 4 11 L 2 7 L 7 8" />
    <!-- 伴随飘落的微型花瓣 -->
    <path d="M 18 5 C 19 4 21 5 21 6 C 20 7 18 7 18 5 Z" fill="currentColor" opacity="0.6" stroke="none" />
  </svg>
  `,

  // ② 对话追踪：灵视结界·言灵 (Spirit Resonance & Speech Soundwave)
  eavesdrop: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- 桔梗五芒印轮廓 -->
    <path d="M 12 2 L 14.5 9 L 21.5 9 L 16 13.5 L 18 20.5 L 12 16.5 L 6 20.5 L 8 13.5 L 2.5 9 L 9.5 9 Z" opacity="0.4" stroke-dasharray="1.5,1.5" />
    <!-- 核心言灵同心涟漪 -->
    <circle cx="12" cy="12" r="3.5" />
    <path d="M 12 5 A 7 7 0 0 1 19 12" />
    <path d="M 5 12 A 7 7 0 0 1 12 5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ③ 剧本工坊：百鬼百绘·锦卷 (Illustrated Emaki Scroll)
  workshop: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- 展开的和风卷轴 -->
    <rect x="5" y="4" width="14" height="16" rx="1.5" />
    <line x1="3" y1="4" x2="3" y2="20" stroke-width="1.5" />
    <line x1="21" y1="4" x2="21" y2="20" stroke-width="1.5" />
    <!-- 卷面绘纹 -->
    <path d="M 8 8 L 16 8" />
    <path d="M 8 12 L 14 12" />
    <path d="M 8 16 L 12 16" />
    <path d="M 15 14 C 17 13 18 15 17 17 C 15 17 15 15 15 14 Z" fill="currentColor" opacity="0.5" stroke="none" />
  </svg>
  `,

  // ④ 收藏夹：结缘守·同心 (Omamori Charm & Knot)
  favorites: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- 御守轮廓 (六角袋身) -->
    <path d="M 7 6 L 10 3 L 14 3 L 17 6 L 17 20 L 7 20 Z" />
    <!-- 结绳与同心花结 -->
    <line x1="12" y1="3" x2="12" y2="8" stroke-width="1" />
    <path d="M 10 8 C 10 6.5 14 6.5 14 8 C 14 9.5 10 9.5 10 8 Z" fill="currentColor" opacity="0.4" />
    <!-- 御守心印 (同心五瓣花) -->
    <circle cx="12" cy="14" r="2.5" />
    <circle cx="12" cy="14" r="0.8" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ⑤ 主题工坊：莳绘花坊·绘染 (Makie Lacquer Brush)
  theme_store: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- 莳绘毛笔/金漆刷 -->
    <path d="M 18 3 L 21 6 L 11 16 L 8 16 L 8 13 Z" />
    <!-- 笔尖金漆流光 -->
    <path d="M 8 16 C 6 18 4 19 3 21 C 5 21 7 20 8 18" />
    <circle cx="16" cy="8" r="0.8" fill="currentColor" stroke="none" />
    <!-- 樱瓣调色皿微印 -->
    <path d="M 15 17 C 16 15 19 16 18 18 C 17 19 15 18 15 17 Z" fill="currentColor" opacity="0.5" stroke="none" />
  </svg>
  `,

  // ⑥ 系统设置：阴阳寮律·御镜 (Yata Sacred Mirror & Gears)
  settings: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- 八咫八角云纹古镜 -->
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.5" stroke-dasharray="2,2" />
    <!-- 八方镜齿刻度 -->
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="5" y1="5" x2="6.5" y2="6.5" />
    <line x1="17.5" y1="17.5" x2="19" y2="19" />
    <line x1="5" y1="19" x2="6.5" y2="17.5" />
    <line x1="17.5" y1="6.5" x2="19" y2="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ⑦ 主动拨号 (隐藏): 纸鹤传信
  phone_call: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 12 3 L 4 11 L 12 10 L 20 11 Z" />
    <path d="M 12 10 L 12 21" />
  </svg>
  `,

  // ⑧ LLM 测试 (隐藏): 灵识八卦
  llm_test: `
  <svg class="sakura-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M 12 3 A 4.5 4.5 0 0 1 12 12 A 4.5 4.5 0 0 0 12 21" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    <circle cx="12" cy="16.5" r="1" fill="currentColor" />
  </svg>
  `,

  // ⑨ 通用操作矢量
  close: `
  <svg class="sakura-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
  `,
  back: `
  <svg class="sakura-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
  `,
  play: `
  <svg class="sakura-action-icon" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
  `,
  pause: `
  <svg class="sakura-action-icon" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
  `,
  hangup: `
  <svg class="sakura-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.12-8.68A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
  </svg>
  `,
  answer: `
  <svg class="sakura-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
  `
};

// 4. 背景水印：和风水引落樱徽章 (Mizuhiki Crest Watermark)
export const SAKURA_WATERMARK_SVG = `
<svg class="sakura-bg-watermark-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="90" stroke="rgba(229, 166, 150, 0.04)" stroke-width="1" />
  <circle cx="100" cy="100" r="75" stroke="rgba(229, 166, 150, 0.03)" stroke-width="0.5" stroke-dasharray="4,4" />
  <path d="M 100 25 L 118 75 L 175 75 L 130 110 L 148 165 L 100 130 L 52 165 L 70 110 L 25 75 L 82 75 Z" stroke="rgba(229, 166, 150, 0.03)" stroke-width="0.8" />
  <circle cx="100" cy="100" r="30" stroke="rgba(229, 166, 150, 0.05)" stroke-width="0.8" />
</svg>
`;
