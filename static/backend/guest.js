
/**
 * Me.J Music Mixer
 * Guest Mode with Hand Tracking
 * Integrates advanced gestures, Tone.js effects, crossfader, and effect carousel from script.js
 * Dependencies: Tone.js, WaveSurfer.js, MediaPipe Hands, jsmediatags, TabAudioAnalyzer
 */
// Global shared effect chain
// const sharedEffects = {
//     effectInput: new Tone.Gain(1),
//     delay: new Tone.FeedbackDelay({ delayTime: 0, feedback: 0.5, wet: 0 }),
//     distortion: new Tone.Distortion({ distortion: 0, wet: 0 }),
//     pitchShift: new Tone.PitchShift({ pitch: 0, wet: 0 }),
//     reverb: new Tone.Reverb({ decay: 2, wet: 0 }),
//     lowpassFilter: new Tone.Filter({ type: 'lowpass', frequency: 20000, Q: 1 }),
//     highpassFilter: new Tone.Filter({ type: 'highpass', frequency: 200, Q: 1 }),
//     finalGain: new Tone.Gain(1).toDestination()
// };
// sharedEffects.effectInput.chain(
//     sharedEffects.delay,
//     sharedEffects.distortion,
//     sharedEffects.pitchShift,
//     sharedEffects.reverb,
//     sharedEffects.lowpassFilter,
//     sharedEffects.highpassFilter,
//     sharedEffects.finalGain
// );

let audioCtx = null;
let sharedEffects = null;
let playerAData = null;
let playerBData = null;
let currentCue = "A";
let isSoundCloudActive = false;
let soundcloudWidget = null;
let animationFrameId = null;
let musicLibrary = [];
let fullSongLibrary = [];

// From script.js: Effect and gesture state variables
let crossfaderPosition = 0.5;
let selectedEffect = 'default';
let lockedEffects = { delay: false, distortion: false, pitch: false, reverb: false, filter: false };
let lockedDelayValue = 0;
let lockedDistortionValue = 0;
let lockedPitchValue = 0;
let lockedReverbValue = 0;
let lockedLowpassValue = 200;
let lockedHighpassValue = 200;
let lowpassWet = 0;
let highpassWet = 0;
let lockedLowpassWet = 0;
let lockedHighpassWet = 0;
const gestureCooldown = 600;
let lastGestureTime = 0;
let pinkySignStartTime = null;
let lockMusicStartTime = null;
let musicLocked = false;
let rightHandEffectsLocked = false;
let leftHandEffectsLocked = false;
let isCrossfaderActive = false;
const distanceBuffer = [];
let musicLockToggleState = 0;
let lastEffectToggleTime = 0;
const effectToggleDelay = 600;



async function initializePlayers() {
    try {
        await initializeAudioContext();
        await Tone.start();
        console.log("[Guest.js] Tone.js started");

        playerAData = createPlayerData("deck-a");
        playerBData = createPlayerData("deck-b");
        initializeEventListeners();
        initializeHandTracking();
        initializeMusicLibrary();
        updateCrossfader(crossfaderPosition); // Initialize crossfader
        updateAllEffectStatusDisplays();
    } catch (err) {
        console.error("[Guest.js] Error initializing players:", err);
    }
}

function createPlayerData(deckId) {
    initializeAudioContext();
    if (!sharedEffects || !sharedEffects.effectInput) {
        console.error(`[Guest.js] sharedEffects not initialized for ${deckId}. Reinitializing...`);
        initializeAudioContext();
        if (!sharedEffects) {
            throw new Error(`[Guest.js] Failed to initialize sharedEffects for ${deckId}`);
        }
    }

    const playerData = {
        id: deckId,
        player: new Tone.Player(),
        waveformData: null,
        playbackStartTime: null, // Track when playback starts
        isPlaying: false,
        state: {
            volume: 0.5,
            speed: 1.0,
            delay: 0,
            distortion: 0,
            pitch: 0,
            reverb: 0,
            filter: 0,
            currentSongIndex: -1,
            currentTime: 0,
            duration: 0,
            playlist: []
        },
        effects: {
            player: null,
            gain: null,
            volume: null,
            source: null
        }
    };

    try {
        playerData.effects.player = playerData.player;
        playerData.effects.gain = new Tone.Gain(1);
        playerData.effects.volume = new Tone.Volume(0);
        playerData.effects.gain.connect(playerData.effects.volume);
        playerData.effects.volume.connect(sharedEffects.effectInput);
        playerData.player.connect(playerData.effects.gain);
        console.log(`[Guest.js] Created Tone.js nodes and connected Tone.Player for ${deckId}`);
    } catch (error) {
        console.error(`[Guest.js] Error creating Tone.js nodes for ${deckId}:`, error);
        throw error;
    }

    return playerData;
}

async function initializeAudioContext() {
    // Prevent recreation of audioCtx unless closed
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
        console.log("[Guest.js] Created new AudioContext");
    } else {
        console.log("[Guest.js] Reusing existing AudioContext, state:", audioCtx.state);
    }

    // Synchronize Tone.js context
    if (Tone.getContext().rawContext !== audioCtx) {
        Tone.setContext(audioCtx);
        console.log("[Guest.js] Synchronized Tone.js context with audioCtx");
    }

    // Initialize sharedEffects only once
    if (!sharedEffects) {
        try {
            sharedEffects = {
                effectInput: new Tone.Gain(1),
                delay: new Tone.PingPongDelay({ delayTime: "8n", feedback: 0.6, wet: 0 }),
                distortion: new Tone.Distortion({ distortion: 0.4, wet: 0 }),
                pitchShift: new Tone.PitchShift({ pitch: 0, wet: 0 }),
                reverb: new Tone.Reverb({ decay: 2, wet: 0 }),
                lowpassFilter: new Tone.Filter({ frequency: 20000, type: "lowpass" }),
                highpassFilter: new Tone.Filter({ frequency: 0, type: "highpass" })
            };

            // Wait for reverb to generate impulse response
            await sharedEffects.reverb.generate();
            console.log("[Guest.js] Reverb impulse response generated");

            // Chain nodes manually
            sharedEffects.effectInput.connect(sharedEffects.delay);
            sharedEffects.delay.connect(sharedEffects.distortion);
            sharedEffects.distortion.connect(sharedEffects.pitchShift);
            sharedEffects.pitchShift.connect(sharedEffects.reverb);
            sharedEffects.reverb.connect(sharedEffects.lowpassFilter);
            sharedEffects.lowpassFilter.connect(sharedEffects.highpassFilter);
            sharedEffects.highpassFilter.connect(audioCtx.destination);
            console.log("[Guest.js] Initialized sharedEffects with manual chaining");
        } catch (error) {
            console.error("[Guest.js] Error initializing sharedEffects:", error);
            sharedEffects = null;
            throw error;
        }
    }

    // Resume context if suspended
    if (audioCtx.state === 'suspended') {
        await new Promise(resolve => {
            const resumeOnInteraction = async () => {
                try {
                    await audioCtx.resume();
                    await Tone.start();
                    console.log("[Guest.js] AudioContext resumed and Tone.js started");
                    resolve();
                    window.removeEventListener('click', resumeOnInteraction);
                    window.removeEventListener('touchstart', resumeOnInteraction);
                } catch (err) {
                    console.error("[Guest.js] Failed to resume AudioContext or start Tone.js:", err);
                }
            };
            window.addEventListener('click', resumeOnInteraction);
            window.addEventListener('touchstart', resumeOnInteraction);
        });
    }

    return audioCtx;
}


function initializeEventListeners() {
    console.log("[Guest.js] Initializing event listeners...");
    const volumeSliderA = document.getElementById("volumeSlider");
    if (volumeSliderA) {
        volumeSliderA.value = 50;
        volumeSliderA.addEventListener("input", () => {
            const volumePercent = parseInt(volumeSliderA.value);
            const volumeValue = volumePercent === 0 ? -Infinity : (volumePercent / 100) * 60 - 60;
            playerAData.effects.volume.volume.setValueAtTime(volumeValue, Tone.now());
            playerAData.state.volume = volumePercent / 100;
            document.getElementById("volumeStatus").textContent = `${volumePercent}%`;
            updateCrossfader();
        });
    }
    const volumeSliderB = document.getElementById("volumeSliderB");
    if (volumeSliderB) {
        volumeSliderB.value = 50;
        volumeSliderB.addEventListener("input", () => {
            const volumePercent = parseInt(volumeSliderB.value);
            const volumeValue = volumePercent === 0 ? -Infinity : (volumePercent / 100) * 60 - 60;
            playerBData.effects.volume.volume.setValueAtTime(volumeValue, Tone.now());
            playerBData.state.volume = volumePercent / 100;
            document.getElementById("volumeStatusB").textContent = `${volumePercent}%`;
            updateCrossfader();
        });
    }

    // Play/Stop Buttons
    const playStopBtnA = document.getElementById("playStopBtn");
    if (playStopBtnA) {
        playStopBtnA.addEventListener("click", () => {
            if (playerAData.player) {
                startPlaying(playerAData);
            }
        });
    }

    const playStopBtnB = document.getElementById("playStopBtnB");
    if (playStopBtnB) {
        playStopBtnB.addEventListener("click", () => {
            if (playerBData.player) {
                startPlaying(playerBData);
            }
        });
    }

    // Crossfader
    const crossfaderSlider = document.getElementById("crossfader");
    if (crossfaderSlider) {
        crossfaderSlider.value = 50;
        crossfaderSlider.addEventListener("input", (e) => {
            crossfaderPosition = e.target.value / 100;
            updateCrossfader();
        });
    }

    // Effect Carousel
    const effectCarousel = document.getElementById("effectCarousel");
    if (effectCarousel) {
        effectCarousel.addEventListener('click', (event) => {
            if (event.target.classList.contains('effect-button')) {
                setCarouselPosition(event.target.dataset.effect);
            }
        });
    }

    // Upload and Delete
    const uploadMusicA = document.getElementById("uploadMusic");
    if (uploadMusicA) {
        uploadMusicA.addEventListener("change", (e) => handleFileUpload(e, playerAData));
    }
    const uploadMusicB = document.getElementById("uploadMusicB");
    if (uploadMusicB) {
        uploadMusicB.addEventListener("change", (e) => handleFileUpload(e, playerBData));
    }
    const deleteSongBtnA = document.getElementById("deleteSongBtn");
    if (deleteSongBtnA) {
        deleteSongBtnA.addEventListener("click", () => deleteSong(playerAData));
    }
    const deleteSongBtnB = document.getElementById("deleteSongBtnB");
    if (deleteSongBtnB) {
        deleteSongBtnB.addEventListener("click", () => deleteSong(playerBData));
    }

    // Deck Load Request
    document.addEventListener('deckLoadRequest', (event) => {
        const { deckId, songData } = event.detail;
        const targetPlayerData = deckId === 'A' ? playerAData : playerBData;
        if (targetPlayerData && songData && songData.songId) {
            let indexInDeck = targetPlayerData.state.playlist.findIndex(s => s.id === songData.songId);
            if (indexInDeck === -1) {
                const songToAdd = {
                    id: songData.songId,
                    _id: songData.songId,
                    name: songData.songName,
                    artist: songData.artistName,
                    cover: songData.cover,
                    url: songData.streamUrl,
                    source: songData.source || 'library_drop',
                    gridfs_id: songData.gridfsId
                };
                targetPlayerData.state.playlist.push(songToAdd);
                indexInDeck = targetPlayerData.state.playlist.length - 1;
            }
            renderMainPlaylist();
            if (!targetPlayerData.isPlaying && targetPlayerData.state.currentSongIndex === -1) {
                loadSong(targetPlayerData, indexInDeck);
            }
        }
    });

    // Start Tone.js audio context
    document.addEventListener('click', async () => {
        await Tone.start();
        console.log('Tone.js audio context started');
    }, { once: true });
}

