/**
 * 夜之城·边缘行者 (cyberpunk_edgerunners) - 专属高精矢量资产库
 * 追求极高对比度赛博霓虹与战术 HUD 美学：明黄 · 赛博青 · 荒坂红 · 100% 矢量
 */

// 1. 悬浮入口：修长飘逸 · 锋利光刃赛博字母 "V" (流线锐角 · 激光细纹裂口 · 速度感拖尾)
export const CYBERPUNK_TRIGGER_SVG = `
<svg class="cyber-trigger-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 极清透高能霓虹辉光滤镜 -->
    <filter id="cyberVGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="cyberVBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF800" />
      <stop offset="70%" stop-color="#FFE600" />
      <stop offset="100%" stop-color="#FFB300" />
    </linearGradient>
  </defs>

  <!-- 核心：修长飘逸 字母 "V" (光刃轮廓 + 贯穿细线裂口 + 残影流光) -->
  <g class="cyber-v-root" filter="url(#cyberVGlow)">
    
    <!-- 1. RGB 故障色散层：绯红幽灵影 (Glitch Red) -->
    <g class="cyber-v-rgb-layer cyber-v-rgb-red">
      <path d="M 18,10 C 20,16 26,38 31,52 C 34,42 43,18 47,8 L 41,9 C 37,22 31,40 30,45 C 26,34 22,18 20,10 Z" />
    </g>

    <!-- 2. RGB 故障色散层：电青幽灵影 (Glitch Cyan) -->
    <g class="cyber-v-rgb-layer cyber-v-rgb-cyan">
      <path d="M 18,10 C 20,16 26,38 31,52 C 34,42 43,18 47,8 L 41,9 C 37,22 31,40 30,45 C 26,34 22,18 20,10 Z" />
    </g>

    <!-- 3. 主体：修长飘逸主光刃 (Sharp Flowing V Blade) -->
    <path class="cyber-v-blade-main"
          d="M 18,10 C 20,16 26,38 31,52 C 34,42 43,18 47,8 L 41,9 C 37,22 31,40 30,45 C 26,34 22,18 20,10 Z"
          fill="url(#cyberVBladeGrad)" />

    <!-- 4. 飘逸光刃飞掠残影 (Trailing Speed Lines) -->
    <path class="cyber-v-speed-trail" d="M 13,15 C 15,22 20,38 24,46" stroke="#FFE600" stroke-width="0.9" stroke-linecap="round" opacity="0.85" />
    <path class="cyber-v-speed-trail" d="M 9,21 C 11,26 15,36 18,41" stroke="#00F0FF" stroke-width="0.6" stroke-linecap="round" opacity="0.75" />
    
    <!-- 右翼上扬刺芒 -->
    <path class="cyber-v-speed-trail" d="M 44,14 L 51,5" stroke="#FFE600" stroke-width="1" stroke-linecap="round" />
    <path class="cyber-v-speed-trail" d="M 47,20 L 53,12" stroke="#00F0FF" stroke-width="0.6" stroke-linecap="round" opacity="0.8" />
  </g>
</svg>
`;

// 2. 模态框：开放式全景 Cyberdeck 战术光芒导轨 (Open Cyberdeck Holo-Frame)
export const CYBERPUNK_HUD_FRAME_SVG = `
<svg class="cyber-frame-svg" viewBox="0 0 540 660" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 极深邃半透碳黑底衬 (通透 · 高对比度) -->
    <radialGradient id="cyberCarbonBg" cx="50%" cy="30%" r="90%">
      <stop offset="0%" stop-color="#0b1220" stop-opacity="0.94" />
      <stop offset="60%" stop-color="#070b14" stop-opacity="0.97" />
      <stop offset="100%" stop-color="#030509" stop-opacity="0.99" />
    </radialGradient>
    <linearGradient id="cyberFrameBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE600" />
      <stop offset="50%" stop-color="#00F0FF" />
      <stop offset="100%" stop-color="rgba(0, 240, 255, 0.3)" />
    </linearGradient>
  </defs>

  <!-- 1. 战术 45° 倒切角主体轮廓 (极细 0.9px 纯净光轨) -->
  <path d="M 24,10 L 516,10 L 530,24 L 530,636 L 516,650 L 24,650 L 10,636 L 10,24 Z" 
        fill="url(#cyberCarbonBg)" 
        stroke="url(#cyberFrameBorderGrad)" 
        stroke-width="0.9" />

  <!-- 2. 四角极简光刃角标 (Corner Blade Accents) -->
  <g stroke="#FFE600" stroke-width="1.2" fill="none">
    <path d="M 10,32 L 10,24 L 24,10 L 32,10" />
    <path d="M 530,32 L 530,24 L 516,10 L 508,10" />
  </g>
  <g stroke="#00F0FF" stroke-width="1.2" fill="none">
    <path d="M 10,628 L 10,636 L 24,650 L 32,650" />
    <path d="M 530,628 L 530,636 L 516,650 L 508,650" />
  </g>

  <!-- 3. 顶部与底部战术数据导轨 (Top/Bottom Status Lines) -->
  <line x1="160" y1="10" x2="380" y2="10" stroke="#FFE600" stroke-width="1.2" />
  <line x1="200" y1="650" x2="340" y2="650" stroke="#00F0FF" stroke-width="1" stroke-dasharray="8,6" />
</svg>
`;

