/**
 * 仙途凌霄 (immortal_sword) - 专属高奢矢量 SVG 资产库
 * 拟物化「太虚凌霄仙剑」悬浮灵器 | 仙门天机卷轴框架 | 玉简道印
 */

// 1. 悬浮入口：先天太极八卦阴阳鱼灵珠 (高奢水墨金丝 · 乾坤八卦 · 阴阳鱼流转)
export const IMMORTAL_BAGUA_TRIGGER_SVG = `
<svg class="immortal-bagua-trigger-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 羊脂白玉阳鱼渐变 -->
    <linearGradient id="yangJadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#f8fafc" />
      <stop offset="85%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>

    <!-- 玄墨曜石阴鱼渐变 -->
    <linearGradient id="yinObsidianGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- 乾坤八卦金丝渐变 -->
    <linearGradient id="baguaGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>

    <!-- 太极聚气发光滤镜 -->
    <filter id="taijiAuraGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- 1. 外层八卦灵光底盘 -->
  <circle cx="32" cy="32" r="30" fill="rgba(6, 30, 24, 0.92)" stroke="url(#baguaGoldGrad)" stroke-width="1.2" filter="url(#taijiAuraGlow)" />
  <circle cx="32" cy="32" r="27.5" stroke="#34d399" stroke-width="0.6" stroke-dasharray="3,2" opacity="0.6" />

  <!-- 2. 八卦八方卦爻符号环 (乾☰ 坤☷ 坎☵ 离☲ 等) -->
  <g class="bagua-trigrams" stroke="url(#baguaGoldGrad)" stroke-width="0.9" stroke-linecap="round" opacity="0.85">
    <!-- 乾 (上 12点) -->
    <line x1="30" y1="5.5" x2="34" y2="5.5" /><line x1="30" y1="7" x2="34" y2="7" /><line x1="30" y1="8.5" x2="34" y2="8.5" />
    <!-- 坤 (下 6点) -->
    <line x1="29.5" y1="55.5" x2="31.5" y2="55.5" /><line x1="32.5" y1="55.5" x2="34.5" y2="55.5" />
    <line x1="29.5" y1="57" x2="31.5" y2="57" /><line x1="32.5" y1="57" x2="34.5" y2="57" />
    <line x1="29.5" y1="58.5" x2="31.5" y2="58.5" /><line x1="32.5" y1="58.5" x2="34.5" y2="58.5" />
    <!-- 离 (右 3点) -->
    <line x1="55.5" y1="30" x2="55.5" y2="34" /><line x1="57" y1="29.5" x2="57" y2="31.5" /><line x1="57" y1="32.5" x2="57" y2="34.5" /><line x1="58.5" y1="30" x2="58.5" y2="34" />
    <!-- 坎 (左 9点) -->
    <line x1="5.5" y1="29.5" x2="5.5" y2="31.5" /><line x1="5.5" y1="32.5" x2="5.5" y2="34.5" /><line x1="7" y1="30" x2="7" y2="34" /><line x1="8.5" y1="29.5" x2="8.5" y2="31.5" /><line x1="8.5" y1="32.5" x2="8.5" y2="34.5" />
  </g>

  <!-- 3. 太极内圈：阴阳双鱼 (独立旋转容器) -->
  <g class="taiji-fish-wheel" style="transform-origin: 32px 32px;">
    <!-- 基础背景圆 (阴鱼底) -->
    <circle cx="32" cy="32" r="21" fill="url(#yinObsidianGrad)" stroke="#fbbf24" stroke-width="0.8" />

    <!-- 阳鱼主体 (S 型半弧 + 头部阳半圆) -->
    <!-- 阳鱼半圆与S形交融 (白色玉质) -->
    <path d="M 32 11 A 21 21 0 0 1 32 53 A 10.5 10.5 0 0 1 32 32 A 10.5 10.5 0 0 0 32 11 Z" fill="url(#yangJadeGrad)" />

    <!-- 阴鱼头部 (黑色半圆融入上半部) -->
    <circle cx="32" cy="21.5" r="10.5" fill="url(#yangJadeGrad)" />

    <!-- 阳鱼眼 (白鱼中的黑眼) -->
    <circle cx="32" cy="21.5" r="3.2" fill="url(#yinObsidianGrad)" stroke="#fbbf24" stroke-width="0.6" />
    <circle cx="32" cy="21.5" r="1.2" fill="#fbbf24" />

    <!-- 阴鱼眼 (黑鱼中的白眼) -->
    <circle cx="32" cy="42.5" r="3.2" fill="url(#yangJadeGrad)" stroke="#fbbf24" stroke-width="0.6" />
    <circle cx="32" cy="42.5" r="1.2" fill="#34d399" />

    <!-- S 曲线金丝交界缝 -->
    <path d="M 32 11 A 10.5 10.5 0 0 1 32 32 A 10.5 10.5 0 0 0 32 53" fill="none" stroke="#fbbf24" stroke-width="0.6" opacity="0.6" />
  </g>
</svg>
`;