// From script.js: Hand Tracking
function initializeHandTracking() {
    const videoElement = document.getElementById("main-inputVideo");
    const canvasElement = document.getElementById("main-outputCanvas");
    if (!videoElement || !canvasElement) {
        console.error("Video or Canvas element for hand tracking not found.");
        return;
    }
    
    // Apply horizontal flip to video element for mirror-like display
    videoElement.style.transform = 'scaleX(-1)';
    videoElement.style.transformOrigin = 'center';
    // Add a class to ensure CSS can reinforce the flip
    videoElement.classList.add('flipped-video');
    console.log("[Guest.js] Applied horizontal flip to video element:", videoElement.style.transform);

    const canvasCtx = canvasElement.getContext("2d");
    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d");

    let lastFrameTime = 0;
    const targetFPS = 60;
    const minFrameInterval = 1000 / targetFPS;

    // Function to update dimensions
    function updateDimensions() {
        const container = document.querySelector('.webcam-container');
        if (!container || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            return;
        }

        // Set canvas dimensions to match video's native resolution
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        // Let CSS handle the container's height via aspect ratio
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        container.style.aspectRatio = `${videoElement.videoWidth} / ${videoElement.videoHeight}`;
    }

    async function initializeHands() {
        let attempts = 0;
        const maxAttempts = 10;

        const tryInitialize = () => {
            return new Promise((resolve, reject) => {
                if (typeof Hands !== 'undefined') {
                    const hands = new Hands({
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                    });
                    hands.setOptions({
                        maxNumHands: 2,
                        modelComplexity: 0,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });
                    hands.onResults(onResults);
                    window.hands = hands;
                    console.log('MediaPipe Hands initialized');
                    resolve();
                } else {
                    reject(new Error('MediaPipe Hands not loaded'));
                }
            });
        };

        while (attempts < maxAttempts) {
            try {
                await tryInitialize();
                return;
            } catch (err) {
                attempts++;
                if (attempts === maxAttempts) {
                    console.error('Failed to load MediaPipe Hands after retries');
                    alert('Hand tracking failed to initialize.');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    initializeHands();

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                return;
            }
            if (!window.hands) {
                return;
            }
            offscreenCanvas.width = videoElement.videoWidth;
            offscreenCanvas.height = videoElement.videoHeight;
            offscreenCtx.save();
            offscreenCtx.scale(-1, 1);
            offscreenCtx.translate(-videoElement.videoWidth, 0);
            offscreenCtx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
            offscreenCtx.restore();
            await window.hands.send({ image: offscreenCanvas });
             //BG
            await window.selfieSegmentation.send({ image: offscreenCanvas });
        },
        width: 1920,
        height:  1080
    });

    camera.start().catch((err) => {
        console.error("Failed to start camera:", err);
        alert("Camera failed to start. Ensure webcam permissions are granted.");
    });

    // Update dimensions on load and resize
    videoElement.addEventListener('loadedmetadata', () => {
        updateDimensions();
        initializeCarousel();
    });

    // Handle window resize
    window.addEventListener('resize', updateDimensions);

    // videoElement.addEventListener('loadedmetadata', () => {
    //     canvasElement.width = videoElement.videoWidth;
    //     canvasElement.height = videoElement.videoHeight;
    //     const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    //     const container = document.querySelector('.webcam-container');
    //     container.style.height = `${container.offsetWidth / aspectRatio}px`;
    //     // Reapply flip after metadata to ensure it persists
    //     videoElement.style.transform = 'scaleX(-1)';
    //     console.log("[Guest.js] Reapplied video flip after metadata load:", videoElement.style.transform);
    //     initializeCarousel();
    // });
}


// From script.js: Gesture Detection
function detectGestures(landmarks) {
    const wrist = landmarks[0];
    const palmBase = landmarks[9];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const thumbDistance = Math.sqrt(
        Math.pow(thumbTip.x - palmBase.x, 2) + Math.pow(thumbTip.y - palmBase.y, 2)
    );
    const indexDistance = Math.sqrt(
        Math.pow(indexTip.x - palmBase.x, 2) + Math.pow(indexTip.y - palmBase.y, 2)
    );
    const middleDistance = Math.sqrt(
        Math.pow(middleTip.x - palmBase.x, 2) + Math.pow(middleTip.y - palmBase.y, 2)
    );
    const ringDistance = Math.sqrt(
        Math.pow(ringTip.x - palmBase.x, 2) + Math.pow(ringTip.y - palmBase.y, 2)
    );
    const pinkyDistance = Math.sqrt(
        Math.pow(pinkyTip.x - palmBase.x, 2) + Math.pow(pinkyTip.y - palmBase.y, 2)
    );
    const thumbIndexDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
    );

    const closedThreshold = 0.15;
    const raisedThreshold = 0.18;
    const touchThreshold = 0.05;

    if (thumbDistance <= closedThreshold && indexDistance <= closedThreshold &&
        middleDistance <= closedThreshold && ringDistance <= closedThreshold &&
        pinkyDistance <= closedThreshold) {
        return "Closed Fist";
    }

    const isThumbUp = thumbDistance > raisedThreshold;
    const isIndexUp = indexDistance > raisedThreshold;
    const isMiddleUp = middleDistance > raisedThreshold;
    const isRingUp = ringDistance > raisedThreshold;
    const isPinkyUp = pinkyDistance > raisedThreshold;

    if (isPinkyUp && !isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp) {
        return "PinkyUp";
    }

    if (isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
        const thumbToPalmX = thumbTip.x - palmBase.x;
        if (thumbToPalmX < -0.1) return "ThumbLeft";
        if (thumbToPalmX > 0.1) return "ThumbRight";
        return "Thumbs Up";
    }

    if (thumbIndexDistance < touchThreshold && isMiddleUp && isRingUp && isPinkyUp) return "OK Sign";
    if (isIndexUp && isMiddleUp && !isThumbUp && !isRingUp && !isPinkyUp) return "Peace Sign";
    if (isThumbUp && isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return "Three Fingers";
    if (isIndexUp && !isThumbUp && !isMiddleUp && !isRingUp && !isPinkyUp) return "Pointing";
    if (isThumbUp && isIndexUp && isMiddleUp && isRingUp && isPinkyUp) return "Open Hand";

    return "Unknown";
}

// From script.js: Gesture Control
const lockImage = new Image();
lockImage.src = '/static/index_picture/lock.svg';
const unlockImage = new Image();
unlockImage.src = '/static/index_picture/unlock.svg';

let cueState = null;

function showGestureCue(message, type = 'gesture', x = null, y = null) {
    console.log(`Gesture Cue: ${message}`);
    const canvasElement = document.getElementById("main-outputCanvas");

    // Clear previous cue if it exists
    if (window.cueTimeout) {
        clearTimeout(window.cueTimeout);
        window.cueTimeout = null;
    }

    // Set cue state
    cueState = {
        type,
        message,
        startTime: performance.now(),
        duration: type === 'lock' || type === 'unlock' ? 1000 : 5000,
        x: x !== null ? x : canvasElement.width / 2,
        y: y !== null ? y : canvasElement.height / 2
    };

    // Schedule cue state reset
    window.cueTimeout = setTimeout(() => {
        cueState = null;
        window.cueTimeout = null;
    }, cueState.duration);
}

