
document.addEventListener('DOMContentLoaded', () => {
    const descriptionText = document.querySelector('.description-text');
    const text = descriptionText.textContent.trim();
    descriptionText.textContent = ''; // Clear original text

    // Split text into individual letters and wrap in spans
    text.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        descriptionText.appendChild(span);
    });

    const spans = descriptionText.querySelectorAll('span');
    const triggerPoint = descriptionText.offsetTop - window.innerHeight / 1.2; // Start when half in view
    const endPoint = triggerPoint + 500; // Animation range (adjust as needed)

    function updateOpacity() {
        const scrollY = window.scrollY;
        const progress = Math.min(Math.max((scrollY - triggerPoint) / (endPoint - triggerPoint), 0), 1);

        spans.forEach((span, index) => {
            // Calculate when each letter should fade in
            const letterProgress = progress - (index / spans.length);
            span.style.opacity = letterProgress > 0 ? 1 : 0;
        });
    }

    // Initial check
    updateOpacity();

    // Update on scroll
    window.addEventListener('scroll', updateOpacity);
});
