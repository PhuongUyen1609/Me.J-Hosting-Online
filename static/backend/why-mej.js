// seqScene.js
const frameCount = 120;
const sequenceContainer = document.getElementById("sequence-three-container");
const sequenceWrapper = document.querySelector(".sequence-wrapper");
const text1 = document.getElementById("text1");
const text2 = document.getElementById("text2");
const text3 = document.getElementById("text3");

const images = [];
let imagesLoaded = 0;

// Preload images
for (let i = 0; i <= frameCount; i++) {
    const img = new Image();
    img.src = `/static/index_picture/display-sequence/${String(i).padStart(4, "0")}.jpg`;
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === frameCount) {
            console.log("All images preloaded!");
        }
    };
    images.push(img);
}

// Set first image initially
sequenceContainer.style.backgroundImage = `url('${images[0].src}')`;
sequenceContainer.dataset.currentIndex = "0";

// Prepare texts with spans
function prepareText(element) {
    const mainText = element.childNodes[0].textContent.trim();
    const subText = element.querySelector("div").textContent.trim();
    element.innerHTML = "";

    const mainDiv = document.createElement("div");
    mainText.split("").forEach(char => {
        const span = document.createElement("span");
        span.textContent = char;
        mainDiv.appendChild(span);
    });
    element.appendChild(mainDiv);

    const subDiv = document.createElement("div");
    subText.split("").forEach(char => {
        const span = document.createElement("span");
        span.textContent = char;
        subDiv.appendChild(span);
    });
    element.appendChild(subDiv);

    return {
        mainSpans: mainDiv.querySelectorAll("span"),
        subSpans: subDiv.querySelectorAll("span")
    };
}

const text1Spans = prepareText(text1);
const text2Spans = prepareText(text2);
const text3Spans = prepareText(text3);

// Track sequence start and set wrapper height
let sequenceStart = null;
const sequenceDurationVh = 2; //speed
const sequenceHeight = window.innerHeight * sequenceDurationVh;
// sequenceWrapper.style.height = `${sequenceHeight + window.innerHeight}px`; //adjust sequence-wrapper height responsively
// sequenceWrapper.style.height = `${sequenceHeight}px`;

// IntersectionObserver to set sequenceStart once
const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting && sequenceStart === null) {
        sequenceStart = window.scrollY;
        console.log("Sequence started at scrollY:", sequenceStart);
    }
}, { threshold: 0.5 });

observer.observe(sequenceContainer);

// Scroll handler
function updateSequence() {
    if (sequenceStart === null) return;

    const scrollProgress = (window.scrollY - sequenceStart) / sequenceHeight;
    const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1);
    const index = Math.round(clampedProgress * (frameCount - 1));

    // Update PNG
    if (sequenceContainer.dataset.currentIndex !== String(index)) {
        sequenceContainer.style.backgroundImage = `url('${images[index].src}')`;
        sequenceContainer.dataset.currentIndex = String(index);
        console.log("Frame:", index);
    }

    // Update text animations and lines
    updateTextAnimation(text1, text1Spans, index, 0);  // Text 1 at frame 0
    updateTextAnimation(text2, text2Spans, index, 40); // Text 2 at frame 40
    updateTextAnimation(text3, text3Spans, index, 80); // Text 3 at frame 80
}

function updateTextAnimation(element, spans, frameIndex, triggerFrame) {
    const mainProgress = Math.min(Math.max((frameIndex - triggerFrame) / 10, 0), 1); // Main text over 10 frames
    const subProgress = Math.min(Math.max((frameIndex - (triggerFrame + 10)) / 20, 0), 1); // Subtext over 20 frames, starts after main

    spans.mainSpans.forEach((span, i) => {
        const letterProgress = mainProgress - (i / spans.mainSpans.length);
        span.style.opacity = letterProgress > 0 ? 1 : 0;
    });

    spans.subSpans.forEach((span, i) => {
        const letterProgress = subProgress - (i / spans.subSpans.length);
        span.style.opacity = letterProgress > 0 ? 1 : 0;
    });

    // Show line and circle when main text starts fading in
    element.style.setProperty('--line-opacity', mainProgress);
}

window.addEventListener("scroll", updateSequence);

// Handle resize
window.addEventListener("resize", () => {
    const newSequenceHeight = window.innerHeight * sequenceDurationVh;
    sequenceWrapper.style.height = `${newSequenceHeight + window.innerHeight}px`;
});

// Apply line opacity to pseudo-elements
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .sequence-text::after, .sequence-text::before {
            opacity: var(--line-opacity, 0);
        }
    </style>
`);