// From script.js: Effect Carousel
function initializeCarousel() {
    const effectItems = Array.from(document.getElementById("effectCarousel").children);
    effectItems.forEach(item => {
        if (item.dataset.effect === selectedEffect) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    updateAllEffectStatusDisplays();
}

function setCarouselPosition(effect) {
    const oldEffect = selectedEffect;
    selectedEffect = effect;
    if (oldEffect !== effect && oldEffect !== 'default' && !lockedEffects[oldEffect]) {
        console.log(`Effect changed from ${oldEffect} to ${selectedEffect}. Turning off ${oldEffect}.`);
        const sharedEffects = playerAData.effects.sharedEffects;
        switch (oldEffect) {
            case 'delay':
                sharedEffects.delay.wet.setValueAtTime(0, Tone.now());
                break;
            case 'distortion':
                sharedEffects.distortion.wet.setValueAtTime(0, Tone.now());
                break;
            case 'pitch':
                sharedEffects.pitchShift.wet.setValueAtTime(1, Tone.now());
                break;
            case 'reverb':
                sharedEffects.reverb.wet.setValueAtTime(0, Tone.now());
                break;
            case 'filter':
                sharedEffects.lowpassFilter.frequency.value = 20000;
                sharedEffects.highpassFilter.frequency.value = 200;
                lowpassWet = 0;
                highpassWet = 0;
                break;
        }
    }
    
    updateSelectedEffectUI();
    updateAllEffectStatusDisplays();
}

function updateSelectedEffectUI() {
    const effectItems = Array.from(document.getElementById("effectCarousel").children);
    effectItems.forEach(item => {
        if (item.dataset.effect === selectedEffect) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function selectEffect(direction) {
    const effectItems = Array.from(document.getElementById("effectCarousel").children);
    let index = effectItems.findIndex(item => item.dataset.effect === selectedEffect);
    if (index === -1) {
        index = effectItems.findIndex(item => item.dataset.effect === 'default');
    }
    let newIndex = index;
    if (direction === 'left') {
        newIndex--;
        if (newIndex < 0) newIndex = effectItems.length - 1;
    } else if (direction === 'right') {
        newIndex++;
        if (newIndex >= effectItems.length) newIndex = 0;
    } else if (direction === 'default') {
        newIndex = effectItems.findIndex(item => item.dataset.effect === 'default');
    }
    const newEffect = effectItems[newIndex].dataset.effect;
    effectItems.forEach(item => item.classList.remove('selected'));
    effectItems[newIndex].classList.add('selected');
    selectedEffect = newEffect;
    setCarouselPosition(newEffect);
}

// From script.js: Update Effects Status
function updateAllEffectStatusDisplays() {
    // Guard clause to prevent execution if sharedEffects is not initialized
    if (!sharedEffects || !sharedEffects.delay) {
        console.warn("[Guest.js] sharedEffects not initialized in updateAllEffectStatusDisplays");
        return;
    }

    try {
        const delayStatus = document.getElementById("delayStatus");
        const distortionStatus = document.getElementById("distortionStatus");
        const pitchStatus = document.getElementById("pitchStatus");
        const reverbStatus = document.getElementById("reverbStatus");
        const filterStatus = document.getElementById("filterStatus");

        if (delayStatus) {
            delayStatus.textContent = `Delay: ${lockedEffects.delay ? 'Locked' : sharedEffects.delay.wet.value > 0 ? 'On' : 'Off'}`;
        }
        if (distortionStatus) {
            distortionStatus.textContent = `Distortion: ${lockedEffects.distortion ? 'Locked' : sharedEffects.distortion.wet.value > 0 ? 'On' : 'Off'}`;
        }
        if (pitchStatus) {
            pitchStatus.textContent = `Pitch: ${lockedEffects.pitch ? 'Locked' : Math.abs(sharedEffects.pitchShift.pitch) > 0.05 ? 'On' : 'Off'}`;
        }
        if (reverbStatus) {
            reverbStatus.textContent = `Reverb: ${lockedEffects.reverb ? 'Locked' : sharedEffects.reverb.wet.value > 0 ? 'On' : 'Off'}`;
        }
        if (filterStatus) {
            filterStatus.textContent = `Filter: ${lockedEffects.filter ? 'Locked' : (lowpassWet > 0 || highpassWet > 0) ? 'On' : 'Off'}`;
        }
    } catch (error) {
        console.error("[Guest.js] Error in updateAllEffectStatusDisplays:", error);
    }
}

// From script.js: Crossfader
let lastCrossfaderUpdate = 0;
const CROSSFADER_UPDATE_INTERVAL = 50; // Throttle to 20 updates/sec (50ms)

// Helper function to bypass delay and reverb for muted decks
// function updateEffectBypass() {
//     const isDeckAMuted = playerAData.effects.gain.gain.value < 0.001;
//     const isDeckBMuted = playerBData.effects.gain.gain.value < 0.001;
//     // Bypass delay and reverb if both decks are muted or one is fully active
//     if ((isDeckAMuted && isDeckBMuted) || (isDeckAMuted && !isDeckBMuted) || (!isDeckAMuted && isDeckBMuted)) {
//         sharedEffects.delay.wet.setValueAtTime(0, Tone.now());
//         sharedEffects.reverb.wet.setValueAtTime(0, Tone.now());
//     } else {
//         // Restore effect levels when both decks are active
//         sharedEffects.delay.wet.setValueAtTime(0.5, Tone.now());
//         sharedEffects.reverb.wet.setValueAtTime(1, Tone.now());
//     }
// }

// function updateCrossfader() {
//     const now = performance.now();
//     if (now - lastCrossfaderUpdate < CROSSFADER_UPDATE_INTERVAL) {
//         return; // Throttle updates
//     }
//     lastCrossfaderUpdate = now;

//     // Ensure audio context is running
//     if (Tone.context.state !== 'running') {
//         console.warn('Audio context not running. Resuming...');
//         Tone.start().catch(err => console.error('Tone.js start failed:', err));
//         return;
//     }

//     // Validate gain nodes
//     if (!playerAData.effects.gain || !playerAData.effects.gain.gain) {
//         console.error('Deck A gain node invalid. Reinitializing...');
//         playerAData.effects.gain = new Tone.Gain(1).connect(playerAData.effects.volume);
//         if (playerAData.player) {
//             playerAData.player.connect(playerAData.effects.gain);
//         }
//     }
//     if (!playerBData.effects.gain || !playerBData.effects.gain.gain) {
//         console.error('Deck B gain node invalid. Reinitializing...');
//         playerBData.effects.gain = new Tone.Gain(1).connect(playerBData.effects.volume);
//         if (playerBData.player) {
//             playerBData.player.connect(playerBData.effects.gain);
//         }
//     }

//     // Clamp crossfader position
//     const normalizedValue = Math.min(1, Math.max(0, crossfaderPosition));

//     // Linear curve for predictable muting
//     const gainAValue = 1 - normalizedValue; // 1 at 0, 0 at 1
//     const gainBValue = normalizedValue; // 0 at 0, 1 at 1

//     // Apply gains with strict zeroing
//     playerAData.effects.gain.gain.setValueAtTime(gainAValue < 0.001 ? 0 : gainAValue, Tone.now());
//     playerBData.effects.gain.gain.setValueAtTime(gainBValue < 0.001 ? 0 : gainBValue, Tone.now());

//     // Update effect bypass to prevent residual audio
//     // updateEffectBypass();

//     // Update UI
//     const crossfaderSlider = document.getElementById("crossfader");
//     if (crossfaderSlider) {
//         crossfaderSlider.value = Math.round(normalizedValue * 100);
//     }
//     document.getElementById("crossfaderStatus").textContent = `${Math.round(normalizedValue * 100)}%`;

//     // Debug logging
//     console.log(`Crossfader: ${normalizedValue}, Gain A: ${gainAValue}, Gain B: ${gainBValue}, Actual A: ${playerAData.effects.gain.gain.value}, Actual B: ${playerBData.effects.gain.gain.value}`);
// }

function updateCrossfader(position) {
    // Clamp the position to ensure it stays between 0 and 1
    const normalizedPosition = Math.min(1, Math.max(0, position));

    // Calculate gain values: linear fade between decks
    const gainA = 1 - normalizedPosition; // 1 at 0%, 0 at 100%
    const gainB = normalizedPosition;     // 0 at 0%, 1 at 100%

    // Apply gains with strict zeroing to avoid residual audio
    if (playerAData && playerAData.effects.gain) {
        playerAData.effects.gain.gain.setValueAtTime(gainA < 0.001 ? 0 : gainA, Tone.now());
    }
    if (playerBData && playerBData.effects.gain) {
        playerBData.effects.gain.gain.setValueAtTime(gainB < 0.001 ? 0 : gainB, Tone.now());
    }

    // Update UI
    const crossfaderSlider = document.getElementById("crossfader");
    if (crossfaderSlider) {
        crossfaderSlider.value = Math.round(normalizedPosition * 100);
    }
    const crossfaderStatus = document.getElementById("crossfaderStatus");
    if (crossfaderStatus) {
        crossfaderStatus.textContent = `${Math.round(normalizedPosition * 100)}%`;
    }

    // Debug logging
    console.log(`Crossfader: ${normalizedPosition * 100}%, Gain A: ${gainA}, Gain B: ${gainB}`);
}

// From script.js: Hand Tracking Results
function onResults(results) {
    // const canvasElement = document.getElementById("main-outputCanvas");
    // const canvasCtx = canvasElement.getContext("2d");
    // const offscreenCanvas = document.createElement("canvas");
    // const offscreenCtx = offscreenCanvas.getContext("2d");
    offscreenCanvas.width = canvasElement.width;
    offscreenCanvas.height = canvasElement.height;
    offscreenCtx.drawImage(document.getElementById("main-inputVideo"), 0, 0, canvasElement.width, canvasElement.height);

    offscreenCtx.save();
    offscreenCtx.scale(-1, 1);
    offscreenCtx.translate(-canvasElement.width, 0);
    offscreenCtx.drawImage(document.getElementById("main-inputVideo"), 0, 0, canvasElement.width, canvasElement.height);
    offscreenCtx.restore();

    const currentTime = performance.now();
     //  BG
     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
     canvasCtx.drawImage(segmentationOutputCanvas, 0, 0, canvasElement.width, canvasElement.height);

    // canvasCtx.save();
    // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    // canvasCtx.drawImage(offscreenCanvas, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            const gesture = detectGestures(landmarks);

            // Render hand landmarks
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: '#808080',
                lineWidth: 1
            });

            const fingerColors = [
                '#FF6666', '#66FF66', '#FFFF66', '#CC66CC', '#6666FF'
            ];

            landmarks.forEach((landmark, idx) => {
                const x = landmark.x * canvasElement.width;
                const y = landmark.y * canvasElement.height;
                let color = [0, 1, 2, 3, 4].includes(idx) ? fingerColors[0] :
                            [5, 6, 7, 8].includes(idx) ? fingerColors[1] :
                            [9, 10, 11, 12].includes(idx) ? fingerColors[2] :
                            [13, 14, 15, 16].includes(idx) ? fingerColors[3] :
                            [17, 18, 19, 20].includes(idx) ? fingerColors[4] : '#808080';

                canvasCtx.beginPath();
                canvasCtx.arc(x, y, 2, 0, 2 * Math.PI);
                canvasCtx.fillStyle = color;
                canvasCtx.fill();
            });

            const padding = 20;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            landmarks.forEach(lm => {
                const x = lm.x * canvasElement.width;
                const y = lm.y * canvasElement.height;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            });

            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(canvasElement.width, maxX + padding);
            maxY = Math.min(canvasElement.height, maxY + padding);
            canvasCtx.strokeStyle = '#808080';
            canvasCtx.lineWidth = 1;
            canvasCtx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            const labelText = `${handedness}: ${gesture}`;
            canvasCtx.font = '16px Arial';
            canvasCtx.textAlign = 'center';
            const labelHeight = 16;
            const labelPaddingY = 5;
            const labelX = (minX + maxX) / 2;
            const labelY = minY - 5;

            canvasCtx.fillStyle = '#808080';
            canvasCtx.fillRect(minX, labelY - labelHeight - labelPaddingY, maxX - minX, labelHeight + labelPaddingY * 2);
            canvasCtx.fillStyle = '#FFFFFF';
            canvasCtx.fillText(labelText, labelX, labelY);

            const wrist = landmarks[0];
            const palmBase = landmarks[9];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const thumbIndexDistance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
            );

            // Left Hand Gestures
            if (handedness === 'Left') {
                const isPeaceSign = gesture === "Peace Sign";
                const isPinkyUp = gesture === "PinkyUp";
                const isThumbUp = Math.sqrt(Math.pow(thumbTip.x - palmBase.x, 2) + Math.pow(thumbTip.y - palmBase.y, 2)) > 0.18;

                 // Update p5.js visuals with gesture and landmarks
                //  if (typeof window.updateP5Visuals === 'function') {
                //     window.updateP5Visuals(gesture, landmarks);
                // }
                // Update p5.js visuals if active - Interact
                if (window.updateP5Visuals) {
                    window.updateP5Visuals(gesture, landmarks);
                }

                // PinkyUp: Lock/Unlock Effects
                if (isPinkyUp && currentTime - lastGestureTime >= gestureCooldown) {
                    if (!pinkySignStartTime) {
                        pinkySignStartTime = currentTime;
                        console.log('PinkyUp gesture started');
                    } else {
                        const holdTime = currentTime - pinkySignStartTime;
                        if (holdTime >= 500) {
                            if (selectedEffect !== 'default') {
                                if (!lockedEffects[selectedEffect]) {
                                    lockedEffects[selectedEffect] = true;
                                    switch (selectedEffect) {
                                        case 'delay': lockedDelayValue = sharedEffects.delay.delayTime.value; break;
                                        case 'distortion': lockedDistortionValue = sharedEffects.distortion.distortion; break;
                                        case 'pitch': lockedPitchValue = sharedEffects.pitchShift.pitch; break;
                                        case 'reverb': lockedReverbValue = sharedEffects.reverb.wet.value; break;
                                        case 'filter':
                                            lockedLowpassValue = sharedEffects.lowpassFilter.frequency.value;
                                            lockedHighpassValue = sharedEffects.lowpassFilter.frequency.value;
                                            lockedLowpassWet = lowpassWet;
                                            lockedHighpassWet = highpassWet;
                                            break;
                                    }
                                    showGestureCue(`Locked ${selectedEffect}`, 'lock');
                                    console.log(`Locked ${selectedEffect}`);
                                } else {
                                    lockedEffects[selectedEffect] = false;
                                    showGestureCue(`Unlocked ${selectedEffect}`, 'unlock');
                                    console.log(`Unlocked ${selectedEffect}`);
                                }
                            }
                            lastGestureTime = currentTime;
                            pinkySignStartTime = null;
                        }
                    }
                } else if (!isPinkyUp) {
                    pinkySignStartTime = null;
                }

                // Thumb Gestures: Effect Carousel Navigation
                if (isThumbUp && currentTime - lastEffectToggleTime > effectToggleDelay) {
                    if (thumbTip.x < palmBase.x - 0.15) {
                        selectEffect('left');
                        lastEffectToggleTime = currentTime;
                    } else if (thumbTip.x > palmBase.x + 0.15) {
                        selectEffect('right');
                        lastEffectToggleTime = currentTime;
                    } else {
                        selectEffect('default');
                        lastEffectToggleTime = currentTime;
                    }
                }

                // Peace Sign: Crossfader Control
                if (isPeaceSign) {
                    isCrossfaderActive = true;
                    showGestureCue('Crossfader Active');
                    const indexFingerX = landmarks[8].x;
                    distanceBuffer.push(indexFingerX);
                    if (distanceBuffer.length > 5) distanceBuffer.shift();
                    const smoothedIndexX = distanceBuffer.reduce((a, b) => a + b, 0) / distanceBuffer.length;

                    // Define the gesture control range (0.4 to 0.6 of canvas width)
                    const minX = 0.4; // Left boundary (40% of canvas)
                    const maxX = 0.6; // Right boundary (60% of canvas)

                    // Map the smoothed x-coordinate to the crossfader range (0 to 1)
                    let gesturePosition = (smoothedIndexX - minX) / (maxX - minX);
                    gesturePosition = Math.min(1, Math.max(0, gesturePosition)); // Clamp to 0-1

                    // Apply the crossfader position
                    crossfaderPosition = gesturePosition;
                    updateCrossfader(crossfaderPosition);
                    showGestureCue(`Crossfader: ${Math.round(crossfaderPosition * 100)}%`);

                    // Visualize the gesture area
                    canvasCtx.beginPath();
                    canvasCtx.arc(indexFingerX * canvasElement.width, landmarks[8].y * canvasElement.height, 5, 0, 2 * Math.PI);
                    // canvasCtx.fillStyle = '#FF335F';
                    // canvasCtx.fill();

                    // Draw boundaries of the active crossfader area
                    // canvasCtx.beginPath();
                    // canvasCtx.moveTo(minX * canvasElement.width, 0);
                    // canvasCtx.lineTo(minX * canvasElement.width, canvasElement.height);
                    // canvasCtx.moveTo(maxX * canvasElement.width, 0);
                    // canvasCtx.lineTo(maxX * canvasElement.width, canvasElement.height);
                    // canvasCtx.strokeStyle = 'yellow';
                    // canvasCtx.lineWidth = 2;
                    // canvasCtx.stroke();
                } else {
                    isCrossfaderActive = false;
                    // Optional: Reset to 50% when gesture ends (uncomment if desired)
                    // crossfaderPosition = 0.5;
                    // updateCrossfader(crossfaderPosition);
                }
            }

            // Right Hand: Effects Adjustment
            if (handedness === 'Right' && !musicLocked) {
                const allFingersClosed = gesture === "Closed Fist";
                const maxHandDistance = Math.max(0.1, Math.sqrt(
                    Math.pow(wrist.x - palmBase.x, 2) + Math.pow(wrist.y - palmBase.y, 2)
                ));
                distanceBuffer.push(thumbIndexDistance);
                if (distanceBuffer.length > 5) distanceBuffer.shift();
                const smoothedDistance = distanceBuffer.reduce((a, b) => a + b, 0) / distanceBuffer.length;
                const normalizedStrength = Math.min(1, Math.pow(thumbIndexDistance / (maxHandDistance * 2.0), 2));

                if (!allFingersClosed) {
                    console.log(`[Guest.js] Effect States for ${selectedEffect}:`, {
                        delay: sharedEffects.delay.wet.value,
                        distortion: sharedEffects.distortion.wet.value,
                        pitch: sharedEffects.pitchShift.wet.value,
                        reverb: sharedEffects.reverb.wet.value,
                        lowpassFreq: sharedEffects.lowpassFilter.frequency.value,
                        highpassFreq: sharedEffects.highpassFilter.frequency.value,
                        lowpassWet,
                        highpassWet
                    });
                    if (selectedEffect === 'delay') {
                        if (lockedEffects.delay) {
                            sharedEffects.delay.delayTime.value = lockedDelayValue;
                            sharedEffects.delay.wet.value = lockedDelayValue > 0 ? 1 : 0;
                        } else {
                            sharedEffects.delay.delayTime.value = normalizedStrength * 0.035;
                            sharedEffects.delay.wet.value = normalizedStrength;
                        }
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                        canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                        canvasCtx.strokeStyle = 'yellow';
                        canvasCtx.lineWidth = 2;
                        canvasCtx.stroke();
                        const midX = (thumbTip.x + indexTip.x) / 2 * canvasElement.width;
                        const midY = (thumbTip.y + indexTip.y) / 2 * canvasElement.height;
                        canvasCtx.fillStyle = 'white';
                        canvasCtx.fillText(`Delay: ${(sharedEffects.delay.wet.value * 100).toFixed(0)}%`, midX, midY);
                    } else if (selectedEffect === 'distortion') {
                        if (lockedEffects.distortion) {
                            sharedEffects.distortion.distortion = lockedDistortionValue;
                            sharedEffects.distortion.wet.value = lockedDistortionValue > 0 ? 1 : 0;
                        } else {
                            sharedEffects.distortion.distortion = normalizedStrength;
                            sharedEffects.distortion.wet.value = normalizedStrength;
                        }
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                        canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                        canvasCtx.strokeStyle = 'black';
                        canvasCtx.lineWidth = 3;
                        canvasCtx.stroke();
                        const midX = (thumbTip.x + indexTip.x) / 2 * canvasElement.width;
                        const midY = (thumbTip.y + indexTip.y) / 2 * canvasElement.height;
                        canvasCtx.fillStyle = 'black';
                        canvasCtx.fillText(`Distortion: ${(sharedEffects.distortion.wet.value * 100).toFixed(0)}%`, midX, midY);
                    } else if (selectedEffect === 'pitch') {
                        if (lockedEffects.pitch) {
                            sharedEffects.pitchShift.pitch = lockedPitchValue;
                            sharedEffects.pitchShift.wet.value = Math.abs(lockedPitchValue) > 0.05 ? 1 : 0;
                        } else {
                            const pitchValue = (normalizedStrength - 0.5) * 24;
                            sharedEffects.pitchShift.pitch = pitchValue;
                            sharedEffects.pitchShift.wet.value = normalizedStrength > 0.05 ? 1 : 0;
                        }
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                        canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                        canvasCtx.strokeStyle = 'blue';
                        canvasCtx.lineWidth = 2;
                        canvasCtx.stroke();
                        const midX = (thumbTip.x + indexTip.x) / 2 * canvasElement.width;
                        const midY = (thumbTip.y + indexTip.y) / 2 * canvasElement.height;
                        canvasCtx.fillStyle = 'white';
                        canvasCtx.fillText(`Pitch: ${sharedEffects.pitchShift.pitch.toFixed(1)} st`, midX, midY);
                    } else if (selectedEffect === 'reverb') {
                        if (lockedEffects.reverb) {
                            sharedEffects.reverb.wet.value = lockedReverbValue;
                        } else {
                            sharedEffects.reverb.wet.value = normalizedStrength;
                        }
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                        canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                        canvasCtx.strokeStyle = 'green';
                        canvasCtx.lineWidth = 2;
                        canvasCtx.stroke();
                        const midX = (thumbTip.x + indexTip.x) / 2 * canvasElement.width;
                        const midY = (thumbTip.y + indexTip.y) / 2 * canvasElement.height;
                        canvasCtx.fillStyle = 'white';
                        canvasCtx.fillText(`Reverb: ${(sharedEffects.reverb.wet.value * 100).toFixed(0)}%`, midX, midY);
                    } else if (selectedEffect === 'filter') {
                        if (lockedEffects.filter) {
                            sharedEffects.lowpassFilter.frequency.value = lockedLowpassValue;
                            sharedEffects.highpassFilter.frequency.value = lockedHighpassValue;
                            lowpassWet = lockedLowpassWet;
                            highpassWet = lockedHighpassWet;
                        } else {
                            const shortThreshold = 0.4;
                            const longThreshold = 0.6;
                            if (normalizedStrength < shortThreshold) {
                                const lowpassFactor = normalizedStrength / shortThreshold;
                                sharedEffects.lowpassFilter.frequency.value = 200 + lowpassFactor * 12000;
                                lowpassWet = 0.5 + lowpassFactor * 0.5;
                                sharedEffects.highpassFilter.frequency.value = 200;
                                highpassWet = 0.2;
                            } else if (normalizedStrength > longThreshold) {
                                const highpassFactor = (normalizedStrength - longThreshold) / (1 - longThreshold);
                                sharedEffects.highpassFilter.frequency.value = 200 + highpassFactor * 12000;
                                highpassWet = 0.5 + highpassFactor * 0.5;
                                sharedEffects.lowpassFilter.frequency.value = 12200;
                                lowpassWet = 0.2;
                            } else {
                                const midFactor = (normalizedStrength - shortThreshold) / (longThreshold - shortThreshold);
                                sharedEffects.lowpassFilter.frequency.value = 4800 + midFactor * 2400;
                                sharedEffects.highpassFilter.frequency.value = 4800 + midFactor * 2400;
                                lowpassWet = 0.5;
                                highpassWet = 0.5;
                            }
                        }
                        canvasCtx.beginPath();
                        canvasCtx.moveTo(thumbTip.x * canvasElement.width, thumbTip.y * canvasElement.height);
                        canvasCtx.lineTo(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height);
                        canvasCtx.strokeStyle = 'blue';
                        canvasCtx.lineWidth = 2;
                        canvasCtx.stroke();
                        const midX = (thumbTip.x + indexTip.x) / 2 * canvasElement.width;
                        const midY = (thumbTip.y + indexTip.y) / 2 * canvasElement.height;
                        canvasCtx.fillStyle = 'white';
                        canvasCtx.fillText(
                            `LPF: ${Math.round(sharedEffects.lowpassFilter.frequency.value)}Hz | HPF: ${Math.round(sharedEffects.highpassFilter.frequency.value)}Hz`,
                            midX, midY
                        );
                    }
                } else if (allFingersClosed && !lockedEffects[selectedEffect]) {
                    if (!lockedEffects.delay) sharedEffects.delay.wet.setValueAtTime(0, Tone.now());
                    if (!lockedEffects.distortion) sharedEffects.distortion.wet.setValueAtTime(0, Tone.now());
                    if (!lockedEffects.pitch) sharedEffects.pitchShift.wet.setValueAtTime(0, Tone.now());
                    if (!lockedEffects.reverb) sharedEffects.reverb.wet.setValueAtTime(0, Tone.now());
                    if (!lockedEffects.filter) {
                        lowpassWet = 0;
                        highpassWet = 0;
                        sharedEffects.lowpassFilter.frequency.value = 20000;
                        sharedEffects.highpassFilter.frequency.value = 200;
                    }
                }
            }
        }
    }

    // Reset effects if no hands detected
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        if (!rightHandEffectsLocked && !lockedEffects.delay) sharedEffects.delay.wet.linearRampToValueAtTime(0, Tone.now() + 0.1);
        if (!rightHandEffectsLocked && !lockedEffects.distortion) sharedEffects.distortion.wet.linearRampToValueAtTime(0, Tone.now() + 0.1);
        if (!rightHandEffectsLocked && !lockedEffects.pitch) sharedEffects.pitchShift.wet.linearRampToValueAtTime(0, Tone.now() + 0.1);
        if (!leftHandEffectsLocked && !lockedEffects.reverb) sharedEffects.reverb.wet.linearRampToValueAtTime(0, Tone.now() + 0.1);
        if (!lockedEffects.filter) {
            lowpassWet = 0;
            highpassWet = 0;
            sharedEffects.lowpassFilter.frequency.value = 20000;
            sharedEffects.highpassFilter.frequency.value = 200;
        }

        // Update p5.js visuals when no hands detected
        // if (typeof window.updateP5Visuals === 'function') {
        //     window.updateP5Visuals('None', null);
        // }

        // Reset visuals when no hand is detected - Interact
        if (window.updateP5Visuals) {
            window.updateP5Visuals(null, null);
        }
    }

    // Draw active cue if present
    if (cueState && currentTime - cueState.startTime < cueState.duration) {
        canvasCtx.save();
        if (cueState.type === 'lock' || cueState.type === 'unlock') {
        const image = cueState.type === 'lock' ? lockImage : unlockImage;
        const size = 128;
        const x = cueState.x - size / 2;
        const y = cueState.y - size / 2;

        if (image.complete) {
            canvasCtx.drawImage(image, x, y, size, size);
        }
    // } else {
    //     canvasCtx.font = '16px Arial';
    //     canvasCtx.fillStyle = '#FFFFFF';
    //     canvasCtx.textAlign = 'center';
    //     canvasCtx.textBaseline = 'middle';
    //     canvasCtx.fillText(cueState.message, cueState.x, cueState.y);
    }
        canvasCtx.restore();
    }

    canvasCtx.restore();
    if (sharedEffects) {
        updateAllEffectStatusDisplays();
    }
}

