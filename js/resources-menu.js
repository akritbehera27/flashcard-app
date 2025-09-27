// ============================================
// RESOURCES MENU FUNCTIONS
// ============================================

// Open resources menu with blur effect
function openResourcesMenu() {
    const overlay = document.getElementById('resourcesOverlay');
    const appContainer = document.querySelector('.app-container');
    
    if (overlay) {
        // Show overlay with fade-in effect
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        
        // Trigger animation
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
        
        // Add blur to main content
        if (appContainer) {
            appContainer.style.filter = 'blur(5px)';
            appContainer.style.transition = 'filter 0.3s ease';
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Close sidebar on mobile if open
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }
}

// Close resources menu
function closeResourcesMenu() {
    const overlay = document.getElementById('resourcesOverlay');
    const appContainer = document.querySelector('.app-container');
    
    if (overlay) {
        // Fade out animation
        overlay.style.opacity = '0';
        
        // Remove blur from main content
        if (appContainer) {
            appContainer.style.filter = 'none';
        }
        
        // Re-enable body scroll
        document.body.style.overflow = '';
        
        // Hide overlay after animation
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Close menu when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('resourcesOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeResourcesMenu();
            }
        });
    }
});

// Close with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeResourcesMenu();
    }
});