export const IMMORTAL_SWORD_TRIGGER_SVG = IMMORTAL_BAGUA_TRIGGER_SVG;

// 2. 模态框：古风仙门天机卷轴 / 水墨宣纸长卷框架 (带有上下青玉轴头与金丝侧边)
export const IMMORTAL_SCROLL_FRAME_SVG = `
<svg class="immortal-scroll-svg" viewBox="0 0 400 660" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 青玉轴头渐变 -->
    <linearGradient id="jadeRollerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="20%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#a7f3d0" />
      <stop offset="80%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <!-- 云锦流金轴顶渐变 -->
    <linearGradient id="goldCapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="50%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <!-- 宣纸长卷微透背景 -->
    <radialGradient id="scrollPaperBg" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="rgba(4, 28, 22, 0.95)" />
      <stop offset="65%" stop-color="rgba(3, 20, 16, 0.97)" />
      <stop offset="100%" stop-color="rgba(1, 10, 8, 0.99)" />
    </radialGradient>
    <!-- 金丝流光边框滤镜 -->
    <filter id="goldSilkGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- 卷轴宣纸主体底衬 -->
  <rect x="12" y="16" width="376" height="628" rx="8" fill="url(#scrollPaperBg)" stroke="#064e3b" stroke-width="1.5" />

  <!-- 左右金丝水墨侧边暗纹 -->
  <line x1="22" y1="30" x2="22" y2="630" stroke="#fbbf24" stroke-width="1" stroke-dasharray="8,4" opacity="0.45" />
  <line x1="378" y1="30" x2="378" y2="630" stroke="#fbbf24" stroke-width="1" stroke-dasharray="8,4" opacity="0.45" />

  <!-- 顶部青玉卷轴轴杆 -->
  <g class="scroll-top-roller">
    <!-- 轴杆底木 -->
    <rect x="4" y="6" width="392" height="12" rx="6" fill="url(#jadeRollerGrad)" stroke="#fbbf24" stroke-width="1" filter="url(#goldSilkGlow)" />
    <!-- 左轴玉帽 -->
    <circle cx="8" cy="12" r="5" fill="url(#goldCapGrad)" stroke="#064e3b" stroke-width="0.8" />
    <circle cx="8" cy="12" r="2" fill="#34d399" />
    <!-- 右轴玉帽 -->
    <circle cx="392" cy="12" r="5" fill="url(#goldCapGrad)" stroke="#064e3b" stroke-width="0.8" />
    <circle cx="392" cy="12" r="2" fill="#34d399" />
    <!-- 轴中央金丝灵符卡扣 -->
    <rect x="190" y="4" width="20" height="16" rx="2" fill="url(#goldCapGrad)" stroke="#064e3b" stroke-width="0.6" />
    <circle cx="200" cy="12" r="2" fill="#064e3b" />
  </g>

  <!-- 底部青玉卷轴轴杆 -->
  <g class="scroll-bottom-roller">
    <rect x="4" y="642" width="392" height="12" rx="6" fill="url(#jadeRollerGrad)" stroke="#fbbf24" stroke-width="1" filter="url(#goldSilkGlow)" />
    <circle cx="8" cy="648" r="5" fill="url(#goldCapGrad)" stroke="#064e3b" stroke-width="0.8" />
    <circle cx="8" cy="648" r="2" fill="#34d399" />
    <circle cx="392" cy="648" r="5" fill="url(#goldCapGrad)" stroke="#064e3b" stroke-width="0.8" />
    <circle cx="392" cy="648" r="2" fill="#34d399" />
  </g>

  <!-- 长卷内页修仙水墨暗印 (居中太极云纹水印) -->
  <g opacity="0.04" stroke="#34d399" stroke-width="2" fill="none">
    <circle cx="200" cy="330" r="100" />
    <circle cx="200" cy="330" r="60" />
    <path d="M 200 230 A 50 50 0 0 1 200 330 A 50 50 0 0 0 200 430" />
  </g>
</svg>
`;