async function startPlaying(playerData) {
    try {
        await initializeAudioContext();
        await ensureContextRunning();
        if (playerData.player && playerData.state.currentSongIndex !== -1) {
            if (!playerData.player.loaded) {
                console.warn(`[Guest.js] Tone.Player not loaded for ${playerData.id}. Waiting for load event.`);
                playerData.player.onload = () => {
                    startPlaying(playerData);
                };
                return;
            }
            if (playerData.isPlaying) {
                playerData.player.stop();
                playerData.isPlaying = false;
                playerData.playbackStartTime = null; // Reset start time
                updateMusicInfo(playerData, "Paused");
                document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Play";
                renderWaveform(playerData); // Redraw waveform to show paused state
            } else {
                playerData.playbackStartTime = playerData.player.context.currentTime; // Set start time
                playerData.player.start();
                playerData.isPlaying = true;
                updateMusicInfo(playerData, "Playing");
                document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Pause";
            }
            updateProgress(playerData);
        } else {
            console.warn(`[Guest.js] Cannot start playback for ${playerData.id}: No song loaded or Tone.Player not initialized`);
            updateMusicInfo(playerData, "No track loaded");
        }
    } catch (err) {
        console.error(`[Guest.js] Error starting playback for ${playerData.id}:`, err);
        updateMusicInfo(playerData, "Error starting playback");
    }
}
// async function startPlaying(playerData) {
//     try {
//         await initializeAudioContext();
//         await ensureContextRunning();

