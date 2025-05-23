// // visual-interactive.js
// console.log("visual-interactive.js loaded");

// // State to track active visuals
// const activeVisuals = new Set();
// let p5VisualInstance = null;

// // Initialize Interactive Visual Dropdown
// function initializeVisualSelector() {
//     const visualButton = document.getElementById('visualButton');
//     const visualDropdown = document.getElementById('visualDropdown');
//     const visualOptions = document.querySelectorAll('.visual-option');

//     if (!visualButton || !visualDropdown) {
//         console.error("Visual selector elements not found!");
//         return;
//     }

//     // Toggle dropdown visibility
//     visualButton.addEventListener('click', (event) => {
//         event.stopPropagation(); // Prevent click from bubbling to document
//         visualDropdown.classList.toggle('show');
//         console.log("Visual dropdown toggled:", visualDropdown.classList.contains('show') ? "open" : "closed");
//     });

//     // Handle visual option clicks
//     visualOptions.forEach(option => {
//         option.addEventListener('click', (event) => {
//             event.stopPropagation(); // Prevent click from bubbling
//             const visualType = option.getAttribute('data-visual');

//             if (option.classList.contains('disable-visual')) {
//                 // Disable all visuals
//                 activeVisuals.clear();
//                 visualOptions.forEach(opt => {
//                     if (!opt.classList.contains('disable-visual')) {
//                         opt.classList.remove('active');
//                     }
//                 });
//                 if (p5VisualInstance) {
//                     p5VisualInstance.remove();
//                     p5VisualInstance = null;
//                 }
//                 console.log("All visuals disabled");
//             } else if (visualType) {
//                 // Handle locked visuals
//                 if (option.classList.contains('locked-option')) {
//                     console.log("Selected visual is locked:", visualType);
//                     return;
//                 }

//                 // Toggle the visual
//                 if (activeVisuals.has(visualType)) {
//                     activeVisuals.delete(visualType);
//                     option.classList.remove('active');
//                 } else {
//                     activeVisuals.add(visualType);
//                     option.classList.add('active');
//                 }

//                 // Handle specific visuals
//                 if (visualType === 'trail') {
//                     if (activeVisuals.has('trail') && !p5VisualInstance) {
//                         p5VisualInstance = setupP5Visuals();
//                         console.log("Trail visual enabled");
//                     } else if (!activeVisuals.has('trail') && p5VisualInstance) {
//                         p5VisualInstance.remove();
//                         p5VisualInstance = null;
//                         console.log("Trail visual disabled");
//                     }
//                 }
//             }

//             // Close dropdown after selection
//             visualDropdown.classList.remove('show');
//         });
//     });

//     // Close dropdown when clicking outside
//     document.addEventListener('click', (event) => {
//         if (!visualButton.contains(event.target) && !visualDropdown.contains(event.target)) {
//             visualDropdown.classList.remove('show');
//             console.log("Closed visual dropdown (clicked outside)");
//         }
//     });
// }

// // Setup p5.js Visuals (Trail Visual)
// function setupP5Visuals() {
//     const sketch = (p) => {
//         let canvas;
//         const indexTrail = [];
//         const middleTrail = [];
//         const maxTrailLength = 20;
//         let isPeaceSignActive = false;
//         let indexFingerPos = { x: 0, y: 0 };
//         let middleFingerPos = { x: 0, y: 0 };

//         p.setup = () => {
//             canvas = p.createCanvas(p.windowWidth, p.windowHeight);
//             canvas.style('position', 'absolute');
//             canvas.style('top', '0');
//             canvas.style('left', '0');
//             canvas.style('z-index', '10');
//             canvas.style('pointer-events', 'none');
//             p.background(0, 0);
//             console.log("p5.js visual setup complete");
//         };

//         p.draw = () => {
//             p.clear();

//             if (isPeaceSignActive) {
//                 indexTrail.push({ x: indexFingerPos.x * p.width, y: indexFingerPos.y * p.height });
//                 middleTrail.push({ x: middleFingerPos.x * p.width, y: middleFingerPos.y * p.height });

//                 if (indexTrail.length > maxTrailLength) indexTrail.shift();
//                 if (middleTrail.length > maxTrailLength) middleTrail.shift();

