// Get elements
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.querySelector('.close-sidebar');

// Toggle sidebar
function toggleSidebar() {
    const isActive = sidebar.classList.contains('active');
    sidebar.classList.toggle('active', !isActive);
    sidebarOverlay.classList.toggle('active', !isActive);
}

// Event listeners
menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
});

closeSidebar.addEventListener('click', toggleSidebar);

// Close sidebar when clicking outside
sidebarOverlay.addEventListener('click', toggleSidebar);

// Prevent sidebar clicks from closing the sidebar
sidebar.addEventListener('click', (e) => {
    e.stopPropagation();
});
