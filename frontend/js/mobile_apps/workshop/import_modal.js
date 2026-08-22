/**
 * 剧本 JSON 导入 Modal 模块
 */
import { SVG } from './svgs.js';
import { importPreset } from './api.js';
import { showToast } from './executor.js';

export function openImportModal(category, onImported) {
    $('#ws-import-modal-overlay').remove();

    const modalHtml = `
        <div class="ws-modal-overlay show" id="ws-import-modal-overlay">
            <div class="ws-modal">
                <div class="ws-modal-header">
                    <h3 class="ws-modal-title">${SVG.import} 导入剧本 (.json)</h3>
                    <button class="ws-modal-close" id="ws-import-close-btn">✕</button>
                </div>
                <div class="ws-modal-body">
                    <div class="ws-form-group">
                        <label class="ws-form-label">方式 1: 选择本地 JSON 文件</label>
                        <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
                            <button type="button" class="ws-tool-btn ws-tool-btn-primary" id="ws-btn-choose-file" style="padding:6px 14px; font-size:12px; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                                ${SVG.import} 📁 浏览并选择文件
                            </button>
                            <span id="ws-chosen-filename" style="font-size:12px; color:rgba(220,200,150,0.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px;">未选择文件</span>
                            <input type="file" id="ws-file-input" accept=".json,application/json" style="display:none !important;">
                        </div>
                    </div>
                    <div class="ws-form-group" style="margin-top:12px;">
                        <label class="ws-form-label">方式 2: 直接粘贴 JSON 文本</label>
                        <textarea class="ws-textarea" id="ws-json-textarea" placeholder="在此粘贴完整的预设 JSON 对象..." style="height:140px;"></textarea>
                    </div>
                </div>
                <div class="ws-modal-footer">
                    <button class="ws-tool-btn ws-tool-btn-secondary" id="ws-import-cancel-btn">取消</button>
                    <button class="ws-tool-btn ws-tool-btn-primary" id="ws-import-confirm-btn">开始导入</button>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    const closeModal = () => $('#ws-import-modal-overlay').remove();
    $('#ws-import-close-btn, #ws-import-cancel-btn').on('click', closeModal);

    // 文件选择
    $('#ws-btn-choose-file').on('click', function () {
        $('#ws-file-input').val('').click();
    });

    $('#ws-file-input').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        $('#ws-chosen-filename').text(`📄 ${file.name}`).css('color', '#fef08a');
        const reader = new FileReader();
        reader.onload = function (evt) {
            $('#ws-json-textarea').val(evt.target.result);
        };
        reader.readAsText(file);
    });

    // 导入确认
    $('#ws-import-confirm-btn').on('click', async () => {
        const jsonStr = $('#ws-json-textarea').val().trim();
        if (!jsonStr) {
            alert('请选择文件或粘贴 JSON 内容');
            return;
        }

        try {
            const data = await importPreset(category, jsonStr);
            showToast(`成功导入剧本: ${data.preset?.name || '未知'}`);
            closeModal();
            if (typeof onImported === 'function') onImported();
        } catch (e) {
            alert(`导入失败: ${e.message}`);
        }
    });
}
