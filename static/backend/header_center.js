let mediaRecorder;
let audioChunks = [];

document.querySelector('.rec-icon').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    } else {
        startRecording();
    }
});

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
            };
            mediaRecorder.start();
        })
        .catch(error => console.error('Error accessing microphone:', error));
}

document.querySelector('.camera-icon').addEventListener('click', () => {
    startScreenRecording();
});

videoChunks = [];
let fileHandle;

// Bước 1: Người dùng bấm nút “Mở quyền ghi file” trước, chọn nơi lưu
async function initFileHandle() {
  // Tùy chọn định dạng file
  const opts = {
    types: [{
      description: 'WebM Video',
      accept: { 'video/webm': ['.webm'] },
    }],
  };
  // Mở hộp thoại để user chọn nơi lưu một lần
  fileHandle = await window.showSaveFilePicker(opts);
}

// Bước 2: Bắt đầu quay màn hình
async function startScreenRecording() {
  // Phải chắc là initFileHandle() đã được gọi trước đó
  if (!fileHandle) {
    await initFileHandle();
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => videoChunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(videoChunks, { type: 'video/webm' });
    videoChunks = [];

    // Ghi Blob vào file đã chọn
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    console.log('Video đã được lưu tự động tại:', await fileHandle.name);
  };

  mediaRecorder.start();
}

// Bước 3: Dừng quay
function stopScreenRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}

// Gắn sự kiện cho nút camera-icon:
document.querySelector('.camera-icon').addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopScreenRecording();
  } else {
    startScreenRecording();
  }
});