//         if (playerData.player && playerData.state.currentSongIndex !== -1) {
//             if (!playerData.player.loaded) {
//                 console.warn(`[Guest.js] Tone.Player not loaded for ${playerData.id}. Waiting for load event.`);
//                 playerData.player.onload = () => {
//                     startPlaying(playerData);
//                 };
//                 return;
//             }

//             if (playerData.isPlaying) {
//                 // Pause
//                 const elapsed = playerData.player.context.currentTime - playerData.playbackStartTime;
//                 playerData.state.currentTime = playerData.playbackOffset + elapsed;

//                 playerData.player.stop();
//                 playerData.isPlaying = false;
//                 playerData.playbackStartTime = null;

//                 if (playerData.progressInterval) {
//                     clearInterval(playerData.progressInterval);
//                     playerData.progressInterval = null;
//                 }

//                 updateMusicInfo(playerData, "Paused");
//                 document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Play";
//                 renderWaveform(playerData);
//             } else {
//                 // Resume
//                 const offset = playerData.state.currentTime || 0;
//                 playerData.playbackOffset = offset;
//                 playerData.playbackStartTime = playerData.player.context.currentTime;

//                 playerData.player.start(Tone.now(), offset);

//                 playerData.isPlaying = true;
//                 updateMusicInfo(playerData, "Playing");
//                 document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Pause";
//                 updateProgress(playerData);
//             }

//         } else {
//             console.warn(`[Guest.js] Cannot start playback for ${playerData.id}: No song loaded or Tone.Player not initialized`);
//             updateMusicInfo(playerData, "No track loaded");
//         }
//     } catch (err) {
//         console.error(`[Guest.js] Error starting playback for ${playerData.id}:`, err);
//         updateMusicInfo(playerData, "Error starting playback");
//     }
// }

function updateVolume(playerData, source) {
    const volumePercent = playerData.state.volume * 100;
    const volumeValue = volumePercent === 0 ? -Infinity : (volumePercent / 100) * 60 - 60;
    playerData.effects.volume.volume.setValueAtTime(volumeValue, Tone.now());
    if (playerData.wavesurfer) playerData.wavesurfer.setVolume(playerData.state.volume);
    const volumeStatusElementId = playerData.id === "deck-a" ? "volumeStatus" : "volumeStatusB";
    document.getElementById(volumeStatusElementId).textContent = `${Math.round(playerData.state.volume * 100)}%`;
    if (source === "gesture") {
        const sliderId = playerData.id === "deck-a" ? "volumeSlider" : "volumeSliderB";
        document.getElementById(sliderId).value = playerData.state.volume * 100;
    }
    updateCrossfader();
}

function resumeAudioContext() {
    if (!audioCtx) {
        console.error("[resumeAudioContext] audioCtx is null.");
        return;
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("[resumeAudioContext] AudioContext resumed.");
        }).catch(e => {
            console.error("[resumeAudioContext] Error resuming:", e);
            alert("Could not start audio.");
        });
    }
}

function handleFileUpload(event, playerData) {
    const files = event.target.files;
    Array.from(files).forEach(file => {
        const url = URL.createObjectURL(file);
        jsmediatags.read(file, {
            onSuccess: (tag) => {
                const picture = tag.tags.picture;
                let coverUrl = 'https://via.placeholder.com/100';
                if (picture) {
                    const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
                    coverUrl = URL.createObjectURL(blob);
                }
                const song = {
                    name: tag.tags.title || file.name.replace(/\.[^/.]+$/, ""),
                    artist: tag.tags.artist || "",
                    album: tag.tags.album || "Unknown Album",
                    url,
                    cover: coverUrl,
                    id: `uploaded_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    source: 'upload',
                    addedAt: Date.now()
                };
                musicLibrary.push(song);
                playerData.state.playlist.push(song);
                renderMainPlaylist();
                updateMusicLibraryCarousel();
            },
            onError: (error) => {
                console.error("[Guest.js] Error reading tags:", error);
                const song = {
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    url,
                    cover: 'https://via.placeholder.com/100',
                    id: `uploaded_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    source: 'upload',
                    artist: "",
                    album: "Unknown Album",
                    addedAt: Date.now()
                };
                musicLibrary.push(song);
                playerData.state.playlist.push(song);
                renderMainPlaylist();
                updateMusicLibraryCarousel();
            }
        });
    });
    event.target.value = null;
}

function deleteSong(playerData) {
    if (playerData.state.currentSongIndex >= 0 && playerData.state.currentSongIndex < playerData.state.playlist.length) {
        const songToRemove = playerData.state.playlist[playerData.state.currentSongIndex];
        const songIdToRemove = songToRemove.id;
        playerData.state.playlist.splice(playerData.state.currentSongIndex, 1);
        const originalIndexInLibrary = musicLibrary.findIndex(s => s.id === songIdToRemove);
        if (originalIndexInLibrary > -1) {
            if (musicLibrary[originalIndexInLibrary].url && musicLibrary[originalIndexInLibrary].url.startsWith('blob:')) {
                URL.revokeObjectURL(musicLibrary[originalIndexInLibrary].url);
            }
            if (musicLibrary[originalIndexInLibrary].cover && musicLibrary[originalIndexInLibrary].cover.startsWith('blob:')) {
                URL.revokeObjectURL(musicLibrary[originalIndexInLibrary].cover);
            }
            musicLibrary.splice(originalIndexInLibrary, 1);
        }
        playerData.state.currentSongIndex = Math.min(playerData.state.currentSongIndex, playerData.state.playlist.length - 1);
        if (playerData.state.currentSongIndex >= 0 && playerData.state.playlist.length > 0) {
            loadSong(playerData, playerData.state.currentSongIndex);
        } else {
            playerData.state.currentSongIndex = -1;
            if (playerData.player.state === "started") {
                playerData.player.stop();
            }
            playerData.waveformData = null; // Clear waveform data
            playerData.state.currentTime = 0;
            playerData.isPlaying = false;

            // Stop the progress update interval
            if (playerData.progressInterval) {
                clearInterval(playerData.progressInterval);
                playerData.progressInterval = null;
            }

            renderWaveform(playerData); // Redraw to show empty waveform
            updateMusicInfo(playerData, "No track loaded");
            document.getElementById(`${playerData.id}-coverArt`).style.backgroundImage = "none";
            updateProgressBar(playerData, 0, 0);
            // playerData.isPlaying = false;
            document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Play";
        }
        renderMainPlaylist();
        updateMusicLibraryCarousel();
    }
}

function toggleRecording(playerData) {
    if (playerData.state.isSoundCloudSource && !TabAudioAnalyzer.isCapturing()) {
        soundcloudWidget.isPaused((paused) => {
            if (paused) {
                alert("Please press play on the SoundCloud player first.");
                return;
            }
            soundcloudWidget.setVolume(0);
            const effectChain = Tone.context.createGain();
            const sharedEffects = playerAData.effects.sharedEffects;
            effectChain.chain(
                sharedEffects.delay,
                sharedEffects.distortion,
                sharedEffects.pitchShift,
                sharedEffects.reverb,
                sharedEffects.lowpassFilter,
                sharedEffects.highpassFilter,
                sharedEffects.finalGain
            );
            TabAudioAnalyzer.setEffectChain(effectChain);
            TabAudioAnalyzer.startAudioCapture({
                fftSize: 256,
                onStop: () => {
                    isSoundCloudActive = false;
                    playerData.state.isSoundCloudSource = false;
                    updateMusicInfo(playerData, "Stopped");
                    resetUI(playerData);
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                    alert("Tab audio capture stopped.");
                },
                onAudioBuffer: (audioBuffer) => {
                    TabAudioAnalyzer.playAudioBuffer(audioBuffer);
                }
            }).then(success => {
                if (success) {
                    isSoundCloudActive = true;
                    drawVisualization();
                } else {
                    isSoundCloudActive = false;
                    playerData.state.isSoundCloudSource = false;
                    updateMusicInfo(playerData, "Error");
                    alert("Failed to start tab audio capture.");
                }
            });
        });
    } else if (TabAudioAnalyzer.isCapturing()) {
        TabAudioAnalyzer.stopAudioCapture();
    }
}

