// --- File: ../static/backend/dragdrop.js ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DragDrop.js] DOM loaded. Initializing drop zones and waiting for library render events...");

    // Lấy tham chiếu đến các cột trong Main Playlist Container (vùng nhận thả)
    const deckAPlaylistColumn = document.getElementById('deck-a-playlist-column');
    const deckBPlaylistColumn = document.getElementById('deck-b-playlist-column');

    // Mảng chứa các drop zone mới
    const dropZones = [];
    if (deckAPlaylistColumn) dropZones.push(deckAPlaylistColumn);
    if (deckBPlaylistColumn) dropZones.push(deckBPlaylistColumn);

    if (dropZones.length === 0) {
        console.error("[DragDrop.js] LỖI NGHIÊM TRỌNG: Không tìm thấy các cột playlist trong Main Playlist Container để thiết lập drop zones.");
        return; // Thoát nếu không tìm thấy drop zones
    }


    // --- HÀM GẮN DRAGSTART LISTENER CHO CÁC ITEM TRONG THƯ VIỆN (Không đổi) ---
    // Hàm này vẫn cần và hoạt động giống trước, nhắm vào #music-library-carousel-inner .library-item
    function attachDragStartListenersToLibraryItems() {
        const libraryItems = document.querySelectorAll('#music-library-carousel-inner .library-item');
        console.log(`[DragDrop.js] attachDragStartListenersToLibraryItems: Tìm thấy ${libraryItems.length} items để gắn listener dragstart.`);
        libraryItems.forEach(item => {
            item.removeEventListener('dragstart', handleLibraryItemDragStart);
            item.addEventListener('dragstart', handleLibraryItemDragStart);
        });
         console.log("[DragDrop.js] Đã gắn/cập nhật listener dragstart cho các library items.");
    }

     // --- HÀM XỬ LÝ KHI BẮT ĐẦU KÉO MỘT ITEM TỪ THƯ VIỆN (Không đổi) ---
     // Hàm này vẫn hoạt động giống trước, lấy data-* từ item thư viện
    function handleLibraryItemDragStart(event) {
         // ... (giữ nguyên nội dung hàm handleLibraryItemDragStart) ...
         const item = event.target.closest('.library-item');
         if (!item || !item.dataset.songId) {
             console.warn("[DragDrop.js] DragStart bị hủy: Không tìm thấy item hoặc thiếu 'songId' trong dataset.");
             event.preventDefault(); return;
         }
         console.log(`[DragDrop.js] Bắt đầu kéo (handleLibraryItemDragStart) bài hát từ thư viện: ${item.dataset.songName || 'Không rõ tên'}`);
         const songDataForDrag = {
            type: 'librarySong', // Đặt type là 'librarySong'
            songId: item.dataset.songId,
            gridfsId: item.dataset.gridfsId,
            streamUrl: item.dataset.streamUrl,
            songName: item.dataset.songName,
            artistName: item.dataset.artistName,
            cover: item.dataset.cover
        };
        if (!songDataForDrag.gridfsId) { console.error("[DragDrop.js] Lỗi DragStart (librarySong): Thiếu 'gridfsId'.", item.dataset); event.preventDefault(); return; }
        const jsonDataString = JSON.stringify(songDataForDrag);
        // console.log('[DragDrop.js] DragStart (librarySong) - Dữ liệu JSON chuẩn bị để truyền:', jsonDataString); // Giảm log
        try {
            event.dataTransfer.setData('application/json', jsonDataString);
            event.dataTransfer.effectAllowed = 'copy';
            item.classList.add("dragging");
             // console.log("[DragDrop.js] Đã đặt dataTransfer và thêm class 'dragging'."); // Giảm log
        } catch (error) { console.error("[DragDrop.js] Lỗi DragStart (librarySong) khi gọi setData:", error); event.preventDefault(); }
    }


    // --- LẮNG NGHE CÁC SỰ KIỆN BÁO THƯ VIỆN ĐÃ RENDER/CẬP NHẬT (Không đổi) ---
    document.addEventListener('libraryRendered', () => {
        console.log(`[DragDrop.js] Nhận sự kiện 'libraryRendered'. Gắn listener dragstart cho thư viện...`);
        attachDragStartListenersToLibraryItems();
    });

    document.addEventListener('searchResultsRendered', () => {
        console.log(`[DragDrop.js] Nhận sự kiện 'searchResultsRendered'. Gắn lại listener dragstart cho kết quả tìm kiếm...`);
        attachDragStartListenersToLibraryItems();
    });

    document.addEventListener('libraryLoadError', (event) => {
        console.error("[DragDrop.js] Nhận lỗi tải thư viện, kéo thả từ thư viện có thể bị ảnh hưởng:", event.detail);
    });


    // --- THIẾT LẬP VÙNG NHẬN THẢ (DROP ZONES) CHO CÁC CỘT PLAYLIST MỚI ---
    dropZones.forEach(columnElement => {
        // --- Sự kiện dragover: Kích hoạt khi có element được kéo qua drop zone ---
        columnElement.addEventListener("dragover", (event) => {
            event.preventDefault(); // Ngăn chặn hành vi mặc định
            // Kiểm tra loại dữ liệu (được set trong handleLibraryItemDragStart hoặc panelManager.js dragstart)
            const types = event.dataTransfer.types;
             const isJson = types.includes('application/json');

            if (isJson) {
                 // Có thể kiểm tra thêm data type nếu cần, nhưng thường chỉ cần json là đủ
                 event.dataTransfer.dropEffect = "copy"; // Hiệu ứng khi kéo qua
                 columnElement.classList.add("droppable"); // Thêm class highlight
            } else {
                 event.dataTransfer.dropEffect = "none"; // Không cho phép thả
            }
        });

        // --- Sự kiện dragleave: Kích hoạt khi element được kéo ra khỏi drop zone ---
        columnElement.addEventListener("dragleave", (event) => {
            // Kiểm tra xem con trỏ có thực sự rời khỏi element hiện tại
            if (!columnElement.contains(event.relatedTarget) || event.relatedTarget === null) {
                columnElement.classList.remove("droppable"); // Xóa class highlight
            }
        });

        // --- Sự kiện drop: Kích hoạt khi element được thả vào drop zone ---
        columnElement.addEventListener("drop", (event) => {
            event.preventDefault(); // Ngăn chặn hành vi mặc định
            columnElement.classList.remove("droppable"); // Xóa class highlight

            // Xác định Deck đích dựa trên ID của cột được thả vào
            const deckId = columnElement.id.includes("deck-a") ? "A" : "B";
            console.log(`[DragDrop.js] Drop event occurred on Deck ${deckId} playlist column.`);

            // Lấy dữ liệu JSON đã được đặt trong dataTransfer
            try {
                const jsonData = event.dataTransfer.getData("application/json");
                if (!jsonData) {
                    console.warn("[DragDrop.js] Drop Error: No JSON data found in dataTransfer.");
                    return;
                }
                const droppedData = JSON.parse(jsonData);
                console.log("[DragDrop.js] Data parsed from drop event:", droppedData);

                // --- Xử lý dữ liệu đã nhận được ---
                if (droppedData && droppedData.type && droppedData.songId) {
                    let songDataForDeck = null;

                    // Phân loại nguồn gốc dựa vào 'type'
                    if (droppedData.type === 'librarySong') {
                        // Item từ thư viện online (kéo từ #music-library-carousel-inner)
                        if (!droppedData.gridfsId || !droppedData.streamUrl) {
                            console.error("[DragDrop.js] Drop Error (librarySong): Missing 'gridfsId' or 'streamUrl'.", droppedData);
                            return;
                        }
                        songDataForDeck = {
                            songId: droppedData.songId,
                            gridfsId: droppedData.gridfsId,
                            streamUrl: droppedData.streamUrl, // URL API stream
                            songName: droppedData.songName || 'Unknown Track',
                            artistName: droppedData.artistName || '',
                            cover: droppedData.cover || '',
                            source: 'library_drop'
                        };

                    } else if (droppedData.type === 'panelUploadedSong') {
                        // Item từ panel upload (kéo từ #panel-upload-carousel-inner)
                         if (!droppedData.streamUrl) {
                            console.error("[DragDrop.js] Drop Error (panelUploadedSong): Missing 'streamUrl' (Blob URL).", droppedData);
                            return;
                        }
                        songDataForDeck = {
                            songId: droppedData.songId,
                            // gridfsId không có
                            streamUrl: droppedData.streamUrl, // URL Blob
                            songName: droppedData.songName || 'Unknown Track',
                            artistName: droppedData.artistName || '',
                            cover: droppedData.cover || '', // URL Blob cover
                            source: 'panel_upload_drop'
                        };

                    } else {
                        console.warn("[DragDrop.js] Drop Warning: Unknown data type received:", droppedData.type, droppedData);
                        return;
                    }

                    // --- Gửi yêu cầu load bài hát tới guest.js ---
                    if (songDataForDeck) {
                        console.log(`[DragDrop.js] Dispatching 'deckLoadRequest' for Deck ${deckId} with data:`, songDataForDeck);
                        const loadEvent = new CustomEvent('deckLoadRequest', {
                            detail: {
                                deckId: deckId,
                                songData: songDataForDeck
                            },
                            bubbles: true
                        });
                        document.dispatchEvent(loadEvent);
                        console.log("[DragDrop.js] 'deckLoadRequest' event dispatched.");

                        // Note: Temporary loading indicator on the playlist column
                        // might be handled by guest.js renderMainPlaylist now,
                        // or you could add a simple text/icon here temporarily.
                        // The addSongToDeckCarousel utility function is likely obsolete.
                        // Let's remove the call to addSongToDeckCarousel.
                        // addSongToDeckCarousel(targetDeckCarouselInner, songDataForDeck); // REMOVE THIS
                    }

                } else {
                    console.warn("[DragDrop.js] Drop Warning: Invalid dropped data structure - missing type or songId.", droppedData);
                }
            } catch (error) {
                console.error("[DragDrop.js] Drop Error: Could not process dropped data.", error);
            }
        }); // --- Kết thúc listener 'drop' ---
    }); // --- Kết thúc forEach cho drop zones ---

    // REMOVE THE UTILITY FUNCTION addSongToDeckCarousel as it's likely not needed with the new render logic
    // function addSongToDeckCarousel(...) { ... } // REMOVE THIS ENTIRE FUNCTION

    console.log("[DragDrop.js] Khởi tạo hoàn tất. Listener cho drop zones (playlist columns) đã được gắn. Đang chờ sự kiện render thư viện...");
});


// --- HÀM UTILITY: Hiển thị trạng thái loading trên carousel của Deck ---
// (Giữ nguyên như trước)
function addSongToDeckCarousel(innerContainer, songData) {
    if (!innerContainer) {
        console.warn("[DragDrop.js] addSongToDeckCarousel: innerContainer không tồn tại.");
        return;
    }
    // Xóa nội dung cũ (nếu có) và hiển thị thông báo loading
    innerContainer.innerHTML = ''; // Xóa sạch
    const deckItem = document.createElement('div');
    // Thêm class giống các item khác và class 'loading' để có thể style riêng
    deckItem.className = 'carousel-item deck-carousel-item loading';
    deckItem.textContent = `Đang tải: ${songData.songName || 'Bài hát đã chọn'}`; // Thông báo loading
    innerContainer.appendChild(deckItem);
    console.log(`[DragDrop.js] Đã thêm chỉ báo loading vào carousel của deck cho bài: '${songData.songName || 'Bài hát đã chọn'}'.`);
}