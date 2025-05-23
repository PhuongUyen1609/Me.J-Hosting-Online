// Select the target section and the line
const endingSection = document.querySelector('.ending-section');
const verticalLine = document.querySelector('.vertical-line');
const horizontalLine = document.querySelector('.horizontal-line');


// Create observer
const observer2 = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            verticalLine.classList.add('active');
            horizontalLine.classList.add('active');
        } else {
            verticalLine.classList.remove('active'); // Optional: remove if you want it to play only once
            horizontalLine.classList.remove('active'); 
        }
    });
}, {
    threshold: 0.8 // Adjust sensitivity
});

// Observe the section
observer2.observe(endingSection);