async function loadSong(playerData, index) {
    try {
        await initializeAudioContext();
        if (!sharedEffects) {
            throw new Error(`[Guest.js] sharedEffects not initialized for ${playerData.id}`);
        }
        await ensureContextRunning();

        const coverArtId = playerData.id === "deck-a" ? "deck-a-coverArt" : "deck-b-coverArt";
        const coverArtElement = document.getElementById(coverArtId);

        if (index < 0 || index >= playerData.state.playlist.length) {
            console.warn(`[Guest.js] Invalid song index ${index} for ${playerData.id}`);
            coverArtElement.style.backgroundImage = `url('/static/index_picture/vinyl disk.png')`;
            coverArtElement.setAttribute("data-song-cover", "");
            updateMusicInfo(playerData, "No track loaded");
            updateProgressBar(playerData, 0, 0);
            playerData.waveformData = null;
            renderWaveform(playerData);
            return;
        }

        const song = playerData.state.playlist[index];
        if (!song.url) {
            console.error(`[Guest.js] No stream URL for song ${song.name} in ${playerData.id}`);
            return;
        }

        playerData.state.currentSongIndex = index;
        if (playerData.player.state === "started") {
            playerData.player.stop();
        }
        playerData.playbackStartTime = null;

        await playerData.player.load(song.url);
        playerData.state.duration = playerData.player.buffer.duration || 0;

        const buffer = playerData.player.buffer.get();
        const numSamples = 2048;
        const channelData = buffer.getChannelData(0);
        const samplesPerBin = Math.floor(channelData.length / numSamples);
        playerData.waveformData = new Float32Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
            const start = i * samplesPerBin;
            const end = Math.min(start + samplesPerBin, channelData.length);
            let max = 0;
            for (let j = start; j < end; j++) {
                const val = Math.abs(channelData[j]);
                max = Math.max(max, val);
            }
            playerData.waveformData[i] = max;
        }

        const maxAmplitude = Math.max(...playerData.waveformData);
        if (maxAmplitude > 0) {
            for (let i = 0; i < numSamples; i++) {
                playerData.waveformData[i] /= maxAmplitude;
            }
        }

        // Smooth the waveform data (simple moving average)
        const smoothedData = new Float32Array(numSamples);
        const smoothingWindow = 5; // Number of points to average
        for (let i = 0; i < numSamples; i++) {
            let sum = 0;
            let count = 0;
            for (let j = Math.max(0, i - smoothingWindow); j <= Math.min(numSamples - 1, i + smoothingWindow); j++) {
                sum += playerData.waveformData[j];
                count++;
            }
            smoothedData[i] = sum / count;
        }
        playerData.waveformData = smoothedData;

        renderWaveform(playerData);

        // Set cover art or placeholder (already handled here, so no need for updateCoverArt)
        if (song.cover) {
            coverArtElement.style.backgroundImage = `url('${song.cover}')`;
            coverArtElement.setAttribute("data-song-cover", song.cover);
        } else {
            coverArtElement.style.backgroundImage = `url('/static/index_picture/vinyl disk.png')`;
            coverArtElement.setAttribute("data-song-cover", "");
        }

        updateMusicInfo(playerData, song.name);
        // Remove the call to updateCoverArt since it's redundant
        // updateCoverArt(playerData, index); // <-- Removed
        updateProgressBar(playerData, 0, playerData.state.duration);
        renderMainPlaylist();
        console.log(`[Guest.js] Loaded song ${song.name} for ${playerData.id}, duration: ${playerData.state.duration.toFixed(2)}s`);

        playerData.player.onstop = () => {
            playerData.isPlaying = false;
            playerData.playbackStartTime = null;
            updateMusicInfo(playerData, "Paused");
            document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Play";
            updateProgressBar(playerData, 0, playerData.state.duration);
            updateProgress(playerData);
            renderWaveform(playerData);
            const nextIndex = playerData.state.currentSongIndex + 1;
            const otherPlayer = playerData.id === "deck-a" ? playerBData : playerAData;
            if (nextIndex < playerData.state.playlist.length) {
                loadSong(playerData, nextIndex);
                playerData.player.onload = () => {
                    if (playerData.player.loaded && !playerData.isPlaying) {
                        playerData.player.start();
                    }
                };
            } else if (otherPlayer.state.currentSongIndex + 1 < otherPlayer.state.playlist.length) {
                loadSong(otherPlayer, otherPlayer.state.currentSongIndex + 1);
                otherPlayer.player.onload = () => {
                    if (otherPlayer.player.loaded && !otherPlayer.isPlaying) {
                        otherPlayer.player.start();
                    }
                };
            }
            renderMainPlaylist();
        };
    } catch (error) {
        console.error(`[Guest.js] Error loading song for ${playerData.id}:`, error);
    }
}

function renderWaveform(playerData) {
    const canvasId = playerData.id === "deck-a" ? "waveform" : "waveform-b";
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`[Guest.js] Waveform canvas ${canvasId} not found for ${playerData.id}`);
        return;
    }
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const waveformData = playerData.waveformData;



    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // If no waveform data, draw a flat line
    if (!waveformData || waveformData.length === 0) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
    }

    // Calculate progress
    const currentTime = playerData.state.currentTime || 0;
    const duration = playerData.state.duration || 1;
    const progressRatio = Math.min(currentTime / duration, 1);
    const progressX = width * progressRatio;

    // Draw the full waveform (background)
    ctx.beginPath();
    const step = width / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
        const x = i * step;
        const y = (1 - waveformData[i]) * (height / 2); // Invert and scale to canvas height
        if (i === 0) {
            ctx.moveTo(x, height / 2);
        }
        ctx.lineTo(x, y);
        ctx.lineTo(x, height - y);
    }
    ctx.strokeStyle = "#ffffff"; // Waveform color
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw the played portion (progress)
    ctx.beginPath();
    for (let i = 0; i < waveformData.length; i++) {
        const x = i * step;
        if (x > progressX) break;
        const y = (1 - waveformData[i]) * (height / 2);
        if (i === 0) {
            ctx.moveTo(x, height / 2);
        }
        ctx.lineTo(x, y);
        ctx.lineTo(x, height - y);
    }
    ctx.strokeStyle = playerData.id === "deck-a" ? "#FF335F" : "#3F5AD5"; // Progress color (red for A, blue for B)
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw cursor
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.strokeStyle = "#FF0000"; // Cursor color
    ctx.lineWidth = 2;
    ctx.stroke();
}

function updateMusicInfo(playerData, status) {
    const infoElementId = playerData.id === "deck-a" ? "musicInfo" : "musicInfoB";
    const infoElement = document.getElementById(infoElementId);
    if (infoElement) {
        const songIndex = playerData.state.currentSongIndex;
        const song = (songIndex >= 0 && songIndex < playerData.state.playlist.length)
                    ? playerData.state.playlist[songIndex] : null;
        if (song && song.name) {
            const artist = song.artist || "";
            let displayText = `${song.name} - ${artist} [${status}]`;

            // -- CHANGE 1: Truncate text if too long and add ellipsis --
            const maxLength = 70; // Maximum length before truncation
            if (displayText.length > maxLength) {
                displayText = displayText.substring(0, maxLength - 3) + "...";
            }
            infoElement.textContent = displayText;
        } else {
            infoElement.textContent = status;
        }
    }
}

// function updateCoverArt(playerData, songIndex) {
//     const coverElementId = `${playerData.id}-coverArt`;
//     const coverElement = document.getElementById(coverElementId);
//     if (coverElement && songIndex >= 0 && songIndex < playerData.state.playlist.length) {
//         const song = playerData.state.playlist[songIndex];
//         const coverUrl = (song && song.cover && song.cover !== "") ? song.cover : '';
//         coverElement.style.backgroundImage = `url('${coverUrl}')`;
//         coverElement.style.backgroundSize = 'cover';
//         coverElement.style.backgroundPosition = 'center';
//     } else if (coverElement) {
//         coverElement.style.backgroundImage = "none";
//     }
// }

function updateCoverArt(playerData, songIndex) {
    const coverElementId = `${playerData.id}-coverArt`;
    const coverElement = document.getElementById(coverElementId);
    if (coverElement && songIndex >= 0 && songIndex < playerData.state.playlist.length) {
        const song = playerData.state.playlist[songIndex];
        const coverUrl = (song && song.cover && song.cover !== "") ? song.cover : '';
        coverElement.style.backgroundImage = `url('${coverUrl}')`;
        coverElement.style.backgroundSize = 'cover';
        coverElement.style.backgroundPosition = 'center';
        coverElement.setAttribute("data-song-cover", coverUrl);
    } else if (coverElement) {
        // Instead of "none", set the placeholder image
        coverElement.style.backgroundImage = `url('/static/index_picture/vinyl disk.png')`;
        coverElement.setAttribute("data-song-cover", "");
    }
}

function updateProgress(playerData) {
    if (playerData.progressInterval) {
        clearInterval(playerData.progressInterval);
        playerData.progressInterval = null;
    }
    if (playerData.isPlaying && playerData.player && playerData.player.loaded && playerData.playbackStartTime !== null) {
        playerData.progressInterval = setInterval(() => {
            if (!playerData.isPlaying || !playerData.player || !playerData.player.loaded) {
                if (playerData.progressInterval) {
                    clearInterval(playerData.progressInterval);
                    playerData.progressInterval = null;
                }
                return;
            }
            try {
                
                const currentTime = playerData.player.context.currentTime - playerData.playbackStartTime;
                const duration = playerData.state.duration;
                playerData.state.currentTime = currentTime;
                updateProgressBar(playerData, currentTime, duration);
                renderWaveform(playerData); // Redraw waveform to update progress
                if (currentTime >= duration) {
                    clearInterval(playerData.progressInterval);
                    playerData.progressInterval = null;
                }
            } catch (error) {
                console.error(`[Interval - ${playerData.id}] Error updating progress:`, error);
            }
        }, 50); // Update more frequently for smoother movement
    }
}
// function updateProgress(playerData) {
//     if (playerData.progressInterval) {
//         clearInterval(playerData.progressInterval);
//         playerData.progressInterval = null;
//     }

//     if (playerData.isPlaying && playerData.player && playerData.player.loaded && playerData.playbackStartTime !== null) {
//         playerData.progressInterval = setInterval(() => {
//             if (!playerData.isPlaying || !playerData.player || !playerData.player.loaded) {
//                 clearInterval(playerData.progressInterval);
//                 playerData.progressInterval = null;
//                 return;
//             }

