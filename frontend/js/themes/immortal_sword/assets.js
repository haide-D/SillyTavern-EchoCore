/**
 * 仙途凌霄 (immortal_sword) - 极简水墨仙侠资产库
 * 追求中国仙侠风骨与质感：洗练白描 · 羊脂玄玉 · 素雅暗金 · 留白意境
 */

// 1. 悬浮入口：混元太极剑阵 (Celestial Taiji Sword Seal - 对标死亡圣器几何法阵质感，分层白描与动态流光)
export const IMMORTAL_BAGUA_TRIGGER_SVG = `
<svg class="immortal-bagua-trigger-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 1. 外层天轨 (Celestial Orbits - 双层反向自转轨道) -->
  <circle class="immortal-orbit-outer" cx="32" cy="32" r="30" />
  <circle class="immortal-orbit-mid" cx="32" cy="32" r="26.5" />

  <!-- 2. 八荒玄符与星位刻度环 (Rune & Constellation Ring) -->
  <g class="immortal-rune-ring">
    <circle cx="32" cy="32" r="28.5" fill="none" stroke="rgba(196, 155, 79, 0.15)" stroke-width="0.3" />
    <!-- 乾 (上) -->
    <path class="rune-glyph" d="M30,3.5 L34,3.5 M30,5 L34,5 M30,6.5 L34,6.5" />
    <!-- 坤 (下) -->
    <path class="rune-glyph" d="M29.5,57.5 L31.5,57.5 M32.5,57.5 L34.5,57.5 M29.5,59 L31.5,59 M32.5,59 L34.5,59" />
    <!-- 离 (右) -->
    <path class="rune-glyph" d="M57.5,30 L57.5,34 M59,29.5 L59,31.5 M59,32.5 L59,34.5 M60.5,30 L60.5,34" />
    <!-- 坎 (左) -->
    <path class="rune-glyph" d="M3.5,29.5 L3.5,31.5 M3.5,32.5 L3.5,34.5 M5,30 L5,34 M6.5,29.5 L6.5,31.5 M6.5,32.5 L6.5,34.5" />
    
    <!-- 星宿微光点 -->
    <circle class="rune-dot" cx="50" cy="14" r="0.7" />
    <circle class="rune-dot" cx="14" cy="14" r="0.7" />
    <circle class="rune-dot" cx="50" cy="50" r="0.7" />
    <circle class="rune-dot" cx="14" cy="50" r="0.7" />
  </g>

  <!-- 3. 太极双仪几何流轨 (Taiji Flow Pathways - 白描虚实与流动流光) -->
  <g class="immortal-taiji-core-group">
    <!-- 太极外仪底环 -->
    <circle class="taiji-base-circle" cx="32" cy="32" r="21" />
    <circle class="taiji-flow-circle" cx="32" cy="32" r="21" />

    <!-- S 曲线阴阳分界流轨 -->
    <path class="taiji-s-base" d="M 32 11 A 10.5 10.5 0 0 1 32 32 A 10.5 10.5 0 0 0 32 53" />
    <path class="taiji-s-flow" d="M 32 11 A 10.5 10.5 0 0 1 32 32 A 10.5 10.5 0 0 0 32 53" />
    
    <!-- 上阳下阴虚线微弧 -->
    <path class="taiji-arc-yin" d="M 32 11 A 21 21 0 0 1 32 53" />
    <path class="taiji-arc-yang" d="M 32 11 A 21 21 0 0 0 32 53" />
  </g>

  <!-- 4. 天心本命飞剑 (Celestial Sword Axis) -->
  <g class="immortal-sword-axis">
    <!-- 剑身基底 (工笔银白) -->
    <line class="sword-blade" x1="32" y1="12" x2="32" y2="52" />
    <!-- 剑身奔流金芒 -->
    <line class="sword-blade-flow" x1="32" y1="12" x2="32" y2="52" />
    
    <!-- 剑格横翼与剑首 -->
    <line class="sword-guard" x1="28.5" y1="46" x2="35.5" y2="46" />
    <circle class="sword-pommel" cx="32" cy="53" r="1.2" />

    <!-- 剑尖破空流芒点 -->
    <circle class="sword-tip" cx="32" cy="11" r="1.5">
      <animate attributeName="opacity" values="0.4;0.95;0.4" dur="2.8s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- 5. 阴阳阵眼灵核 (Yin-Yang Node Cores with Independent Pulse) -->
  <!-- 阳鱼灵核 (霜华白) -->
  <circle class="node-core yang-core" cx="32" cy="21.5" r="2.2" />
  <circle class="node-glow yang-glow" cx="32" cy="21.5" r="4.5">
    <animate attributeName="opacity" values="0.25;0.7;0.25" dur="3.2s" repeatCount="indefinite" />
  </circle>

  <!-- 阴鱼灵核 (冷翠玉) -->
  <circle class="node-core yin-core" cx="32" cy="42.5" r="2.2" />
  <circle class="node-glow yin-glow" cx="32" cy="42.5" r="4.5">
    <animate attributeName="opacity" values="0.2;0.65;0.2" dur="3.8s" repeatCount="indefinite" />
  </circle>
</svg>
`;