//                 // p.blendMode(p.ADD);
//                 drawWavyTrail(p, indexTrail, [255,51,95]);
//                 drawWavyTrail(p, middleTrail, [63,90,213]);
//                 p.blendMode(p.BLEND);

//                 // p.noStroke();
//                 // p.fill(255,51,95, 180); // Red
//                 // p.ellipse(indexFingerPos.x * p.width, indexFingerPos.y * p.height, 12, 12);
//                 // p.fill(63,90,213, 180); // Blue
//                 // p.ellipse(middleFingerPos.x * p.width, middleFingerPos.y * p.height, 12, 12);
//             } else {
//                 indexTrail.length = 0;
//                 middleTrail.length = 0;
//             }
//         };

//         function drawWavyTrail(p, trail, baseColor) {
//             const trailLen = trail.length;
//             for (let i = 0; i < trailLen - 1; i++) {
//                 const current = trail[i];
//                 const next = trail[i + 1];
//                 const t = i / (trailLen - 1);
//                 const waveOffset = Math.sin(i * 0.4 + p.frameCount * 0.15) * 8 * (1 - t);
//                 const weight = p.lerp(2, 10, t);
//                 const alpha = p.lerp(30, 400, t);
//                 const cx = current.x + waveOffset;
//                 const cy = current.y;
//                 const nx = next.x + waveOffset;
//                 const ny = next.y;
//                 p.stroke(baseColor[0], baseColor[1], baseColor[2], alpha);
//                 p.strokeWeight(weight);
//                 p.noFill();
//                 p.line(cx, cy, nx, ny);
//             }
//         }

//         p.windowResized = () => {
//             p.resizeCanvas(p.windowWidth, p.windowHeight);
//         };

//         window.updateP5Visuals = (gesture, landmarks) => {
//             isPeaceSignActive = gesture === 'Peace Sign';
//             if (isPeaceSignActive && landmarks) {
//                 indexFingerPos = { x: landmarks[8].x, y: landmarks[8].y };
//                 middleFingerPos = { x: landmarks[12].x, y: landmarks[12].y };
//             }
//         };
//     };

//     return new p5(sketch);
// }

// // Initialize when DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     initializeVisualSelector();
// });

// visual-interactive.js
console.log("visual-interactive.js loaded");

// State to track active visuals
const activeVisuals = new Set();
let p5VisualInstance = null;
let selectedVisual = null; // Track the selected visual for thumbnail display

// Initialize Interactive Visual Dropdown
function initializeVisualSelector() {
    const visualButton = document.getElementById('visualButton');
    const visualDropdown = document.getElementById('visualDropdown');
    const visualOptions = document.querySelectorAll('.visual-option');

    if (!visualButton || !visualDropdown) {
        console.error("Visual selector elements not found!");
        return;
    }

    // Toggle dropdown visibility
    visualButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click from bubbling to document
        visualDropdown.classList.toggle('show');
        console.log("Visual dropdown toggled:", visualDropdown.classList.contains('show') ? "open" : "closed");
    });

    // Handle visual option clicks
    visualOptions.forEach(option => {
        option.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling
            const visualType = option.getAttribute('data-visual');

            if (option.classList.contains('disable-visual')) {
                // Disable all visuals
                activeVisuals.clear();
                selectedVisual = null; // Reset selected visual
                visualOptions.forEach(opt => {
                    if (!opt.classList.contains('disable-visual')) {
                        opt.classList.remove('active');
                    }
                });
                visualButton.classList.remove('has-visual', 'visual-trail'); // Reset button style
                if (p5VisualInstance) {
                    p5VisualInstance.remove();
                    p5VisualInstance = null;
                }
                console.log("All visuals disabled");
            } else if (visualType) {
                // Handle locked visuals
                if (option.classList.contains('locked-option')) {
                    console.log("Selected visual is locked:", visualType);
                    return;
                }

                // Toggle the visual
                if (activeVisuals.has(visualType)) {
                    activeVisuals.delete(visualType);
                    option.classList.remove('active');
                    if (selectedVisual === visualType) {
                        selectedVisual = null;
                        visualButton.classList.remove('has-visual', `visual-${visualType}`);
                    }
                } else {
                    activeVisuals.add(visualType);
                    option.classList.add('active');
                    selectedVisual = visualType;
                    visualButton.classList.remove('has-visual', 'visual-trail'); // Remove existing classes
                    visualButton.classList.add('has-visual', `visual-${visualType}`); // Add new class
                }

                // Handle specific visuals
                if (visualType === 'trail') {
                    if (activeVisuals.has('trail') && !p5VisualInstance) {
                        p5VisualInstance = setupP5Visuals();
                        console.log("Trail visual enabled");
                    } else if (!activeVisuals.has('trail') && p5VisualInstance) {
                        p5VisualInstance.remove();
                        p5VisualInstance = null;
                        console.log("Trail visual disabled");
                    }
                }
            }

            // Close dropdown after selection
            visualDropdown.classList.remove('show');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!visualButton.contains(event.target) && !visualDropdown.contains(event.target)) {
            visualDropdown.classList.remove('show');
            console.log("Closed visual dropdown (clicked outside)");
        }
    });
}