// 迷你飘逸光刃 V 徽标 (用于 Header)
export const CYBER_MINI_V_ICON = `
<svg viewBox="0 0 24 24" width="18" height="18" fill="none" style="overflow:visible; filter:drop-shadow(0 0 6px #FFE600);">
  <path d="M 5,3 C 6,6 9,15 12,21 C 14,16 18,6 20,2 L 17,2.5 C 15,7 12,16 11.5,18 C 9.5,13 7.5,6 6.5,3 Z" fill="#FFE600" />
  <path d="M 3,6 C 4,9 6,15 8,19" stroke="#00F0FF" stroke-width="0.8" stroke-linecap="round" />
</svg>
`;

// 3. 专属 100% 细线高精矢量 App 图标库 (严禁 Emoji)
export const CYBER_ICONS = {
  // ① 来电：脑机通讯·神经直连 (Neuro-Link Cyber Comms)
  incoming_call: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- 脑机接口神经节点 -->
    <circle cx="12" cy="12" r="3.2" />
    <!-- 战术声波辐射弧 -->
    <path d="M 7.5 7.5 A 6.5 6.5 0 0 0 7.5 16.5" />
    <path d="M 16.5 7.5 A 6.5 6.5 0 0 1 16.5 16.5" />
    <path d="M 4 4 A 11.5 11.5 0 0 0 4 20" />
    <path d="M 20 4 A 11.5 11.5 0 0 1 20 20" />
    <!-- 核心光脉冲点 -->
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ② 对话追踪：深网潜行·频段截获 (Deep-Net ICE Signal Sniffer)
  eavesdrop: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- 多边形黑客 ICE 破冰锥 -->
    <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" stroke-dasharray="2,1.5" opacity="0.6" />
    <!-- 雷达扫描与波形 -->
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="12" x2="19" y2="8" stroke-width="1.5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ③ 剧本工坊：超梦刻录·矩阵重构 (Braindance Studio)
  workshop: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- 超梦神经头环与视镜 -->
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2,2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <path d="M 9 3 L 15 3" />
  </svg>
  `,

  // ④ 收藏夹：义体插件·核心记忆 (Bio-Chip Relic Vault)
  favorites: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- 军规 Relic 生物芯片主体 -->
    <rect x="5" y="4" width="14" height="16" rx="1.5" />
    <!-- 芯片插槽金手指 -->
    <line x1="8" y1="20" x2="8" y2="22" stroke-width="1.5" />
    <line x1="11" y1="20" x2="11" y2="22" stroke-width="1.5" />
    <line x1="13" y1="20" x2="13" y2="22" stroke-width="1.5" />
    <line x1="16" y1="20" x2="16" y2="22" stroke-width="1.5" />
    <!-- 内部神经记忆晶体 -->
    <polygon points="12,7 16,11 12,15 8,11" />
    <circle cx="12" cy="11" r="1.2" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ⑤ 主题工坊：义体医生·涂装改造 (Ripperdoc Clinic & Mod)
  theme_store: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- 机械义体手术臂 -->
    <path d="M 3 21 L 9 15 L 14 17 L 18 10" />
    <circle cx="18" cy="10" r="2.5" />
    <!-- 激光改造喷嘴与束流 -->
    <line x1="19.5" y1="8" x2="22" y2="5" stroke-width="1.5" />
    <path d="M 12 4 L 14 6" />
    <path d="M 16 3 L 17 5" />
    <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ⑥ 系统设置：底层内核·超频协议 (Cyber Kernel & Overclock)
  settings: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <!-- 八角形算力芯片 -->
    <polygon points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7" />
    <!-- 内部同心圆与超频齿轮 -->
    <circle cx="12" cy="12" r="5" stroke-dasharray="3,2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
  `,

  // ⑦ 主动拨号 (隐藏): 战术射频发射
  phone_call: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
  `,

  // ⑧ LLM 测试 (隐藏): 赛博神经中枢
  llm_test: `
  <svg class="cyber-app-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    <circle cx="15" cy="9" r="1.5" fill="currentColor" />
    <line x1="8" y1="15" x2="16" y2="15" stroke-width="1.5" />
    <line x1="12" y1="1" x2="12" y2="4" />
  </svg>
  `,

  // ⑨ 通用操作矢量
  close: `
  <svg class="cyber-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
  `,
  back: `
  <svg class="cyber-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
  `,
  play: `
  <svg class="cyber-action-icon" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
  `,
  pause: `
  <svg class="cyber-action-icon" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
  `,
  hangup: `
  <svg class="cyber-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.12-8.68A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
  </svg>
  `,
  answer: `
  <svg class="cyber-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
  `
};

// 4. 背景水印：夜之城战术 HUD 雷达网格 (Night City HUD Radar Watermark)
export const CYBER_WATERMARK_SVG = `
<svg class="cyber-bg-watermark-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="100,10 190,55 190,145 100,190 10,145 10,55" stroke="rgba(255, 230, 0, 0.04)" stroke-width="1.2" />
  <circle cx="100" cy="100" r="70" stroke="rgba(0, 240, 255, 0.04)" stroke-width="0.8" stroke-dasharray="4,4" />
  <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(0, 240, 255, 0.03)" stroke-width="0.6" />
  <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(0, 240, 255, 0.03)" stroke-width="0.6" />
  <circle cx="100" cy="100" r="28" stroke="rgba(255, 0, 60, 0.04)" stroke-width="0.8" />
</svg>
`;