export const IMMORTAL_SWORD_TRIGGER_SVG = IMMORTAL_BAGUA_TRIGGER_SVG;

// 2. 模态框：天机秘卷工笔飞檐切角框架 (八荒切角 · 四象角花 · 天心剑脉中轴)
export const IMMORTAL_SCROLL_FRAME_SVG = `
<svg class="immortal-scroll-svg" viewBox="0 0 400 660" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 背景微暗晕 -->
    <radialGradient id="immScrollPaperBg" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#11161b" />
      <stop offset="60%" stop-color="#0c1014" />
      <stop offset="100%" stop-color="#070a0c" />
    </radialGradient>
  </defs>

  <!-- 1. 宣纸主体底衬 (带八荒斜切角) -->
  <path d="M 24,10 L 376,10 L 392,26 L 392,634 L 376,650 L 24,650 L 8,634 L 8,26 Z" fill="url(#immScrollPaperBg)" stroke="rgba(196, 155, 79, 0.45)" stroke-width="0.9" />
  
  <!-- 2. 内层素玉墨线 (双层白描) -->
  <path d="M 26,14 L 374,14 L 388,28 L 388,632 L 374,646 L 26,646 L 12,632 L 12,28 Z" fill="none" stroke="rgba(111, 156, 150, 0.25)" stroke-width="0.6" stroke-dasharray="8,4" />

  <!-- 3. 四象工笔如意角花 (Corner Ornaments) -->
  <!-- 左上角花 -->
  <g stroke="rgba(196, 155, 79, 0.6)" stroke-width="0.8" fill="none">
    <path d="M 12,36 L 12,28 L 28,14 L 36,14" />
    <circle cx="20" cy="20" r="1.5" fill="#c49b4f" />
    <line x1="16" y1="24" x2="24" y2="16" stroke-width="0.5" />
  </g>
  <!-- 右上角花 -->
  <g stroke="rgba(196, 155, 79, 0.6)" stroke-width="0.8" fill="none">
    <path d="M 388,36 L 388,28 L 372,14 L 364,14" />
    <circle cx="380" cy="20" r="1.5" fill="#c49b4f" />
    <line x1="384" y1="24" x2="376" y2="16" stroke-width="0.5" />
  </g>
  <!-- 左下角花 -->
  <g stroke="rgba(196, 155, 79, 0.6)" stroke-width="0.8" fill="none">
    <path d="M 12,624 L 12,632 L 28,646 L 36,646" />
    <circle cx="20" cy="640" r="1.5" fill="#c49b4f" />
  </g>
  <!-- 右下角花 -->
  <g stroke="rgba(196, 155, 79, 0.6)" stroke-width="0.8" fill="none">
    <path d="M 388,624 L 388,632 L 372,646 L 364,646" />
    <circle cx="380" cy="640" r="1.5" fill="#c49b4f" />
  </g>

  <!-- 4. 顶部与底部飞檐挑角素金横梁 -->
  <line x1="40" y1="10" x2="360" y2="10" stroke="#c49b4f" stroke-width="1.2" opacity="0.8" />
  <circle cx="40" cy="10" r="2" fill="#6f9c96" stroke="#c49b4f" stroke-width="0.6" />
  <circle cx="360" cy="10" r="2" fill="#6f9c96" stroke="#c49b4f" stroke-width="0.6" />

  <line x1="40" y1="650" x2="360" y2="650" stroke="#c49b4f" stroke-width="1.2" opacity="0.8" />
  <circle cx="40" cy="650" r="2" fill="#6f9c96" stroke="#c49b4f" stroke-width="0.6" />
  <circle cx="360" cy="650" r="2" fill="#6f9c96" stroke="#c49b4f" stroke-width="0.6" />

  <!-- 5. 通顶天心剑脉中轴光轨 (Meridian Spine) -->
  <line x1="200" y1="20" x2="200" y2="640" stroke="rgba(196, 155, 79, 0.18)" stroke-width="0.8" stroke-dasharray="6,8" />
  
  <!-- 6. 中央太极道印水墨暗印 (透明度 0.035，空灵意境) -->
  <g opacity="0.035" stroke="#e2e8f0" stroke-width="1" fill="none">
    <circle cx="200" cy="330" r="110" />
    <circle cx="200" cy="330" r="70" />
    <circle cx="200" cy="330" r="30" stroke-dasharray="4,4" />
    <path d="M 200 220 A 55 55 0 0 1 200 330 A 55 55 0 0 0 200 440" />
  </g>
</svg>
`;

