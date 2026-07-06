document.getElementById('startTyping').addEventListener('click', async () => {
    const text = document.getElementById('textInput').value;
    
    // Nếu ô nhập liệu trong popup trống, bắn thông báo cảnh báo
    if (!text) {
        showPopupStatus('warning', '⚠️ Vui lòng điền văn bản vào ô trống trước!');
        return;
    }

    showPopupStatus('loading', '⏳ Đang gõ văn bản...');

    try {
        // 1. Lấy thông tin tab hiện tại đang mở
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            throw new Error("Không thể xác định được tab hiện tại.");
        }

        // 2. Thực thi script gõ chữ bằng cách tiêm (inject) vào tab
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: simulateHumanTypingWithToast,
            args: [text]
        });

        // 3. Đọc kết quả trả về từ môi trường trang web
        if (results && results[0] && results[0].result) {
            const response = results[0].result;
            
            if (response.error) {
                showPopupStatus('error', '❌ ' + response.error);
            } else if (response.success) {
                showPopupStatus('success', '✅ Đã hoàn thành gõ văn bản!');
            }
        }

    } catch (error) {
        console.error("Extension Error:", error);
        showPopupStatus('error', '❌ Không thể chạy trên trang này. Trình duyệt đã chặn script.');
    }
});

/**
 * Hiển thị trạng thái ngay trong popup (thay thế alert)
 */
function showPopupStatus(type, message) {
    let statusEl = document.getElementById('statusMsg');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'statusMsg';
        document.body.appendChild(statusEl);
    }

    const colors = {
        success: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
        error:   { bg: '#fee2e2', border: '#fca5a5', text: '#7f1d1d' },
        warning: { bg: '#fef3c7', border: '#fcd34d', text: '#78350f' },
        loading: { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a5f' },
    };
    const c = colors[type] || colors.loading;

    statusEl.style.cssText = `
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        background: ${c.bg};
        border: 1px solid ${c.border};
        color: ${c.text};
        transition: all 0.3s ease;
    `;
    statusEl.textContent = message;
}

/**
 * HÀM NÀY SẼ CHẠY TRỰC TIẾP TRÊN MÔI TRƯỜNG CỦA TRANG WEB
 * Bao gồm: gõ văn bản + hiển thị toast ở góc dưới bên phải
 * @param {string} textToType - Đoạn văn bản cần gõ tự động
 */
async function simulateHumanTypingWithToast(textToType) {

    // ── Helper: hiển thị toast góc dưới phải ───────────────────────────────
    function showToast(type, title, message) {
        const toastId = '__autoTyperToast__';
        // Xóa toast cũ nếu còn tồn tại
        const old = document.getElementById(toastId);
        if (old) old.remove();

        const colors = {
            success: { bg: '#ecfdf5', border: '#34d399', icon: '✅', accent: '#059669' },
            error:   { bg: '#fef2f2', border: '#f87171', icon: '❌', accent: '#dc2626' },
            warning: { bg: '#fffbeb', border: '#fbbf24', icon: '⚠️', accent: '#d97706' },
        };
        const c = colors[type] || colors.success;

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            min-width: 280px;
            max-width: 360px;
            background: ${c.bg};
            border: 1.5px solid ${c.border};
            border-left: 5px solid ${c.accent};
            border-radius: 10px;
            padding: 14px 18px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            gap: 4px;
            opacity: 0;
            transform: translateX(40px);
            transition: opacity 0.35s ease, transform 0.35s ease;
            pointer-events: none;
        `;

        toast.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">${c.icon}</span>
                <span style="font-weight:700; font-size:14px; color:${c.accent};">${title}</span>
            </div>
            <div style="font-size:13px; color:#374151; margin-left:26px; line-height:1.5;">${message}</div>
            <div style="margin-top:8px; margin-left:26px; height:3px; border-radius:99px; background:#e5e7eb; overflow:hidden;">
                <div id="__toastBar__" style="height:100%; width:100%; background:${c.accent}; transition: width 3s linear; border-radius:99px;"></div>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });
        });

        // Shrink progress bar
        setTimeout(() => {
            const bar = document.getElementById('__toastBar__');
            if (bar) bar.style.width = '0%';
        }, 100);

        // Auto dismiss after 3.5s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }
    // ────────────────────────────────────────────────────────────────────────

    const activeEl = document.activeElement;
    
    // Kiểm tra ô nhập liệu
    const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
    );

    if (!isEditable) {
        showToast('error', 'Lỗi', 'Bạn chưa click chuột chọn ô nhập liệu nào trên trang (hoặc ô này bị khóa)!');
        return { error: 'Bạn chưa click chuột chọn ô nhập liệu nào trên trang (hoặc ô này bị khóa)!' };
    }

    activeEl.focus();

    // Duyệt qua từng ký tự để tiến hành giả lập gõ phím
    for (let i = 0; i < textToType.length; i++) {
        const char = textToType[i];
        
        // Phương án 1: execCommand
        const success = document.execCommand('insertText', false, char);
        
        // Phương án 2 (Fallback)
        if (!success) {
            if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                const text = activeEl.value;
                
                activeEl.value = text.slice(0, start) + char + text.slice(end);
                activeEl.selectionStart = activeEl.selectionEnd = start + 1;
                
                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                activeEl.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    
                    const textNode = document.createTextNode(char);
                    range.insertNode(textNode);
                    range.collapse(false);
                    
                    activeEl.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: char
                    }));
                }
            }
        }
        
        // Khoảng trễ ngẫu nhiên 10-20ms
        const delay = Math.random() * 10 + 10;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Hiển thị toast thành công góc dưới phải
    showToast('success', 'Hoàn thành!', `Đã gõ xong ${textToType.length} ký tự vào ô nhập liệu.`);
    
    return { success: true };
}