let audioMediaRecorder;
let screenMediaRecorder;
let audioChunks = [];
let videoChunks = [];
let fileHandle;

document.querySelector('.rec-icon').addEventListener('click', () => {
    if (audioMediaRecorder && audioMediaRecorder.state === 'recording') {
        audioMediaRecorder.stop();
        console.log('Audio recording stopped');
    } else {
        startRecording();
    }
});

function startRecording() {
    if (!window.audioDestination || !window.audioDestination.stream) {
        console.error('Audio destination not initialized. Ensure guest.js is loaded and initialized.');
        return;
    }

    audioMediaRecorder = new MediaRecorder(window.audioDestination.stream);
    audioMediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
            console.log('Audio chunk received:', event.data.size, 'bytes');
        }
    };
    audioMediaRecorder.onstop = () => {
        console.log('Audio recording stopped, processing blob...');
        if (audioChunks.length === 0) {
            console.error('No audio chunks recorded. Check audioDestination stream.');
            return;
        }
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Changed to webm for compatibility
        console.log('Audio blob created:', audioBlob.size, 'bytes');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.error('Audio playback failed:', err));
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `mixer_recording_${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(audioUrl);
        audioChunks = [];
    };
    audioMediaRecorder.start();
    console.log('Recording mixer output started');
}

document.querySelector('.camera-icon').addEventListener('click', () => {
    if (screenMediaRecorder && screenMediaRecorder.state === 'recording') {
        stopScreenRecording();
    } else {
        startScreenRecording();
    }
});

async function initFileHandle() {
    const opts = {
        types: [{
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] },
        }],
    };
    try {
        fileHandle = await window.showSaveFilePicker(opts);
        console.log('File handle created for MP4');
    } catch (err) {
        console.error('Failed to create file handle:', err);
        throw err;
    }
}

async function startScreenRecording() {
    if (!fileHandle) {
        await initFileHandle();
    }

    const videoMimeType = 'video/mp4;codecs=avc1.42001E,mp4a.40.2';
    const fallbackMimeType = 'video/webm;codecs=vp8,opus';
    const isMp4Supported = MediaRecorder.isTypeSupported(videoMimeType);
    const recordMimeType = isMp4Supported ? videoMimeType : fallbackMimeType;
    const fileExtension = isMp4Supported ? 'mp4' : 'webm';

    if (!isMp4Supported) {
        console.warn('MP4 (avc1.42001E,mp4a.40.2) not supported. Falling back to WebM.');
    }

    let videoStream;
    try {
        // Restrict to browser tab only
        videoStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'browser' // Limit to browser tabs
            }
        });
        console.log('Video stream tracks:', videoStream.getVideoTracks());
        if (videoStream.getVideoTracks().length === 0) {
            console.error('No video tracks in stream. Recording aborted.');
            return;
        }
    } catch (err) {
        console.error('Failed to get display media:', err);
        return;
    }

    if (!window.audioDestination || !window.audioDestination.stream) {
        console.error('Audio destination not initialized. Falling back to video-only recording.');
        screenMediaRecorder = new MediaRecorder(videoStream, { mimeType: recordMimeType });
    } else {
        const audioStream = window.audioDestination.stream;
        console.log('Audio stream tracks:', audioStream.getAudioTracks());
        if (audioStream.getAudioTracks().length === 0) {
            console.warn('No audio tracks in audioDestination.stream. Recording video only.');
        }
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
        ]);
        try {
            screenMediaRecorder = new MediaRecorder(combinedStream, { mimeType: recordMimeType });
        } catch (err) {
            console.error('Failed to create MediaRecorder for combined stream:', err);
            console.warn('Falling back to video-only recording.');
            screenMediaRecorder = new MediaRecorder(videoStream, { mimeType: recordMimeType });
        }
    }

    screenMediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
            videoChunks.push(e.data);
            console.log('Video chunk received:', e.data.size, 'bytes');
        } else {
            console.warn('Empty video chunk received.');
        }
    };

    screenMediaRecorder.onstop = async () => {
        console.log('Screen recording stopped, processing blob...');
        videoStream.getTracks().forEach(track => track.stop());
        if (videoChunks.length === 0) {
            console.error('No video chunks recorded. Check video and audio streams.');
            return;
        }
        const blob = new Blob(videoChunks, { type: recordMimeType });
        console.log('Video blob created:', blob.size, 'bytes');
        videoChunks = [];

        try {
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log(`Video saved at: ${await fileHandle.name}`);
        } catch (err) {
            console.error('Failed to save video:', err);
        }
        fileHandle = null;
    };

    try {
        screenMediaRecorder.start();
        console.log(`Screen recording started with mixer audio in ${recordMimeType}, capturing browser tab only`);
    } catch (err) {
        console.error('Failed to start MediaRecorder:', err);
        videoStream.getTracks().forEach(track => track.stop());
    }
}

function stopScreenRecording() {
    if (screenMediaRecorder && screenMediaRecorder.state === 'recording') {
        screenMediaRecorder.stop();
        console.log('Screen recording stopped');
    }
}