// 3. 通用全屏通话/窃听按键高精 SVG (素雅白描)
export const HANGUP_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f87171" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
export const ANSWER_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#7eb2a8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
export const PLAY_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c2a675" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

// 4. 仙侠修真子应用图标全景映射 (工笔白描 · 素雅单色)
export const IMMORTAL_APP_ICONS = {
    phone_call: {
        name: '飞剑传书',
        desc: '本命飞剑，神识传音万里直达',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c2a675" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`
    },
    incoming_call: {
        name: '飞剑传书',
        desc: '万里传音，接启道友飞剑传书',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c2a675" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`
    },
    eavesdrop: {
        name: '神识探查',
        desc: '神识入微，聆听天地道友秘语',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#7eb2a8" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="#7eb2a8"/></svg>`
    },
    workshop: {
        name: '天机工坊',
        desc: '推演天机奇遇，定制修真剧本',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c2a675" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/></svg>`
    },
    favorites: {
        name: '灵宝道藏',
        desc: '珍藏仙音玉简与前尘回响',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#8cb5ae" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    },
    theme_store: {
        name: '万象幻境',
        desc: '变幻天地异象与仙家气象',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#a094b8" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a5 5 0 0 0 0 10 5 5 0 0 1 0 10"/><circle cx="12" cy="7" r="1.2" fill="currentColor"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/></svg>`
    },
    settings: {
        name: '洞府法仪',
        desc: '调整传音法阵与神识参数',
        icon: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
    }
};

// 5. 全屏沉浸式通话背景：极简水墨剑印水印
export const IMMORTAL_WATERMARK_SVG = `
<svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="150" cy="150" r="130" stroke="currentColor" stroke-width="0.8" stroke-dasharray="8,6" opacity="0.25" />
  <circle cx="150" cy="150" r="90" stroke="currentColor" stroke-width="0.6" opacity="0.3" />
  <g opacity="0.35" stroke="currentColor" stroke-width="0.8">
    <circle cx="150" cy="150" r="50" />
    <path d="M 150 100 A 25 25 0 0 1 150 150 A 25 25 0 0 0 150 200" fill="none" />
    <circle cx="150" cy="125" r="4" fill="currentColor" />
    <circle cx="150" cy="175" r="4" fill="none" stroke-width="1" />
  </g>
</svg>
`;