// 3. 通用全屏通话/窃听按键高精 SVG
export const HANGUP_SVG = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fca5a5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
export const ANSWER_SVG = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
export const PLAY_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

// 4. 仙侠修真子应用图标全景映射
export const IMMORTAL_APP_ICONS = {
    phone_call: {
        name: '飞剑传书',
        desc: '祭出本命飞剑，神识传音直达仙友',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`
    },
    incoming_call: {
        name: '飞剑传书',
        desc: '万里传音，接启道友飞剑传书',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>`
    },
    eavesdrop: {
        name: '神识探查',
        desc: '神识入微，聆听天地道友秘语',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#67e8f9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`
    },
    workshop: {
        name: '天机工坊',
        desc: '推演天机奇遇，定制修真剧本',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/></svg>`
    },
    favorites: {
        name: '灵宝道藏',
        desc: '珍藏仙音玉简与前尘回响',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#a7f3d0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    },
    theme_store: {
        name: '万象幻境',
        desc: '变幻天地异象与仙家气象',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c084fc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a5 5 0 0 0 0 10 5 5 0 0 1 0 10"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></svg>`
    },
    settings: {
        name: '洞府法仪',
        desc: '调整传音法阵与神识参数',
        icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
    }
};

// 5. 全屏沉浸式通话背景：九天太极剑印水印 (带太极八卦与剑阵环绕)
export const IMMORTAL_WATERMARK_SVG = `
<svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="150" cy="150" r="140" stroke="currentColor" stroke-width="1.5" stroke-dasharray="12,6" opacity="0.35" />
  <circle cx="150" cy="150" r="115" stroke="currentColor" stroke-width="1" opacity="0.4" />
  <circle cx="150" cy="150" r="85" stroke="currentColor" stroke-width="2" stroke-dasharray="6,4" opacity="0.5" />
  <g opacity="0.45" stroke="currentColor" stroke-width="1.5">
    <circle cx="150" cy="150" r="60" />
    <path d="M 150 90 A 30 30 0 0 1 150 150 A 30 30 0 0 0 150 210" fill="none" />
    <circle cx="150" cy="120" r="6" fill="currentColor" />
    <circle cx="150" cy="180" r="6" fill="none" stroke-width="2" />
  </g>
  <!-- 八荒剑气十字阵 -->
  <g stroke="currentColor" stroke-width="1.5" opacity="0.35">
    <line x1="150" y1="5" x2="150" y2="45" />
    <line x1="150" y1="255" x2="150" y2="295" />
    <line x1="5" y1="150" x2="45" y2="150" />
    <line x1="255" y1="150" x2="295" y2="150" />
  </g>
</svg>
`;
