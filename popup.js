document.getElementById('startTyping').addEventListener('click', async () => {
    const text = document.getElementById('textInput').value;
    
    // Nếu ô nhập liệu trong popup trống, bắn thông báo cảnh báo
    if (!text) {
        showNotification('Cảnh báo', 'Vui lòng điền văn bản vào ô trống trước!');
        return;
    }

    try {
        // 1. Lấy thông tin tab hiện tại đang mở
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
            throw new Error("Không thể xác định được tab hiện tại.");
        }

        // 2. Thực thi script gõ chữ bằng cách tiêm (inject) vào tab Outlier
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: simulateHumanTyping,
            args: [text]
        });

        // 3. Đọc kết quả trả về từ môi trường trang web để bắn thông báo tương ứng
        if (results && results[0] && results[0].result) {
            const response = results[0].result;
            
            if (response.error) {
                showNotification('Lỗi ứng dụng', response.error);
            } else if (response.success) {
                showNotification('Thành công', 'Đã hoàn thành việc gõ văn bản tự động!');
            }
        }

    } catch (error) {
        console.error("Extension Error:", error);
        // Bắt các lỗi bảo mật của Chrome (ví dụ: cố tình bấm extension ở trang cài đặt chrome://)
        showNotification('Lỗi hệ thống', `Không thể chạy trên trang này. Khung bảo mật trình duyệt đã chặn script.`);
    }
});

/**
 * Hàm hỗ trợ hiển thị thông báo đẩy (Native Push Notification) của Chrome
 */
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'typing.png', // Sử dụng luôn file icon typing.png của bạn
        title: title,
        message: message,
        priority: 2
    });
}

/**
 * HÀM NÀY SẼ CHẠY TRỰC TIẾP TRÊN MÔI TRƯỜNG CỦA TRANG WEB (OUTLIER AI)
 * @param {string} textToType - Đoạn văn bản cần gõ tự động
 */
async function simulateHumanTyping(textToType) {
    const activeEl = document.activeElement;
    
    // Kiểm tra ô nhập liệu bằng thuộc tính isContentEditable (Bao quát, chính xác tuyệt đối)
    const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
    );

    if (!isEditable) {
        return { error: 'Bạn chưa click chuột chọn ô nhập liệu nào trên trang (hoặc ô này bị khóa)!' };
    }

    activeEl.focus();

    // Duyệt qua từng ký tự để tiến hành giả lập gõ phím
    for (let i = 0; i < textToType.length; i++) {
        const char = textToType[i];
        
        // Phương án 1: Dùng execCommand để giả lập hành vi gõ thuần túy qua mặt bộ chặn paste
        const success = document.execCommand('insertText', false, char);
        
        // Phương án 2 (Fallback): Nếu phương án 1 thất bại/không hỗ trợ, kích hoạt bộ dự phòng hiện đại
        if (!success) {
            if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
                // Xử lý thủ công cho thẻ input/textarea truyền thống
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                const text = activeEl.value;
                
                activeEl.value = text.slice(0, start) + char + text.slice(end);
                activeEl.selectionStart = activeEl.selectionEnd = start + 1;
                
                // Bắn các sự kiện chuẩn của DOM để báo cho framework (React/Vue) cập nhật dữ liệu ngầm
                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                activeEl.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                // Xử lý thủ công cho các khung Rich Editor (thẻ div contenteditable)
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    
                    const textNode = document.createTextNode(char);
                    range.insertNode(textNode);
                    range.collapse(false); // Đưa con trỏ chuột ra sau ký tự vừa gõ
                    
                    // Bắn sự kiện InputEvent đặc thù của khung soạn thảo hiện đại
                    activeEl.dispatchEvent(new InputEvent('input', {
                        bubbles: true,
                        inputType: 'insertText',
                        data: char
                    }));
                }
            }
        }
        
        // Khoảng trễ ngẫu nhiên từ 10ms đến 20ms giữa mỗi ký tự để giả lập tốc độ người gõ siêu tốc
        const delay = Math.random() * 10 + 10;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return { success: true };
}