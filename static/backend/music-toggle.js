const musicButton = document.getElementById('music');
const music = document.getElementById('background-music');
let musicPlaying = false;
let isHovering = false;
let fadeOutInterval;

// Set initial lower volume
music.volume = 0.2;

// Set music to loop
music.loop = true;

// Mouse enter
musicButton.addEventListener('mouseenter', () => {
    isHovering = true;

    // Re-enable hover effect if it was disabled
    if (!musicPlaying) {
        musicButton.classList.remove('no-hover');
    }
});

// Mouse leave
musicButton.addEventListener('mouseleave', () => {
    isHovering = false;
});

// Click toggle
musicButton.addEventListener('click', () => {
    if (!musicPlaying) {
        clearInterval(fadeOutInterval); // Stop any ongoing fade out
        music.play();
        musicPlaying = true;

        // Restore volume to desired level in case it was faded
        music.volume = 0.2;

        musicButton.classList.add('active');
        musicButton.classList.remove('no-hover');
    } else {
        // Start fade-out
        fadeOutInterval = setInterval(() => {
            if (music.volume > 0.01) {
                music.volume -= 0.05; // Adjust speed of fade out here - Lower number = smoother, higher = faster.
            } else {
                clearInterval(fadeOutInterval);
                music.pause();
                music.volume = 0.2; // Reset volume for next play

                musicPlaying = false;

                musicButton.classList.remove('active');
                musicButton.classList.add('no-hover');
            }
        }, 50); // Adjust interval time for smoother/slower fade
    }
});
