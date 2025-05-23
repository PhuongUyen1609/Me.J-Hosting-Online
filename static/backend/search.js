// --- File: ../static/backend/search.js ---
// File này giờ đây CHỈ xử lý logic tìm kiếm cho thư viện trong panel.
// Nó dựa vào guest.js để tải dữ liệu thư viện ban đầu và để hiển thị
// cả danh sách ban đầu lẫn kết quả tìm kiếm đã lọc.

document.addEventListener('DOMContentLoaded', () => {
    // --- Phần Search Logic --- (Đây là khối DOMContentLoaded duy nhất trong file này)
    console.log("[Search.js] DOM loaded. Initializing library search logic...");

    // Lấy tham chiếu đến các thành phần UI tìm kiếm trong panel
    // Chúng ta giả định các ID này là duy nhất và nằm trong music-source-panel
    // sau khi bạn đã xóa các phần tử HTML dư thừa ở cột giữa.
    const librarySearchInput = document.getElementById('library-searchInput');
    const librarySearchBtn = document.getElementById('library-searchBtn');
    const panelLibraryContainer = document.getElementById('music-library-carousel-inner'); // Container để hiển thị kết quả

    // Biến nội bộ để lưu trữ bản sao của thư viện đầy đủ, dùng cho việc lọc/tìm kiếm
    let internalLibraryCopy = [];

    // --- Bước 1: Nhận dữ liệu thư viện đầy đủ từ guest.js ---
    // Lắng nghe sự kiện 'libraryRendered' do guest.js phát ra sau khi tải và hiển thị xong lần đầu.
    document.addEventListener('libraryRendered', () => {
        console.log("[Search.js] Nhận được sự kiện 'libraryRendered' từ guest.js.");
        // Quan trọng: Chúng ta cần truy cập được biến 'fullSongLibrary' đã được tạo và chứa
        // dữ liệu trong file guest.js. Đảm bảo biến đó có phạm vi phù hợp (ví dụ: toàn cục).
        if (typeof fullSongLibrary !== "undefined" && Array.isArray(fullSongLibrary)) {
            // Sao chép dữ liệu từ guest.js vào biến nội bộ của file này
            internalLibraryCopy = [...fullSongLibrary]; // Dùng spread (...) để tạo bản sao mới
            console.log(`[Search.js] Đã sao chép ${internalLibraryCopy.length} bài hát từ guest.js để chuẩn bị tìm kiếm.`);

            // Kích hoạt các nút/ô tìm kiếm vì đã có dữ liệu
            if (librarySearchBtn) librarySearchBtn.disabled = false;
            if (librarySearchInput) librarySearchInput.disabled = false;
            console.log("[Search.js] Đã kích hoạt chức năng tìm kiếm.");

        } else {
             console.warn("[Search.js] Không thể truy cập 'fullSongLibrary' từ guest.js hoặc nó không phải là mảng. Tìm kiếm có thể không hoạt động.");
             // Giữ trạng thái vô hiệu hóa nếu không lấy được dữ liệu
             if (librarySearchBtn) librarySearchBtn.disabled = true;
             if (librarySearchInput) librarySearchInput.disabled = true;
        }
    });

    // --- Xử lý trường hợp guest.js báo lỗi tải thư viện ---
    // (Vẫn hữu ích để vô hiệu hóa chức năng tìm kiếm)
    document.addEventListener('libraryLoadError', (event) => {
        console.error("[Search.js] Nhận được lỗi tải thư viện từ guest.js:", event.detail);
        // Vô hiệu hóa tìm kiếm
        if (librarySearchBtn) librarySearchBtn.disabled = true;
        if (librarySearchInput) librarySearchInput.disabled = true;
     });

    // --- Bước 2: Hàm thực hiện việc tìm kiếm và yêu cầu hiển thị ---
    const performSearch = () => {
        // Kiểm tra các thành phần UI cần thiết
        if (!librarySearchInput) { console.warn("[Search.js] Không tìm thấy ô input tìm kiếm '#library-searchInput'."); return; }
        if (!panelLibraryContainer) { console.error("[Search.js] Không tìm thấy container '#music-library-carousel-inner' để hiển thị kết quả."); return;}

        // Lấy từ khóa tìm kiếm từ ô input
        const searchTerm = librarySearchInput.value.toLowerCase().trim();
        console.log(`[Search.js] Bắt đầu thực hiện tìm kiếm với từ khóa: "${searchTerm}"`);

        // Kiểm tra xem đã có dữ liệu thư viện để tìm kiếm chưa
        if (!internalLibraryCopy || internalLibraryCopy.length === 0) {
            console.warn("[Search.js] Tìm kiếm bị hủy: Dữ liệu thư viện (internalLibraryCopy) đang rỗng.");
            // Nên xóa hoặc hiển thị thông báo "Không tìm thấy" ngay lập tức
            // bằng cách gọi hàm render của guest.js với mảng rỗng
            if (typeof displayLibrarySongs === 'function') {
                 console.log("[Search.js] Gọi displayLibrarySongs của guest.js để hiển thị trạng thái rỗng.");
                 displayLibrarySongs([], panelLibraryContainer, []); // Truyền mảng rỗng
            } else {
                 console.error("[Search.js] Không thể gọi hàm displayLibrarySongs của guest.js để xóa kết quả.");
            }
            // Dispatch sự kiện báo kết quả đã render (là rỗng) để các module khác cập nhật
            document.dispatchEvent(new CustomEvent('searchResultsRendered'));
            return;
        }

        // --- Giữ lại log kiểm tra dữ liệu theo yêu cầu ---
        console.log("[Search.js] Kiểm tra internalLibraryCopy trước khi lọc:", internalLibraryCopy.length > 0 ? internalLibraryCopy[0] : 'Thư viện rỗng');
        if (internalLibraryCopy.length > 0) {
             const hasLost = internalLibraryCopy.some(song =>
                 (song.name || '').toLowerCase().includes('lost') ||
                 (song.artist || '').toLowerCase().includes('lost')
             );
             console.log(`[Search.js] internalLibraryCopy có chứa "lost" không? ${hasLost}`);
        }
        // --- Kết thúc log kiểm tra ---

        let results = []; // Mảng chứa kết quả lọc
        if (!searchTerm) {
            // Nếu người dùng xóa hết từ khóa hoặc tìm kiếm rỗng, hiển thị lại toàn bộ thư viện
            results = internalLibraryCopy;
            console.log("[Search.js] Từ khóa tìm kiếm rỗng. Kết quả là toàn bộ thư viện.");
        } else {
            // Thực hiện lọc dựa trên tên bài hát hoặc nghệ sĩ
            console.log("[Search.js] Đang lọc internalLibraryCopy với từ khóa:", searchTerm);
            results = internalLibraryCopy.filter(song => {
                const songName = (typeof song.name === 'string' ? song.name : '').toLowerCase();
                const artistName = (typeof song.artist === 'string' ? song.artist : '').toLowerCase();
                // Trả về true nếu tên bài hát HOẶC tên nghệ sĩ chứa từ khóa
                return songName.includes(searchTerm) || artistName.includes(searchTerm);
            });
            console.log(`[Search.js] Lọc hoàn tất. Tìm thấy ${results.length} kết quả.`);
        }

        // --- Bước 3: Yêu cầu guest.js hiển thị kết quả lọc ---

        // Kiểm tra xem hàm displayLibrarySongs (được định nghĩa trong guest.js) có tồn tại không
        if (typeof displayLibrarySongs === 'function') {
             console.log("[Search.js] Gọi hàm displayLibrarySongs của guest.js để hiển thị kết quả lọc.");

             // Gọi hàm của guest.js:
             // - results: Mảng kết quả cần hiển thị.
             // - panelLibraryContainer: Element DOM nơi cần hiển thị.
             // - internalLibraryCopy: Truyền thư viện gốc để logic double-click trong guest.js hoạt động đúng.
             displayLibrarySongs(results, panelLibraryContainer, internalLibraryCopy);

             // --- Bước 4: Thông báo cho các module khác biết kết quả đã được hiển thị ---
             // Dispatch sự kiện 'searchResultsRendered' để libraryPreview.js và dragdrop.js
             // biết rằng chúng cần gắn lại listener cho các item mới vừa được hiển thị.
             console.log("[Search.js] Dispatch sự kiện 'searchResultsRendered'.");
             document.dispatchEvent(new CustomEvent('searchResultsRendered'));

        } else {
             // Log lỗi nghiêm trọng nếu không tìm thấy hàm hiển thị của guest.js
             console.error("[Search.js] LỖI NGHIÊM TRỌNG: Không thể tìm thấy hoặc gọi hàm displayLibrarySongs của guest.js!");
             // Có thể hiển thị thông báo lỗi trực tiếp trên UI nếu muốn
             if(panelLibraryContainer) panelLibraryContainer.innerHTML = '<p style="color: red; padding: 10px;">Lỗi: Không thể hiển thị kết quả tìm kiếm.</p>';
        }
        // --- Kết thúc phần hiển thị kết quả ---
    }; // --- Kết thúc hàm performSearch ---

    // --- Bước 5: Gắn hàm performSearch vào sự kiện của nút và ô input ---
    if (librarySearchBtn && librarySearchInput) {
        // Click nút tìm kiếm
        librarySearchBtn.addEventListener('click', performSearch);

        // Nhấn Enter trong ô tìm kiếm
        librarySearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch(); // Gọi cùng hàm tìm kiếm
            }
        });

        // Ban đầu, vô hiệu hóa tìm kiếm cho đến khi có dữ liệu thư viện
        librarySearchBtn.disabled = true;
        librarySearchInput.disabled = true;
        console.log("[Search.js] Đã gắn listener cho nút search và input. Đang chờ dữ liệu từ guest.js...");

    } else {
        // Ghi log lỗi nếu thiếu các thành phần UI quan trọng
        if (!librarySearchInput) console.error("[Search.js] LỖI: Không tìm thấy ô input '#library-searchInput'.");
        if (!librarySearchBtn) console.error("[Search.js] LỖI: Không tìm thấy nút search '#library-searchBtn'.");
        if (!panelLibraryContainer) console.error("[Search.js] LỖI: Không tìm thấy container '#music-library-carousel-inner'.");
        console.error("[Search.js] Chức năng tìm kiếm sẽ không hoạt động do thiếu thành phần UI.");
    }

}); // --- Kết thúc DOMContentLoaded ---

// --- Các hàm dư thừa như displayLibrarySongs, handleDragStart, loadTrackToDeck đã được XÓA khỏi file này ---