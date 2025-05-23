// combinedAnimation.js
document.addEventListener("DOMContentLoaded", () => {
    // Register GSAP and ScrollTrigger for the blocks animation
    gsap.registerPlugin(ScrollTrigger);

    // BLOCKS Animation Logic
    const blockRows = document.querySelectorAll(".blocks-row");
    blockRows.forEach((row) => {
        for (let i = 0; i < 16; i++) {
            const block = document.createElement("div");
            block.className = "block";
            row.appendChild(block);
        }
    });

    const blockContainers = document.querySelectorAll(".blocks-container");
    blockContainers.forEach((container) => {
        const rows = container.querySelectorAll(".blocks-row");
        const numRows = rows.length;

        rows.forEach((row, rowIndex) => {
            let blocks = Array.from(row.querySelectorAll(".block"));
            let isTop = container.classList.contains("top");

            let randomizedOrder = gsap.utils.shuffle(blocks.map((block, idx) => idx));

            ScrollTrigger.create({
                trigger: container,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
                onUpdate: (self) => {
                    let progress = self.progress;
                    let rowDelay = 0.3 * (numRows - rowIndex - 1);
                    let adjustedProgress = Math.max(0, Math.min(1, progress - rowDelay));

                    updateBlocksOpacity(blocks, randomizedOrder, isTop, adjustedProgress);
                },
            });
        });
    });

    function updateBlocksOpacity(blocks, order, isTop, progress) {
        blocks.forEach((block, idx) => {
            let offset = order.indexOf(idx) / blocks.length;
            let adjustedProgress = (progress - offset) * blocks.length;
            let opacity = isTop
                ? 1 - Math.min(1, Math.max(0, adjustedProgress))
                : Math.min(1, Math.max(0, adjustedProgress));

            block.style.opacity = opacity;
        });
    }

    // Guide Header Letter-by-Letter Fade-In Animation
    const guideHeader = document.querySelector(".guide-header");

    if (!guideHeader) {
        console.error("Guide header not found!");
    } else {
        // Function to wrap text nodes in spans for letter-by-letter animation
        function wrapLettersInSpans(element) {
            const letters = [];

            // Traverse all child nodes of the element
            Array.from(element.childNodes).forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    // For text nodes, split into characters and wrap in spans
                    const text = node.textContent;
                    const spanContainer = document.createElement("span");
                    text.split("").forEach((char) => {
                        const span = document.createElement("span");
                        span.className = "letter";
                        span.textContent = char;
                        spanContainer.appendChild(span);
                        letters.push(span); // Track the letter spans
                    });
                    node.replaceWith(spanContainer);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // For elements (like <br> or <span>), preserve them and process their text
                    if (node.tagName !== "BR") {
                        wrapLettersInSpans(node); // Recursively process child elements
                        node.querySelectorAll(".letter").forEach((span) => letters.push(span));
                    }
                }
            });

            return letters;
        }

        // Wrap letters in spans and get the list of letter spans
        const letterSpans = wrapLettersInSpans(guideHeader);

        if (letterSpans.length === 0) {
            console.error("No letters found to animate!");
        }

        // Function to calculate the element's position relative to the viewport
        function getElementPosition() {
            const rect = guideHeader.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset;
            const viewportHeight = window.innerHeight;

            // Calculate the top position of the element relative to the document
            const elementTop = rect.top + scrollY;

            // Trigger when the element is half in view
            const triggerPoint = elementTop - (viewportHeight / 1.2);
            const endPoint = triggerPoint + 500; // Animation range

            return { triggerPoint, endPoint };
        }

        // Initial position calculation
        let { triggerPoint, endPoint } = getElementPosition();
        console.log("Initial triggerPoint:", triggerPoint, "endPoint:", endPoint);

        function updateLetterOpacity() {
            const scrollY = window.scrollY || window.pageYOffset;
            const progress = Math.min(Math.max((scrollY - triggerPoint) / (endPoint - triggerPoint), 0), 1);

            // Debug logs
            console.log("scrollY:", scrollY, "progress:", progress);

            letterSpans.forEach((span, index) => {
                const letterProgress = progress - (index / letterSpans.length);
                span.style.opacity = letterProgress > 0 ? 1 : 0;
                // Debug log for the first few letters
                if (index < 5) {
                    console.log(`Letter ${index}: letterProgress=${letterProgress}, opacity=${span.style.opacity}`);
                }
            });
        }

        // Initial check
        updateLetterOpacity();
    }

    // Guide Animation Logic
    const guideWrapper = document.querySelector(".guide-wrapper");
    const nextSection = document.querySelector("#next-section");
    const guideBar = document.querySelector(".guide-bar");
    const guideItems = document.querySelectorAll(".guide-item");
    const guideCircles = document.querySelectorAll(".guide-bar-circle");
    const guideTexts = document.querySelectorAll(".guide-text");
    const guideImages = document.querySelectorAll(".visual-guide img"); // Select all images in .visual-guide
    const sequenceWrapper = document.querySelector(".sequence-wrapper");

    document.querySelector(".guide-list").style.counterReset = "step";

    const circlePositions = [];
    guideItems.forEach((item, index) => {
        const circle = guideCircles[index];
        const itemRect = item.getBoundingClientRect();
        const barRect = guideBar.getBoundingClientRect();
        const topPosition = itemRect.top - barRect.top + (itemRect.height / 2) - (circle.offsetHeight / 2);
        circle.style.top = `${topPosition}px`;
        const barHeight = guideBar.offsetHeight;
        const circleTopPercentage = (topPosition / barHeight) * 100;
        circlePositions.push(circleTopPercentage);
    });

    let lastScrollY = window.scrollY;
    let scrollDirection = "down";

    const updateActiveGuide = (activeIndex) => {
        console.log(`Updating active guide to index: ${activeIndex}`);

        guideItems.forEach((item, index) => {
            item.classList.remove("active");
            if (activeIndex >= 0) {
                if (scrollDirection === "down" && index <= activeIndex) {
                    item.classList.add("shown");
                    console.log(`Guide item ${index + 1} marked as shown (scroll down)`);
                } else if (scrollDirection === "up" && index <= activeIndex) {
                    item.classList.add("shown");
                    console.log(`Guide item ${index + 1} remains shown (scroll up)`);
                } else if (scrollDirection === "up" && index > activeIndex) {
                    item.classList.remove("shown");
                    console.log(`Guide item ${index + 1} hidden (scroll up)`);
                }
            }
            if (index === activeIndex) {
                item.classList.add("active");
                console.log(`Guide item ${index + 1} marked as active`);
            }
        });

        guideTexts.forEach(text => {
            text.classList.remove("active");
            text.classList.remove("exiting");
        });

        if (activeIndex >= 0) {
            guideTexts[activeIndex].classList.add("active");
        }

        // Update visual guide images
        guideImages.forEach(img => {
            img.classList.remove("active");
            img.classList.remove("exiting");
        });
        if (activeIndex >= 0) {
            guideImages[activeIndex].classList.add("active");
        }
    };

    updateActiveGuide(-1);

    let nextSectionStart = null;
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && nextSectionStart === null) {
            nextSectionStart = window.scrollY;
            console.log("Next section started at scrollY:", nextSectionStart);
            guideBar.style.opacity = '1';
    
        } else if (!entry.isIntersecting && entry.boundingClientRect.top > 0 && nextSectionStart !== null) {
            nextSectionStart = null;
            console.log("Next section above viewport, resetting");
            updateActiveGuide(-1);
            guideItems.forEach(item => {
                item.classList.remove("shown");
                console.log("Reset shown state for guide items");
            });
            guideBar.style.setProperty('--fill-height', '0%');
            guideCircles.forEach(circle => {
                circle.style.setProperty('--circle-fill-height', '0%');
            });
            guideBar.style.opacity = '0';
        }
    }, { threshold: 0.3 });

    observer.observe(nextSection);

    const handleGuideScroll = () => {
        const scrollY = window.scrollY;
        scrollDirection = scrollY > lastScrollY ? "down" : "up";
        lastScrollY = scrollY;
        console.log(`Scroll direction: ${scrollDirection}`);

        // Update the letter opacity for the guide header
        if (guideHeader) {
            // Recalculate trigger points on scroll to account for sticky positioning
            ({ triggerPoint, endPoint } = getElementPosition());
            updateLetterOpacity();
        }

        if (nextSectionStart === null) {
            updateActiveGuide(-1);
            return;
        }

        const viewportHeight = window.innerHeight;
        const sectionHeight = nextSection.offsetHeight;

        const scrollProgress = (scrollY - nextSectionStart) / (sectionHeight - viewportHeight);
        const totalSections = guideItems.length;
        const progressPerSection = scrollProgress * totalSections;
        let activeIndex = Math.floor(progressPerSection);

        activeIndex = Math.max(0, Math.min(totalSections - 1, activeIndex));

        // if (activeIndex >= 0) {
        //     guideBar.style.opacity = '1';
        // } else {
        //     guideBar.style.opacity = '0';
        // }

        let fillPercentage = 0;
        const fraction = progressPerSection - activeIndex;

        if (activeIndex < 0) {
            fillPercentage = 0;
        } else if (activeIndex >= totalSections - 1) {
            const lastCircleTop = circlePositions[totalSections - 1];
            const remainingProgress = (progressPerSection - (totalSections - 1)) / 1;
            fillPercentage = lastCircleTop + (100 - lastCircleTop) * remainingProgress;
        } else {
            const currentCircleTop = circlePositions[activeIndex];
            const nextCircleTop = circlePositions[activeIndex + 1] || 100;
            fillPercentage = currentCircleTop + (nextCircleTop - currentCircleTop) * fraction;
        }

        fillPercentage = Math.min(Math.max(fillPercentage, 0), 100);
        guideBar.style.setProperty('--fill-height', `${fillPercentage}%`);
        console.log(`Guide bar fill height: ${fillPercentage}%`);

        guideCircles.forEach((circle, index) => {
            const circleTop = parseFloat(circle.style.top);
            const barHeight = guideBar.offsetHeight;
            const circleHeight = circle.offsetHeight;
            const circleTopPercentage = (circleTop / barHeight) * 100;
            const circleBottomPercentage = ((circleTop + circleHeight) / barHeight) * 100;

            let circleFillPercentage = 0;
            if (fillPercentage >= circleBottomPercentage) {
                circleFillPercentage = 100;
            } else if (fillPercentage > circleTopPercentage) {
                const fillRange = circleBottomPercentage - circleTopPercentage;
                const fillProgress = fillPercentage - circleTopPercentage;
                circleFillPercentage = (fillProgress / fillRange) * 100;
            } else {
                circleFillPercentage = 0;
            }

            circle.style.setProperty('--circle-fill-height', `${circleFillPercentage}%`);
            console.log(`Circle ${index + 1} fill height: ${circleFillPercentage}%`);
        });

        console.log(`ScrollY: ${scrollY}, Scroll progress: ${scrollProgress}, Active index: ${activeIndex}`);
        updateActiveGuide(activeIndex);

        if (typeof window.updateSequence === "function") {
            window.updateSequence(scrollY);
        }
    };

    window.addEventListener("scroll", handleGuideScroll);

    // Add resize event listener for the letter-by-letter animation
    if (guideHeader) {
        window.addEventListener("resize", () => {
            ({ triggerPoint, endPoint } = getElementPosition());
            updateLetterOpacity();
        });
    }

    guideTexts.forEach((text, index) => {
        text.addEventListener("transitionend", () => {
            console.log(`Guide text ${index + 1} transition ended`);
        });
    });
});