//             try {
//                 const elapsed = playerData.player.context.currentTime - playerData.playbackStartTime;
//                 const currentTime = (playerData.playbackOffset || 0) + elapsed;
//                 const duration = playerData.state.duration || 1;

//                 playerData.state.currentTime = Math.min(currentTime, duration);

//                 updateProgressBar(playerData, playerData.state.currentTime, duration);
//                 renderWaveform(playerData);

//                 if (playerData.state.currentTime >= duration) {
//                     clearInterval(playerData.progressInterval);
//                     playerData.progressInterval = null;

//                     playerData.player.stop();
//                     playerData.isPlaying = false;
//                     playerData.playbackStartTime = null;
//                     playerData.state.currentTime = 0;
//                     playerData.playbackOffset = 0;

//                     updateMusicInfo(playerData, "Paused");
//                     document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Play";
//                     renderWaveform(playerData);
//                 }
//             } catch (error) {
//                 console.error(`[Interval - ${playerData.id}] Error updating progress:`, error);
//             }
//         }, 100);
//     }
// }

function updateProgressBar(playerData, currentTime, duration) {
    const progressBarId = `${playerData.id}-progressBar`;
    const currentTimeElementId = `${playerData.id}-currentTime`;
    const totalTimeElementId = `${playerData.id}-totalTime`;
    const progressBar = document.getElementById(progressBarId);
    const currentTimeElement = document.getElementById(currentTimeElementId);
    const totalTimeElement = document.getElementById(totalTimeElementId);
    const validDuration = (duration && typeof duration === 'number' && duration > 0) ? duration : 0;
    const validCurrentTime = (typeof currentTime === 'number' && currentTime >= 0) ? currentTime : 0;
    let progressPercent = validDuration > 0 ? (validCurrentTime / validDuration) * 100 : 0;
    const finalProgressPercent = Math.min(Math.max(0, progressPercent), 100);
    if (progressBar && currentTimeElement && totalTimeElement) {
        progressBar.style.width = `${finalProgressPercent.toFixed(2)}%`;
        currentTimeElement.textContent = formatTime(validCurrentTime);
        totalTimeElement.textContent = formatTime(validDuration);
    }
}

function formatTime(seconds) {
    const secs = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

function renderMainPlaylist() {
    const deckAPlaylistInner = document.getElementById("deck-a-playlist-inner");
    const deckBPlaylistInner = document.getElementById("deck-b-playlist-inner");
    if (!deckAPlaylistInner || !deckBPlaylistInner) {
        console.error("[Guest.js] Playlist inner elements not found.");
        return;
    }

    const renderDeckPlaylist = (playerData, innerElement) => {
        innerElement.innerHTML = "";
        const playlist = playerData.state.playlist;
        const currentSongIndex = playerData.state.currentSongIndex;
        if (playlist.length === 0) {
            innerElement.innerHTML = '<p class="empty-playlist-text">Drag songs here</p>';
            return;
        }
        playlist.forEach((song, index) => {
            const item = document.createElement("div");
            item.className = `playlist-item ${index === currentSongIndex ? 'active' : ''}`;
            item.dataset.index = index;
            item.dataset.deckId = playerData.id === "deck-a" ? "A" : "B";
            const songInfo = `${song.name || 'Unknown Track'} - ${song.artist || 'Unknown Artist'}`;
            item.innerHTML = `
                <span class="playlist-item-info" title="${songInfo}">${songInfo}</span>
                <button class="remove-playlist-item-btn" title="Remove">×</button>
            `;
            item.addEventListener("click", () => {
                loadSong(playerData, parseInt(item.dataset.index));
                renderMainPlaylist();
            });
            const removeBtn = item.querySelector(".remove-playlist-item-btn");
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const indexToRemove = parseInt(e.target.closest('.playlist-item').dataset.index);
                const deckIdToRemoveFrom = e.target.closest('.playlist-item').dataset.deckId;
                handleRemoveSongFromPlaylist(deckIdToRemoveFrom, indexToRemove);
            });
            innerElement.appendChild(item);
        });
    };

    renderDeckPlaylist(playerAData, deckAPlaylistInner);
    renderDeckPlaylist(playerBData, deckBPlaylistInner);
}

function resetUI(playerData) {
    const progressBarId = `${playerData.id}-progressBar`;
    const currentTimeElementId = `${playerData.id}-currentTime`;
    const totalTimeElementId = `${playerData.id}-totalTime`;
    const coverElementId = `${playerData.id}-coverArt`;
    document.getElementById(progressBarId).style.width = "0%";
    document.getElementById(currentTimeElementId).textContent = "00:00";
    document.getElementById(totalTimeElementId).textContent = "00:00";
    document.getElementById(coverElementId).style.backgroundImage = "none";
    const defaultEffects = { delay: 0, distortion: 0, pitch: 0, reverb: 0, filter: 0 };
    playerData.state = { ...playerData.state, ...defaultEffects };
}

function drawVisualization() {
    const canvas = document.getElementById("waveform-canvas");
    if (!canvas) {
        console.error("[Guest.js] Visualization canvas not found.");
        return;
    }
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    let lastRender = performance.now();

    function render() {
        if (!TabAudioAnalyzer.isCapturing()) {
            ctx.clearRect(0, 0, width, height);
            animationFrameId = null;
            return;
        }
        const now = performance.now();
        if (now - lastRender < 33) {
            animationFrameId = requestAnimationFrame(render);
            return;
        }
        lastRender = now;
        const waveform = TabAudioAnalyzer.getWaveformData();
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        if (!waveform || waveform.length === 0 || waveform.every(v => v === 128)) {
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            animationFrameId = requestAnimationFrame(render);
            return;
        }
        const sliceWidth = width / waveform.length;
        let x = 0;
        ctx.moveTo(x, height / 2);
        for (let i = 0; i < waveform.length; i++) {
            const v = (waveform[i] / 128.0) * (height / 2);
            const y = height / 2 - v + (height / 2);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.stroke();
        animationFrameId = requestAnimationFrame(render);
    }

    if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
    }
}


function initializeMusicLibrary() {
    if (typeof initialSongs !== "undefined" && Array.isArray(initialSongs)) {
        musicLibrary = initialSongs.map((song, index) => ({
            ...song,
            id: song.id || `initial_${index + 1}`,
            artist: song.artist || "",
            album: song.album || "Unknown Album",
            cover: (song.cover && song.cover !== "") ? song.cover : 'https://via.placeholder.com/100',
            source: song.source || 'local',
            addedAt: song.addedAt || Date.now()
        }));
        console.log("[Guest.js] Initialized music library with", musicLibrary.length, "songs.");
    } else {
        musicLibrary = [];
    }
    updateMusicLibraryCarousel();
}

function updateMusicLibraryCarousel(songsToDisplay = musicLibrary) {
    const carouselInner = document.getElementById("music-library-carousel-inner");
    if (!carouselInner) {
        console.error("[Guest.js] Music library carousel not found.");
        return;
    }
    carouselInner.innerHTML = "";
    if (!songsToDisplay || songsToDisplay.length === 0) {
        carouselInner.innerHTML = '<p style="color: #ccc; text-align: center; padding: 10px;">No songs found</p>';
        return;
    }
    songsToDisplay.forEach(song => {
        const item = document.createElement("div");
        item.className = "carousel-item library-item";
        item.draggable = true;
        item.dataset.songId = song.id;
        const coverUrl = song.cover && song.cover !== "" ? song.cover : 'https://dummyimage.com/100x100/333/eee.png&text=Cover';
        item.innerHTML = `
            <img src="${coverUrl}" alt="${song.name}" draggable="false">
            <div class="library-item-info">
                <p class="library-item-name" title="${song.name}">${song.name}</p>
                <p class="library-item-artist" title="${song.artist || ''}">${song.artist || ''}</p>
            </div>
        `;
        item.addEventListener("dblclick", () => {
            const targetDeck = currentCue === 'A' ? playerAData : playerBData;
            const songToLoad = musicLibrary.find(s => s.id === song.id);
            if (songToLoad) {
                if (!targetDeck.state.playlist.some(s => s.id === songToLoad.id)) {
                    targetDeck.state.playlist.push({ ...songToLoad });
                }
                const indexInDeck = targetDeck.state.playlist.findIndex(s => s.id === songToLoad.id);
                if (indexInDeck !== -1) {
                    loadSong(targetDeck, indexInDeck);
                }
            }
        });
        carouselInner.appendChild(item);
    });
    const items = carouselInner.querySelectorAll(".carousel-item.library-item");
    items.forEach(item => {
        item.addEventListener("dragend", (event) => {
            event.target.classList.remove("dragging");
        });
    });
}

function handleRemoveSongFromPlaylist(deckId, index) {
    const playerData = deckId === 'A' ? playerAData : playerBData;
    const playlist = playerData.state.playlist;
    if (index < 0 || index >= playlist.length) {
        console.warn(`[Guest.js] Invalid index ${index} for playlist on Deck ${deckId}.`);
        return;
    }
    const songToRemove = playlist[index];
    if (playerData.state.currentSongIndex === index && playerData.isPlaying) {
        alert("Cannot delete the song currently playing on Deck " + deckId + ".");
        return;
    }
    playlist.splice(index, 1);
    if (playerData.state.currentSongIndex > index) {
        playerData.state.currentSongIndex--;
    } else if (playerData.state.currentSongIndex === index) {
        playerData.state.currentSongIndex = -1;
        if (playerData.wavesurfer) playerData.wavesurfer.empty();
        updateMusicInfo(playerData, "No track loaded");
        updateCoverArt(playerData, -1);
        updateProgressBar(playerData, 0, 0);
        playerData.isPlaying = false;
        document.getElementById(playerData.id === "deck-a" ? "playStopBtn" : "playStopBtnB").textContent = "Play";
    }
    // Clean up blob URLs
    if (songToRemove.url && songToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(songToRemove.url);
    }
    if (songToRemove.cover && songToRemove.cover.startsWith('blob:')) {
        URL.revokeObjectURL(songToRemove.cover);
    }
    // Remove from musicLibrary if it was an uploaded song
    const libraryIndex = musicLibrary.findIndex(s => s.id === songToRemove.id);
    if (libraryIndex !== -1 && songToRemove.source === 'upload') {
        musicLibrary.splice(libraryIndex, 1);
        updateMusicLibraryCarousel();
    }
    renderMainPlaylist();
}

async function loadMusicLibrary() {
    console.log("[Guest.js] Loading music library from API...");
    const libraryContainer = document.getElementById('music-library-carousel-inner');
    if (!libraryContainer) {
        console.error("[Guest.js] Music library container not found!");
        return;
    }
    libraryContainer.innerHTML = '<p style="padding: 10px; text-align: center;">Loading library...</p>';

    try {
        const response = await fetch('/api/songs');
        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        const songs = await response.json();

        fullSongLibrary = songs.map(s => ({
            ...s,
            id: s._id,
            artist: s.artist || "",
            album: s.album || "Unknown Album",
            cover: s.cover || 'https://via.placeholder.com/100',
            source: s.source || 'api'
        }));
        musicLibrary = [...fullSongLibrary];
        console.log("[Guest.js] Music library loaded with", musicLibrary.length, "songs.");
        displayLibrarySongs(musicLibrary, libraryContainer, fullSongLibrary);
    } catch (error) {
        console.error("[Guest.js] Error loading music library:", error);
        libraryContainer.innerHTML = `<p style="padding: 10px; text-align: center; color: #ff5555;">Failed to load library: ${error.message}</p>`;
    }
}

