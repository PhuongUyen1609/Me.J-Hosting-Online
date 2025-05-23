const canvasElement = document.getElementById("main-outputCanvas");
const canvasCtx = canvasElement.getContext("2d");
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");

//Set up BG//
async function initializeSelfieSegmentation() {
    const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`
    });
    selfieSegmentation.setOptions({
        modelSelection: 1, // 0 for general, 1 for landscape
        selfieMode: true,
        effect: 'background', // Use 'background' to segment the person
        minDetectionConfidence: 0.5
    });
    selfieSegmentation.onResults(onSegmentationResults);
    window.selfieSegmentation = selfieSegmentation;
    console.log('MediaPipe Selfie Segmentation initialized');
}
initializeSelfieSegmentation().catch(console.error);

//BG video
const segmentationOutputCanvas = document.createElement('canvas');
const segmentationOutputCtx = segmentationOutputCanvas.getContext('2d', { willReadFrequently: true });

// Initialize three background videos
let backgroundVideo1 = document.createElement('video');
backgroundVideo1.src = '/static/index_picture/background visual/glitch.mp4'; // First background
backgroundVideo1.loop = true;
backgroundVideo1.muted = true;
backgroundVideo1.autoplay = true;
backgroundVideo1.playsInline = true;
backgroundVideo1.oncanplay = () => {
    console.log('Background 1 loaded, readyState:', backgroundVideo1.readyState);
    backgroundVideo1.play().catch(err => console.log('Background 1 play failed after load:', err));
};
backgroundVideo1.onerror = () => console.log('Error loading Background 1:', backgroundVideo1.error);
backgroundVideo1.play().catch(err => console.log('Initial play failed for Background 1:', err));

let backgroundVideo2 = document.createElement('video');
backgroundVideo2.src = '/static/index_picture/background visual/retro.mp4'; // Second background
backgroundVideo2.loop = true;
backgroundVideo2.muted = true;
backgroundVideo2.autoplay = true;
backgroundVideo2.playsInline = true;
backgroundVideo2.oncanplay = () => {
    console.log('Background 2 loaded, readyState:', backgroundVideo2.readyState);
    backgroundVideo2.play().catch(err => console.log('Background 2 play failed after load:', err));
};
backgroundVideo2.onerror = () => console.log('Error loading Background 2:', backgroundVideo2.error);
backgroundVideo2.play().catch(err => console.log('Initial play failed for Background 2:', err));

let backgroundVideo3 = document.createElement('video');
backgroundVideo3.src = '/static/index_picture/background visual/diamond.mp4'; // Third background
backgroundVideo3.loop = true;
backgroundVideo3.muted = true;
backgroundVideo3.autoplay = true;
backgroundVideo3.playsInline = true;
backgroundVideo3.oncanplay = () => {
    console.log('Background 3 loaded, readyState:', backgroundVideo3.readyState);
    backgroundVideo3.play().catch(err => console.log('Background 3 play failed after load:', err));
};
backgroundVideo3.onerror = () => console.log('Error loading Background 3:', backgroundVideo3.error);
backgroundVideo3.play().catch(err => console.log('Initial play failed for Background 3:', err));

// Background state
let selectedBackground = null; // Default: no background (null means webcam feed)


// Dropdown logic: Toggle dropdown with animation
document.getElementById('backgroundButton').addEventListener('click', () => {
    const dropdown = document.getElementById('backgroundDropdown');
    dropdown.classList.toggle('show');
});

// Disable background logic
document.querySelector('.disable-background').addEventListener('click', () => {
    selectedBackground = null; // Disable background
    document.querySelectorAll('.background-option').forEach(opt => opt.classList.remove('selected'));
    document.getElementById('backgroundDropdown').classList.remove('show');
    // Reset the button background to black
    const button = document.getElementById('backgroundButton');
    button.style.backgroundImage = 'none';
    button.style.backgroundColor = 'black';
});

// Background selection logic
document.querySelectorAll('.background-option:not(.disable-background)').forEach(option => {
    option.addEventListener('click', () => {
        const bgType = option.getAttribute('data-bg');
        const button = document.getElementById('backgroundButton');

        // Handle locked background
        if (option.classList.contains('locked-option')) {
            button.style.backgroundImage = 'none'; // Reset to black for locked option
            button.style.backgroundColor = 'black';
            return;
        }

        selectedBackground = bgType;
        document.querySelectorAll('.background-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Update the button's background image with the selected thumbnail
        const thumbnailSrc = option.querySelector('.bg-image').src;
        button.style.backgroundImage = `url('${thumbnailSrc}')`;
        button.style.backgroundColor = 'transparent'; // Remove black background to show the image

        let bgVideo = null;
        switch (selectedBackground) {
            case 'bg1':
                bgVideo = backgroundVideo1;
                break;
            case 'bg2':
                bgVideo = backgroundVideo2;
                break;
            case 'bg3':
                bgVideo = backgroundVideo3;
                break;
        }
        if (bgVideo) {
            bgVideo.play().catch(err => console.log(`Play failed for ${selectedBackground}:`, err));
        }

        document.getElementById('backgroundDropdown').classList.remove('show');
    });
});

function onSegmentationResults(results) {
    if (!results.segmentationMask) return;

    const segmentationMask = results.segmentationMask;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasElement.width;
    maskCanvas.height = canvasElement.height;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

    // Flip the mask horizontally
    maskCtx.save();
    maskCtx.scale(-1, 1);
    maskCtx.translate(-canvasElement.width, 0);
    maskCtx.drawImage(segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
    maskCtx.restore();

    // Ensure segmentationOutputCanvas matches canvasElement
    segmentationOutputCanvas.width = canvasElement.width;
    segmentationOutputCanvas.height = canvasElement.height;

    // Clear the segmentation output canvas
    segmentationOutputCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    let bgVideo = null;
    if (selectedBackground) {
        switch (selectedBackground) {
            case 'bg1':
                bgVideo = backgroundVideo1;
                break;
            case 'bg2':
                bgVideo = backgroundVideo2;
                break;
            case 'bg3':
                bgVideo = backgroundVideo3;
                break;
        }
    }

    // Draw the camera feed as the base layer
    segmentationOutputCtx.drawImage(offscreenCanvas, 0, 0, canvasElement.width, canvasElement.height);

    // If a background video is selected, blend it with the camera feed
    if (bgVideo && bgVideo.readyState >= 2) {
        // Set the blend mode
        segmentationOutputCtx.globalCompositeOperation = 'screen'; // change blendmode
        segmentationOutputCtx.drawImage(bgVideo, 0, 0, canvasElement.width, canvasElement.height);
        // Reset the composite operation to default for subsequent operations
        segmentationOutputCtx.globalCompositeOperation = 'source-over';
    }

    // Create a canvas for the person with the mask applied
    const personCanvas = document.createElement('canvas');
    personCanvas.width = canvasElement.width;
    personCanvas.height = canvasElement.height;
    const personCtx = personCanvas.getContext('2d', { willReadFrequently: true });
    personCtx.drawImage(offscreenCanvas, 0, 0, canvasElement.width, canvasElement.height);

    // Apply the flipped mask to the person canvas
    const finalMaskData = maskCtx.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    const personImageData = personCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const personData = personImageData.data;
    for (let i = 0; i < finalMaskData.length; i += 4) {
        const alpha = finalMaskData[i];
        personData[i + 3] = alpha;
    }
    personCtx.putImageData(personImageData, 0, 0);

    // Overlay the person onto the blended background
    segmentationOutputCtx.globalCompositeOperation = 'source-over';
    segmentationOutputCtx.drawImage(personCanvas, 0, 0, canvasElement.width, canvasElement.height);
}