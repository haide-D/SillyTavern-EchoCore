/**
 * 轻量级纯原生 Canvas 圆形头像聚焦裁剪组件
 * 
 * 特性：
 * 1. 纯原生实现，零第三方包依赖，极轻量；
 * 2. 支持拖拽平移 (Pan) + 滚轮/滑块自由缩放 (Zoom)，轻松将全身/半身立绘对焦至面部特写；
 * 3. 半透明遮罩 + 中心圆形对焦框，所见即所得；
 * 4. 导出 512x512 高清头像并自动上传落盘。
 */

import { getApiHost } from './utils.js';

let _activeCropperCleanup = null;

/**
 * 打开头像圆形聚焦裁剪弹窗
 * 
 * @param {Object} options
 * @param {string|File|Blob} options.image - 图像源 (URL / DataURL / File / Blob)
 * @param {string} options.charName - 角色名称
 * @param {Function} options.onSuccess - 裁剪并上传成功回调 ({ avatar_url, dataUrl }) => void
 * @param {Function} [options.onCancel] - 取消回调
 */
export function openAvatarCropper({ image, charName = '角色', onSuccess, onCancel }) {
    if (_activeCropperCleanup) {
        _activeCropperCleanup();
    }

    const modalId = 'tts-avatar-cropper-modal';
    $(`#${modalId}`).remove();

    // 弹窗 HTML 结构
    const modalHtml = `
        <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.82); z-index:100000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); user-select:none;">
            <div style="width:380px; max-width:92vw; background:linear-gradient(145deg, #181528, #110e1d); border:1px solid rgba(196,155,79,0.45); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:14px; box-shadow:0 16px 48px rgba(0,0,0,0.85); color:#f3f4f6;">
                
                <!-- 头部 -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(196,155,79,0.25); padding-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:17px;">🎯</span>
                        <span style="font-weight:600; color:#fde047; font-size:14.5px; letter-spacing:0.5px;">聚焦【${charName}】头像特写</span>
                    </div>
                    <button id="cropper-btn-close" style="background:transparent; border:none; color:#9ca3af; font-size:22px; cursor:pointer; line-height:1; padding:0 4px;">×</button>
                </div>

                <!-- 视口提示 -->
                <div style="font-size:11.5px; color:#94a3b8; line-height:1.4; background:rgba(255,255,255,0.04); padding:6px 10px; border-radius:8px; border-left:3px solid #f59e0b;">
                    💡 <b>拖动</b> 调整位置，<b>滑动滚轮/滑块</b> 缩放大小，将面部对准中心圆框。
                </div>

                <!-- Canvas 画布容器 -->
                <div style="position:relative; width:100%; height:280px; background:#08060f; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.08); cursor:grab;" id="cropper-canvas-wrapper">
                    <canvas id="cropper-canvas" width="280" height="280" style="display:block; width:280px; height:280px;"></canvas>
                    <div id="cropper-loading" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(10,8,20,0.85); color:#cbd5e1; font-size:13px; gap:8px;">
                        <span>⏳ 正在载入画质...</span>
                    </div>
                </div>

                <!-- 缩放控制滑块 -->
                <div style="display:flex; align-items:center; gap:10px; padding:0 4px;">
                    <span style="font-size:13px; color:#94a3b8; cursor:pointer;" id="cropper-zoom-out" title="缩小">🔍-</span>
                    <input type="range" id="cropper-scale-slider" min="0.2" max="4.0" step="0.01" value="1.0" style="flex:1; accent-color:#f59e0b; cursor:pointer;">
                    <span style="font-size:13px; color:#94a3b8; cursor:pointer;" id="cropper-zoom-in" title="放大">🔍+</span>
                    <button id="cropper-btn-reset" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; font-size:11px; padding:3px 8px; border-radius:6px; cursor:pointer;" title="重置位置与缩放">重置</button>
                </div>

                <!-- 底部操作按钮 -->
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:4px;">
                    <button id="cropper-btn-cancel" style="padding:8px 16px; font-size:12.5px; border-radius:8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; cursor:pointer;">
                        取消
                    </button>
                    <button id="cropper-btn-confirm" style="padding:8px 20px; font-size:12.5px; font-weight:600; border-radius:8px; background:linear-gradient(135deg, #d97706, #b45309); border:1px solid #f59e0b; color:#fff; cursor:pointer; box-shadow:0 4px 14px rgba(217,119,6,0.4); display:flex; align-items:center; gap:6px;">
                        <span>💾 确认并对焦保存</span>
                    </button>
                </div>

            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const $modal = $(`#${modalId}`);
    const canvas = document.getElementById('cropper-canvas');
    const ctx = canvas.getContext('2d');
    const $wrapper = $('#cropper-canvas-wrapper');
    const $slider = $('#cropper-scale-slider');
    const $loading = $('#cropper-loading');
    const $btnConfirm = $('#cropper-btn-confirm');

    const VIEW_SIZE = 280;
    const CROP_RADIUS = 100; // 圆形裁剪半径（直径 200px）
    const CENTER = VIEW_SIZE / 2;

    // 状态
    let img = new Image();
    let isLoaded = false;
    let scale = 1.0;
    let baseScale = 1.0;
    let posX = CENTER;
    let posY = CENTER;
    let isDragging = false;
    let startDragX = 0;
    let startDragY = 0;
    let initialPosX = 0;
    let initialPosY = 0;

    // 绘制主函数
    function render() {
        if (!isLoaded) return;

        ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

        // 1. 绘制底层图片
        ctx.save();
        ctx.translate(posX, posY);
        ctx.scale(scale, scale);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // 2. 绘制暗色半透明蒙版，挖空中心圆形
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.rect(0, 0, VIEW_SIZE, VIEW_SIZE);
        ctx.arc(CENTER, CENTER, CROP_RADIUS, 0, Math.PI * 2, true); // 逆时针镂空
        ctx.fill();

        // 3. 绘制中心对焦圆框金色高亮描边
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, CROP_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // 4. 绘制中心辅助细虚线十字（帮助定位面部中心）
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.setLineDash([4, 4]);

        // 十字准星
        ctx.beginPath();
        ctx.moveTo(CENTER - 15, CENTER);
        ctx.lineTo(CENTER + 15, CENTER);
        ctx.moveTo(CENTER, CENTER - 15);
        ctx.lineTo(CENTER, CENTER + 15);
        ctx.stroke();

        ctx.restore();
    }

    // 初始化图片加载
    function initImage(src) {
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            isLoaded = true;
            $loading.hide();

            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;

            // 自动计算让图片完全填满圆形的初始基准缩放比
            const minDimension = Math.min(w, h);
            baseScale = (CROP_RADIUS * 2.2) / minDimension;
            scale = baseScale;

            // 默认头部偏上（将立绘向上偏移15%以大致对准头部）
            posX = CENTER;
            posY = CENTER + (h * scale * 0.12);

            $slider.val(scale / baseScale);
            render();
        };

        img.onerror = () => {
            $loading.html('<span style="color:#f87171;">❌ 图片加载失败，请检查路径</span>');
        };

        if (typeof src === 'string') {
            img.src = src;
        } else if (src instanceof Blob || src instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(src);
        }
    }

    initImage(image);

    // 平移拖拽事件 (Pointer Events)
    $wrapper.on('pointerdown', (e) => {
        if (!isLoaded) return;
        isDragging = true;
        $wrapper.css('cursor', 'grabbing');
        startDragX = e.clientX;
        startDragY = e.clientY;
        initialPosX = posX;
        initialPosY = posY;
        $wrapper[0].setPointerCapture(e.pointerId);
    });

    $wrapper.on('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startDragX;
        const dy = e.clientY - startDragY;
        posX = initialPosX + dx;
        posY = initialPosY + dy;
        render();
    });

    const endDrag = (e) => {
        if (isDragging) {
            isDragging = false;
            $wrapper.css('cursor', 'grab');
            try {
                $wrapper[0].releasePointerCapture(e.pointerId);
            } catch (_) {}
        }
    };
    $wrapper.on('pointerup pointercancel', endDrag);

    // 鼠标滚轮缩放 (以中心为基准)
    $wrapper.on('wheel', (e) => {
        if (!isLoaded) return;
        e.preventDefault();
        const delta = e.originalEvent.deltaY;
        const zoomFactor = delta < 0 ? 1.08 : 0.92;
        
        let newScale = scale * zoomFactor;
        newScale = Math.max(baseScale * 0.3, Math.min(baseScale * 5.0, newScale));
        scale = newScale;

        $slider.val(scale / baseScale);
        render();
    });

    // 滑块缩放
    $slider.on('input', function () {
        if (!isLoaded) return;
        const ratio = parseFloat($(this).val()) || 1.0;
        scale = baseScale * ratio;
        render();
    });

    $('#cropper-zoom-in').on('click', () => {
        scale = Math.min(baseScale * 5.0, scale * 1.15);
        $slider.val(scale / baseScale);
        render();
    });

    $('#cropper-zoom-out').on('click', () => {
        scale = Math.max(baseScale * 0.3, scale / 1.15);
        $slider.val(scale / baseScale);
        render();
    });

    $('#cropper-btn-reset').on('click', () => {
        if (!isLoaded) return;
        scale = baseScale;
        const h = img.naturalHeight || img.height;
        posX = CENTER;
        posY = CENTER + (h * scale * 0.12);
        $slider.val(1.0);
        render();
    });

    // 关闭与清理
    const close = () => {
        $modal.remove();
        _activeCropperCleanup = null;
        if (typeof onCancel === 'function') onCancel();
    };

    _activeCropperCleanup = close;
    $('#cropper-btn-close, #cropper-btn-cancel').on('click', close);

    // 确认裁剪并导出 512x512 高清图像
    $btnConfirm.on('click', async () => {
        if (!isLoaded) return;

        $btnConfirm.prop('disabled', true).text('⏳ 正在对焦生成...');

        try {
            // 离屏 Canvas 生成 512x512 高清图
            const EXPORT_SIZE = 512;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = EXPORT_SIZE;
            offCanvas.height = EXPORT_SIZE;
            const offCtx = offCanvas.getContext('2d');

            // 比例转换因子
            const factor = EXPORT_SIZE / (CROP_RADIUS * 2); // 512 / 200 = 2.56

            // 在 offCanvas 上将目标对焦圆框中心映射到 (EXPORT_SIZE/2, EXPORT_SIZE/2)
            offCtx.save();
            offCtx.translate(EXPORT_SIZE / 2, EXPORT_SIZE / 2);
            offCtx.translate((posX - CENTER) * factor, (posY - CENTER) * factor);
            offCtx.scale(scale * factor, scale * factor);

            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            offCtx.drawImage(img, -w / 2, -h / 2, w, h);
            offCtx.restore();

            // 导出为 Blob
            const blob = await new Promise((resolve) => {
                offCanvas.toBlob(resolve, 'image/webp', 0.95);
            });

            const dataUrl = offCanvas.toDataURL('image/webp', 0.95);

            // 上传到后端落盘
            const apiHost = getApiHost();
            const formData = new FormData();
            const safeCharName = (charName || 'avatar').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
            formData.append('file', blob, `${safeCharName}_cropped_${Date.now()}.webp`);
            formData.append('speaker_name', charName);

            const res = await fetch(`${apiHost}/api/speakers/avatar/upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`上传保存失败: ${errText}`);
            }

            const resData = await res.json();
            console.log('[AvatarCropper] ✅ 头像对焦裁剪并保存成功:', resData);

            close();

            if (typeof onSuccess === 'function') {
                onSuccess({
                    avatar_url: resData.avatar_url,
                    dataUrl: dataUrl
                });
            }

            if (window.toastr) {
                window.toastr.success(`已成功为【${charName}】保存特写头像！`);
            }
        } catch (err) {
            console.error('[AvatarCropper] 裁剪保存异常:', err);
            if (window.toastr) {
                window.toastr.error(`头像保存失败: ${err.message || err}`);
            }
            $btnConfirm.prop('disabled', false).html('<span>💾 确认并对焦保存</span>');
        }
    });
}
