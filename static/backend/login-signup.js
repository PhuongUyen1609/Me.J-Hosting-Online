document.addEventListener('DOMContentLoaded', () => {
    // Signup trigger logic
    document.querySelectorAll('.signup-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.signup-panel').classList.add('show');
        document.querySelector('.login-panel').classList.remove('show');
      });
    });

    // Login trigger logic
    document.querySelectorAll('.login-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-panel').classList.add('show');
        document.querySelector('.signup-panel').classList.remove('show');
      });
    });

    // Close popup logic
    document.getElementById('closeSignup').addEventListener('click', () => {
      document.querySelector('.signup-panel').classList.remove('show');
    });
    document.getElementById('closeLogin').addEventListener('click', () => {
      document.querySelector('.login-panel').classList.remove('show');
    });
  });
