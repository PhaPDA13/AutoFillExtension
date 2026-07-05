document.getElementById('startTyping').addEventListener('click', async () => {
    const text = document.getElementById('textInput').value;
    if (!text) {
        alert('Vui lòng điền văn bản vào ô trống trước!');
        return;
    }

    // Lấy tab Outlier đang mở
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Truyền văn bản sang và thực thi hàm gõ chữ
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: simulateHumanTyping,
        args: [text] // Truyền biến text vào hàm bên dưới
    });
});

// Hàm này sẽ chạy trực tiếp trên môi trường của Outlier
async function simulateHumanTyping(textToType) {
    // Tìm phần tử bạn đang click chuột vào (Active Element)
    const activeEl = document.activeElement;
    
    if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA' && activeEl.getAttribute('contenteditable') !== 'true')) {
        alert('LỖI: Bạn chưa click chuột chọn ô nhập liệu nào trên trang Outlier!');
        return;
    }

    activeEl.focus();

    // Duyệt qua từng ký tự của đoạn văn bản
    for (let i = 0; i < textToType.length; i++) {
        const char = textToType[i];
        
        // Sử dụng insertText để đưa chữ vào mà không kích hoạt sự kiện "paste" (vượt qua bộ chặn paste)
        document.execCommand('insertText', false, char);
        
        // Tạo khoảng trễ ngẫu nhiên từ 5ms đến 15ms giữa các ký tự để mô phỏng người gõ siêu tốc
        // Khoảng trễ này giúp qua mặt các hệ thống phát hiện bot tự động điền chữ
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 10));
    }
}