async function ensureContextRunning() {
    if (audioCtx.state === 'suspended') {
        await new Promise(resolve => {
            const resumeHandler = async () => {
                try {
                    await audioCtx.resume();
                    await Tone.start();
                    console.log("[Guest.js] AudioContext resumed and Tone.js started in ensureContextRunning");
                    resolve();
                    window.removeEventListener('click', resumeHandler);
                    window.removeEventListener('touchstart', resumeHandler);
                } catch (err) {
                    console.error("[Guest.js] Error resuming AudioContext in ensureContextRunning:", err);
                }
            };
            window.addEventListener('click', resumeHandler);
            window.addEventListener('touchstart', resumeHandler);
        });
    } else if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log("[Guest.js] Tone.js started in ensureContextRunning");
    }
}

// --- File: ../static/backend/guest.js ---
// ... (các biến và hàm khác) ...

function displayLibrarySongs(songs, container, fullLibrary) {
    if (!container) {
        console.error("[Guest.js] Library container is null.");
        document.dispatchEvent(new CustomEvent('libraryLoadError', { detail: { message: 'Library container element not found.' } }));
        return;
    }
    container.innerHTML = "";

    if (!songs || songs.length === 0) {
        container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 10px;">No songs found</p>';
        document.dispatchEvent(new CustomEvent('libraryRendered'));
        return;
    }

    songs.forEach(song => {
        if (!song._id || !song.gridfs_id) {
            console.warn("[Guest.js] Skipping song with missing _id or gridfs_id:", song.name);
            return;
        }

        const item = document.createElement("div");
        item.className = "carousel-item library-item";
        item.draggable = true;

        item.dataset.songId = song._id;
        item.dataset.gridfsId = song.gridfs_id;
        item.dataset.streamUrl = song.url || `/api/songs/stream/${song.gridfs_id}`;
        item.dataset.songName = song.name || 'Unknown Track';
        item.dataset.artistName = song.artist || 'Unknown Artist';
        item.dataset.cover = song.cover || 'https://via.placeholder.com/100';
        item.dataset.source = song.source || 'api';

        const coverUrl = item.dataset.cover && item.dataset.cover !== 'https://via.placeholder.com/100'
                         ? item.dataset.cover
                         : 'https://dummyimage.com/100x100/333/eee.png&text=Cover';

        item.innerHTML = `
            <img src="${coverUrl}" alt="${item.dataset.songName}" draggable="false">
            <div class="library-item-info">
                <p class="library-item-name" title="${item.dataset.songName}">${item.dataset.songName}</p>
                <p class="library-item-artist" title="${item.dataset.artistName}">${item.dataset.artistName}</p>
            </div>
        `;

        item.addEventListener('dblclick', () => {
            const targetPlayerData = playerAData.state.currentSongIndex === -1 ? playerAData : playerBData;
            if (!targetPlayerData.state.playlist.some(s => s.id === song._id)) {
                const songToAdd = {
                    id: song._id,
                    _id: song._id,
                    name: song.name || 'Unknown Track',
                    artist: song.artist || 'Unknown Artist',
                    cover: song.cover || 'https://via.placeholder.com/100',
                    url: song.url || `/api/songs/stream/${song.gridfs_id}`,
                    source: song.source || 'api',
                    gridfs_id: song.gridfs_id
                };
                targetPlayerData.state.playlist.push(songToAdd);
                const indexInDeck = targetPlayerData.state.playlist.length - 1;
                loadSong(targetPlayerData, indexInDeck);
                renderMainPlaylist();
            }
        });

        container.appendChild(item);
    });

    console.log("[Guest.js] displayLibrarySongs completed render. Dispatching 'libraryRendered'.");
    document.dispatchEvent(new CustomEvent('libraryRendered'));
}

// ... (các hàm và logic khác trong guest.js) ...

// GỠ BỎ HÀM initializeDragAndDrop khỏi guest.js
// Vì logic thiết lập dropzone đã được xử lý trong dragdrop.js
/*
function initializeDragAndDrop() {
    const deckAPlaylist = document.getElementById("deck-a-playlist-inner");
    const deckBPlaylist = document.getElementById("deck-b-playlist-inner");

    const setupDropZone = (element, deckId) => {
        element.addEventListener("dragover", (event) => {
            event.preventDefault();
            element.classList.add("dragover");
        });
        element.addEventListener("dragleave", () => {
            element.classList.remove("dragover");
        });
        element.addEventListener("drop", (event) => {
             // ... (logic drop) ...
        });
    };

    if (deckAPlaylist) setupDropZone(deckAPlaylist, 'A');
    if (deckBPlaylist) setupDropZone(deckBPlaylist, 'B');
}
*/
// Gỡ bỏ lời gọi initializeDragAndDrop trong DOMContentLoaded của guest.js
// document.addEventListener('DOMContentLoaded', () => {
//     // ...
//     initializePlayers();
//     // initializeDragAndDrop(); // <-- GỠ BỎ DÒNG NÀY
//     loadMusicLibrary();
// });

function initializeDragAndDrop() {
    const deckAPlaylist = document.getElementById("deck-a-playlist-inner");
    const deckBPlaylist = document.getElementById("deck-b-playlist-inner");

    const setupDropZone = (element, deckId) => {
        element.addEventListener("dragover", (event) => {
            event.preventDefault();
            element.classList.add("dragover");
        });
        element.addEventListener("dragleave", () => {
            element.classList.remove("dragover");
        });
        element.addEventListener("drop", (event) => {
            event.preventDefault();
            element.classList.remove("dragover");
            try {
                const data = event.dataTransfer.getData("text/plain");
                if (!data) {
                    console.warn(`[Guest.js] No data found in dataTransfer for ${deckId}`);
                    return;
                }
                const songData = JSON.parse(data);
                if (!songData.songId || !songData.gridfsId) {
                    console.warn(`[Guest.js] Invalid song data dropped on ${deckId}:`, songData);
                    return;
                }
                const targetPlayerData = deckId === 'A' ? playerAData : playerBData;
                if (!targetPlayerData.state.playlist.some(s => s.id === songData.songId)) {
                    const songToAdd = {
                        id: songData.songId,
                        _id: songData.songId,
                        name: songData.songName || 'Unknown Track',
                        artist: songData.artistName || 'Unknown Artist',
                        cover: songData.cover || 'https://via.placeholder.com/100',
                        url: songData.streamUrl || `/api/songs/stream/${songData.gridfsId}`,
                        source: songData.source || 'library_drop',
                        gridfs_id: songData.gridfsId
                    };
                    targetPlayerData.state.playlist.push(songToAdd);
                    renderMainPlaylist();
                    const indexInDeck = targetPlayerData.state.playlist.length - 1;
                    if (!targetPlayerData.isPlaying && targetPlayerData.state.currentSongIndex === -1) {
                        loadSong(targetPlayerData, indexInDeck);
                    }
                    console.log(`[Guest.js] Added song to ${deckId} playlist:`, songToAdd);
                } else {
                    console.log(`[Guest.js] Song ${songData.songName} already in ${deckId} playlist`);
                }
            } catch (error) {
                console.error(`[Guest.js] Error parsing dropped song data for ${deckId}:`, error);
            }
        });
    };

    document.addEventListener('loadSong', async (event) => {
        try {
            const { deckId, index } = event.detail;
            const targetPlayerData = deckId === 'deck-a' ? playerAData : playerBData;
            if (!targetPlayerData) {
                console.error(`[Guest.js] No player data found for ${deckId}`);
                return;
            }
            await initializeAudioContext();
            if (audioCtx.state === 'suspended' || Tone.getContext().rawContext !== audioCtx) {
                console.warn(`[Guest.js] AudioContext not ready for ${deckId}. Awaiting readiness...`);
                await new Promise(resolve => {
                    const checkReady = async () => {
                        if (audioCtx.state === 'running' && Tone.getContext().rawContext === audioCtx) {
                            await Tone.start();
                            resolve();
                            window.removeEventListener('click', checkReady);
                            window.removeEventListener('touchstart', checkReady);
                        }
                    };
                    window.addEventListener('click', checkReady);
                    window.addEventListener('touchstart', checkReady);
                });
            }
            const indexInDeck = targetPlayerData.state.playlist.length;
            targetPlayerData.state.playlist.push({
                name: event.detail.songName,
                url: event.detail.songUrl
            });
            await loadSong(targetPlayerData, indexInDeck);
        } catch (error) {
            console.error(`[Guest.js] Error handling loadSong event for ${event.detail.deckId}:`, error);
        }
    });

    if (deckAPlaylist) setupDropZone(deckAPlaylist, 'A');
    if (deckBPlaylist) setupDropZone(deckBPlaylist, 'B');
}

function handleLibraryItemDragStart(event) {
    const item = event.target.closest('.library-item');
    if (!item) {
        console.warn('[dragdrop.js] No library-item found for dragstart');
        return;
    }

    const songData = {
        songId: item.dataset.songId || '',
        songName: item.dataset.songName || 'Unknown Track',
        artistName: item.dataset.artistName || 'Unknown Artist',
        cover: item.dataset.cover || 'https://via.placeholder.com/100',
        streamUrl: item.dataset.streamUrl || '',
        gridfsId: item.dataset.gridfsId || '',
        source: item.dataset.source || 'api'
    };

    if (!songData.songId || !songData.gridfsId) {
        console.warn('[dragdrop.js] Invalid song data for drag:', songData);
        event.preventDefault();
        return;
    }

    try {
        event.dataTransfer.setData('text/plain', JSON.stringify(songData));
        event.target.classList.add('dragging');
        console.log('[dragdrop.js] Set drag data:', songData);
    } catch (error) {
        console.error('[dragdrop.js] Error setting drag data:', error);
        event.preventDefault();
    }
}

document.addEventListener('libraryRendered', () => {
    const items = document.querySelectorAll('.carousel-item.library-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleLibraryItemDragStart);
    });
    console.log('[dragdrop.js] Attached dragstart handlers to library items');
});

function cleanup() {
    if (playerAData.player) {
        if (playerAData.player.state === "started") {
            playerAData.player.stop();
        }
        playerAData.player.dispose();
        playerAData.player = null;
    }
    if (playerBData.player) {
        if (playerBData.player.state === "started") {
            playerBData.player.stop();
        }
        playerBData.player.dispose();
        playerBData.player = null;
    }
    if (audioCtx) {
        audioCtx.close().then(() => {
            console.log("[Guest.js] AudioContext closed.");
        });
        audioCtx = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    musicLibrary.forEach(song => {
        if (song.url && song.url.startsWith('blob:')) {
            URL.revokeObjectURL(song.url);
        }
        if (song.cover && song.cover.startsWith('blob:')) {
            URL.revokeObjectURL(song.cover);
        }
    });
}

// Update DOMContentLoaded to include drag-and-drop
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Guest.js] DOM loaded. Starting initializations...");
    initializePlayers();
    initializeDragAndDrop();
    loadMusicLibrary();
   
});