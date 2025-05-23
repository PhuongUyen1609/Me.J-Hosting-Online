// --- File: ../static/backend/libraryPreview.js ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("[LibraryPreview.js] DOM loaded. Waiting for library render events...");

    // Lấy tham chiếu đến các element của preview player trong panel
    // Giả định các ID này là duy nhất sau khi xóa HTML thừa
    const previewContainer = document.getElementById('library-preview-container');
    const previewInfo = document.getElementById('library-preview-info');
    const previewAudio = document.getElementById('library-preview-audio');

    // Kiểm tra xem các element cần thiết có tồn tại không
    if (!previewContainer || !previewInfo || !previewAudio) {
        console.error("[LibraryPreview.js] LỖI: Không tìm thấy các thành phần của preview player ('#library-preview-container', '#library-preview-info', '#library-preview-audio'). Chức năng Preview sẽ bị vô hiệu hóa.");
        return; // Thoát sớm nếu thiếu element
    }

    // --- Hàm để gắn listener click vào các item thư viện ---
    // Hàm này sẽ được gọi cả khi thư viện load lần đầu và khi kết quả tìm kiếm được hiển thị
    function attachPreviewClickListeners() {
        // Chọn tất cả các item thư viện bên trong container của panel
        const libraryItems = document.querySelectorAll('#music-library-carousel-inner .library-item');
        console.log(`[LibraryPreview.js] attachPreviewClickListeners: Tìm thấy ${libraryItems.length} library items để gắn listener click.`);

        // Duyệt qua từng item
        libraryItems.forEach(item => {
            // QUAN TRỌNG: Xóa bỏ listener 'click' cũ có thể đã tồn tại trên item này
            // để tránh việc gắn nhiều listener giống hệt nhau sau mỗi lần render/search.
            item.removeEventListener('click', handlePreviewClick);

            // Gắn listener 'click' mới, gọi hàm handlePreviewClick khi item được click
            item.addEventListener('click', handlePreviewClick);

             // (Tùy chọn) Thêm con trỏ chuột dạng 'pointer' để người dùng biết có thể click
            item.style.cursor = 'pointer';
        });
        console.log("[LibraryPreview.js] Đã gắn/cập nhật listener click cho các library items.");
    }

    // --- Hàm xử lý khi người dùng click vào một item thư viện để nghe thử ---
        // --- Hàm xử lý khi người dùng click vào một item thư viện để nghe thử (Đã sửa) ---
        function handlePreviewClick(event) {
            const item = event.currentTarget;
            const songId = item.dataset.songId;
    
            if (!songId) {
                console.warn("[LibraryPreview.js] Preview click bị hủy: Không tìm thấy 'songId' trong dataset của item.", item.dataset);
                alert("Không thể nghe thử bài hát này (thiếu ID).");
                 if (previewContainer) previewContainer.style.display = 'none';
                 if (previewInfo) previewInfo.textContent = "Không thể tải bản xem trước.";
                return; 
            }
            const songToPreview = musicLibrary.find(song => song.id === songId);
            if (!songToPreview) {
                console.error("[LibraryPreview.js] Lỗi Preview: Không tìm thấy dữ liệu bài hát trong musicLibrary cho ID:", songId);
                 alert("Không thể tìm thấy chi tiết bài hát để xem trước.");
                 if (previewContainer) previewContainer.style.display = 'none';
                 if (previewInfo) previewInfo.textContent = "Không thể tìm thấy bài hát.";
                return; // Dừng xử lý
            }
            console.log(`[LibraryPreview.js] Xử lý Preview Click cho bài hát: ${songToPreview.name || 'Không rõ tên'} (ID: ${songId})`);
            if (!songToPreview.url) {
                console.error("[LibraryPreview.js] Lỗi Preview: Song object thiếu 'url'.", songToPreview);
                alert("Không thể nghe thử bài hát này (thiếu đường dẫn stream/file).");
                 if (previewContainer) previewContainer.style.display = 'none';
                 if (previewInfo) previewInfo.textContent = "Không thể phát bản xem trước.";
                return; // Dừng xử lý
            }
    
            if (previewInfo) {
                const displayText = `${songToPreview.artist || 'Unknown Artist'} - ${songToPreview.name || 'Unknown Track'}`;
                previewInfo.textContent = displayText; // Hiển thị tên nghệ sĩ - tên bài hát
                previewInfo.title = displayText; // Thêm title attribute để xem đầy đủ nếu bị cắt ngắn
            }
            if (previewAudio) {
                console.log(`[LibraryPreview.js] Đặt src cho audio preview: ${songToPreview.url}`);
                previewAudio.src = songToPreview.url; // Đặt URL nhạc
                previewAudio.load(); // Yêu cầu trình duyệt tải dữ liệu audio mới
                previewAudio.play().catch(error => {
                    console.warn(`[LibraryPreview.js] Không thể tự động phát audio preview: ${error.message}. Người dùng có thể cần tương tác trước (nhấn nút play của trình duyệt).`);
                });
            }
            if (previewContainer) {
                previewContainer.style.display = 'block'; // Hoặc 'flex', 'grid' tùy theo layout của bạn
            }
        }
    document.addEventListener('libraryRendered', () => {
        console.log("[LibraryPreview.js] Nhận sự kiện 'libraryRendered' (load ban đầu). Gắn listener click...");
        attachPreviewClickListeners();
    });

    document.addEventListener('searchResultsRendered', () => {
        console.log("[LibraryPreview.js] Nhận sự kiện 'searchResultsRendered' (sau khi tìm kiếm). Gắn listener click...");
        attachPreviewClickListeners();
    });
    document.addEventListener('libraryLoadError', (event) => {
        console.error("[LibraryPreview.js] Nhận được lỗi tải thư viện:", event.detail);
        if(previewContainer) previewContainer.style.display = 'none';
        if(previewInfo) previewInfo.textContent = "Lỗi tải thư viện.";
     });

    console.log("[LibraryPreview.js] Khởi tạo hoàn tất. Đang chờ sự kiện 'libraryRendered' hoặc 'searchResultsRendered'.");

}); // Kết thúc DOMContentLoadeds