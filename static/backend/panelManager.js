// File: panelManager.js

document.addEventListener('DOMContentLoaded', () => {
    const tabUploadMusic = document.getElementById('tab-upload-music');
    const tabBrowseOnline = document.getElementById('tab-browse-online');
    const uploadView = document.getElementById('upload-view');
    const browseOnlineView = document.getElementById('browse-online-view');
    const panelFileUploadInput = document.getElementById('panel-file-upload-input');
    const triggerPanelUploadButton = document.getElementById('trigger-panel-upload-button');
    const panelUploadCarouselInner = document.getElementById('panel-upload-carousel-inner');
    const uploadPanelStatus = document.getElementById('upload-panel-status');


    let panelUploadedSongs = []; // Mảng lưu các bài hát đã upload trong panel

    // Hàm chuyển tab
    function switchTab(activeTab, activeView) {
        // Xóa class active khỏi tất cả các nút và view
        document.querySelectorAll('.panel-tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.panel-view').forEach(view => view.classList.remove('active-view'));

        // Thêm class active cho nút và view được chọn
        activeTab.classList.add('active');
        activeView.classList.add('active-view');

        // QUAN TRỌNG: Nếu chuyển sang tab "Browse Online", và thư viện đã được render
        // bởi guest.js hoặc search.js, chúng ta cần đảm bảo dragdrop.js
        // gắn lại listener nếu cần. Cách tốt nhất là guest.js/search.js dispatch 'libraryRendered'
        // mỗi khi #music-library-carousel-inner được cập nhật.
        // dragdrop.js đã lắng nghe 'libraryRendered' để tự động gắn lại.
        if (activeView === browseOnlineView) {
            // Nếu #music-library-carousel-inner rỗng, có thể guest.js chưa load xong
            // Hoặc bạn có thể trigger một lần load lại nếu cần
            // console.log("Switched to Browse Online. Ensure library items have drag listeners.");
             // Nếu bạn muốn load lại thư viện mỗi khi tab này active (không khuyến khích nếu không cần thiết):
             // if (typeof loadMusicLibrary === 'function' && document.getElementById('music-library-carousel-inner').innerHTML.includes('Loading library...')) {
             //    loadMusicLibrary();
             // }
        }
    }

    if (tabUploadMusic && tabBrowseOnline && uploadView && browseOnlineView) {
        tabUploadMusic.addEventListener('click', () => switchTab(tabUploadMusic, uploadView));
        tabBrowseOnline.addEventListener('click', () => switchTab(tabBrowseOnline, browseOnlineView));

        // Mặc định hiển thị tab Upload Music (hoặc tab bạn muốn)
        switchTab(tabUploadMusic, uploadView);
    } else {
        console.error("Panel tab elements not found!");
    }

    // Xử lý Upload cho Panel
    if (triggerPanelUploadButton && panelFileUploadInput) {
        triggerPanelUploadButton.addEventListener('click', () => {
            panelFileUploadInput.click();
        });

        panelFileUploadInput.addEventListener('change', handlePanelFileUpload);
    }

    function handlePanelFileUpload(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        uploadPanelStatus.textContent = `Processing ${files.length} file(s)...`;

        Array.from(files).forEach(file => {
            const url = URL.createObjectURL(file); // URL blob cho audio
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const picture = tag.tags.picture;
                    let coverUrl = 'https://via.placeholder.com/40'; // Ảnh mặc định nhỏ
                    if (picture) {
                        try {
                            const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
                            coverUrl = URL.createObjectURL(blob); // URL blob cho cover
                        } catch (e) {
                            console.error("Error creating cover blob for panel upload:", e);
                        }
                    }

                    const song = {
                        id: `panelupload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        name: tag.tags.title || file.name.replace(/\.[^/.]+$/, ""),
                        artist: tag.tags.artist || "Unknown Artist",
                        url: url, // Quan trọng: đây là URL blob
                        cover: coverUrl,
                        source: 'panel_upload' // Để phân biệt nguồn
                    };
                    panelUploadedSongs.push(song);
                    updatePanelUploadCarousel();
                },
                onError: (error) => {
                    console.error("Error reading media tags for panel upload:", error);
                    const song = {
                        id: `panelupload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        artist: "Unknown Artist",
                        url: url,
                        cover: 'https://via.placeholder.com/40',
                        source: 'panel_upload'
                    };
                    panelUploadedSongs.push(song);
                    updatePanelUploadCarousel();
                }
            });
        });
        event.target.value = null; // Reset input
        uploadPanelStatus.textContent = ""; // Xóa status
    }

    function updatePanelUploadCarousel() {
        if (!panelUploadCarouselInner) return;
        panelUploadCarouselInner.innerHTML = ""; // Xóa nội dung cũ

        if (panelUploadedSongs.length === 0) {
            panelUploadCarouselInner.innerHTML = '<p class="empty-carousel-text">Upload files to see them here. Drag to decks.</p>';
            return;
        }

        panelUploadedSongs.forEach((song, index) => {
            const item = document.createElement("div");
            item.className = "panel-upload-item";
            item.draggable = true;
            item.dataset.songId = song.id;
            // Lưu các thông tin cần thiết vào dataset để dragdrop.js có thể đọc
            item.dataset.songId = song.id;
            item.dataset.songName = song.name;
            item.dataset.artistName = song.artist;
            item.dataset.streamUrl = song.url; // This should be the blob URL
            item.dataset.cover = song.cover;   // This should be the blob URL of the cover
            item.dataset.sourceType = song.source; // 'panel_upload'
            item.innerHTML = `
                <img src="${song.cover}" alt="${song.name}" draggable="false">
                <p title="${song.name} - ${song.artist}">${song.name}</p>
                <button class="remove-upload-btn" data-index="${index}" title="Remove from this list">×</button>
            `;

            item.addEventListener('dragstart', (e) => {
                // Logic dragstart tương tự như trong dragdrop.js handleLibraryItemDragStart
                // nhưng với dữ liệu từ item này
                console.log(`[PanelManager] DragStart panel item: ${song.name}`);
                const songDataForDrag = {
                    type: 'panelUploadedSong', // **Phân biệt loại item**
                    songId: e.currentTarget.dataset.songId,
                    streamUrl: e.currentTarget.dataset.streamUrl, // Chính là blob URL
                    songName: e.currentTarget.dataset.songName,
                    artistName: e.currentTarget.dataset.artistName,
                    cover: e.currentTarget.dataset.cover,
                    // gridfsId không có ở đây vì là file local
                };
                try {
                    e.dataTransfer.setData('application/json', JSON.stringify(songDataForDrag));
                    e.dataTransfer.effectAllowed = 'copy';
                    e.currentTarget.classList.add("dragging"); // Dùng class "dragging" chung
                } catch (error) {
                    console.error("[PanelManager] DragStart panel item - Error calling setData:", error);
                    e.preventDefault();
                }
            });
            item.addEventListener('dragend', (e) => {
                e.currentTarget.classList.remove("dragging");
            });

            // Nút xóa item khỏi carousel upload này (không xóa file gốc)
            const removeBtn = item.querySelector('.remove-upload-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click của item cha
                const songIndexToRemove = parseInt(e.currentTarget.dataset.index);
                // Thu hồi Object URL để giải phóng bộ nhớ
                URL.revokeObjectURL(panelUploadedSongs[songIndexToRemove].url);
                if (panelUploadedSongs[songIndexToRemove].cover.startsWith('blob:')) {
                    URL.revokeObjectURL(panelUploadedSongs[songIndexToRemove].cover);
                }
                panelUploadedSongs.splice(songIndexToRemove, 1);
                updatePanelUploadCarousel(); // Cập nhật lại carousel
            });

            panelUploadCarouselInner.appendChild(item);
        });
    }
});