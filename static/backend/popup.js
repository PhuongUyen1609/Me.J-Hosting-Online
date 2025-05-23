// Locked option logic: Show popup
document.querySelectorAll('.locked-option').forEach(option => {
    option.addEventListener('click', () => {
        document.getElementById('subscriptionPopup').classList.add('show');
        document.getElementById('backgroundDropdown').classList.remove('show');
    });
});

// Close popup logic
document.getElementById('closePopupButton').addEventListener('click', () => {
    document.getElementById('subscriptionPopup').classList.remove('show');
});