// Setup p5.js Visuals (Trail Visual)
function setupP5Visuals() {
    const sketch = (p) => {
        let canvas;
        const indexTrail = [];
        const middleTrail = [];
        const maxTrailLength = 20;
        let isPeaceSignActive = false;
        let indexFingerPos = { x: 0, y: 0 };
        let middleFingerPos = { x: 0, y: 0 };

        p.setup = () => {
            canvas = p.createCanvas(p.windowWidth, p.windowHeight);
            canvas.style('position', 'absolute');
            canvas.style('top', '0');
            canvas.style('left', '0');
            canvas.style('z-index', '10');
            canvas.style('pointer-events', 'none');
            p.background(0, 0);
            console.log("p5.js visual setup complete");
        };

        p.draw = () => {
            p.clear();

            if (isPeaceSignActive) {
                indexTrail.push({ x: indexFingerPos.x * p.width, y: indexFingerPos.y * p.height });
                middleTrail.push({ x: middleFingerPos.x * p.width, y: middleFingerPos.y * p.height });

                if (indexTrail.length > maxTrailLength) indexTrail.shift();
                if (middleTrail.length > maxTrailLength) middleTrail.shift();

                // p.blendMode(p.ADD);
                drawWavyTrail(p, indexTrail, [255, 51, 95]);
                drawWavyTrail(p, middleTrail, [63, 90, 213]);
                p.blendMode(p.BLEND);

                // p.noStroke();
                // p.fill(255, 51, 95, 180); // Red
                // p.ellipse(indexFingerPos.x * p.width, indexFingerPos.y * p.height, 12, 12);
                // p.fill(63, 90, 213, 180); // Blue
                // p.ellipse(middleFingerPos.x * p.width, middleFingerPos.y * p.height, 12, 12);
            } else {
                indexTrail.length = 0;
                middleTrail.length = 0;
            }
        };

        function drawWavyTrail(p, trail, baseColor) {
            const trailLen = trail.length;
            for (let i = 0; i < trailLen - 1; i++) {
                const current = trail[i];
                const next = trail[i + 1];
                const t = i / (trailLen - 1);
                const waveOffset = Math.sin(i * 0.4 + p.frameCount * 0.15) * 8 * (1 - t);
                const weight = p.lerp(2, 10, t);
                const alpha = p.lerp(30, 400, t);
                const cx = current.x + waveOffset;
                const cy = current.y;
                const nx = next.x + waveOffset;
                const ny = next.y;
                p.stroke(baseColor[0], baseColor[1], baseColor[2], alpha);
                p.strokeWeight(weight);
                p.noFill();
                p.line(cx, cy, nx, ny);
            }
        }

        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        window.updateP5Visuals = (gesture, landmarks) => {
            isPeaceSignActive = gesture === 'Peace Sign';
            if (isPeaceSignActive && landmarks) {
                indexFingerPos = { x: landmarks[8].x, y: landmarks[8].y };
                middleFingerPos = { x: landmarks[12].x, y: landmarks[12].y };
            }
        };
    };

    return new p5(sketch);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeVisualSelector();
});
