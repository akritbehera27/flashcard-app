// ============================================
// THEME MANAGEMENT
// ============================================
// This file handles dark mode toggle and persistence

// Check for saved theme preference or default to 'light'
const currentTheme = localStorage.getItem('theme') || 'light';

// Apply the theme on page load - UPDATED
document.documentElement.setAttribute('data-theme', currentTheme);

// Update theme toggle on page load - UPDATED
window.addEventListener('DOMContentLoaded', () => {
    updateThemeIcon(currentTheme);
    
    // Set the toggle switch state if it exists
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = currentTheme === 'dark';
    }
});

// Update theme icon on page load
window.addEventListener('DOMContentLoaded', () => {
    updateThemeIcon(currentTheme);
});

// Toggle between light and dark themes
function toggleTheme() {
    // Get current theme
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    // Switch to opposite theme
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Apply new theme
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    updateThemeIcon(newTheme);
    
    // Update toggle switch if it exists
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = newTheme === 'dark';
    }
    
    // Update floating button icon if it exists (for login/admin pages)
    const floatingIcon = document.getElementById('themeIcon');
    if (floatingIcon) {
        floatingIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}
// Update the theme toggle button icon
function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ============================================
// MOBILE SIDEBAR MANAGEMENT
// ============================================

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const menuIcon = mobileMenuBtn?.querySelector('.icon');
    
    // Check if we're on mobile or desktop
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile behavior - toggle sidebar
        const isOpening = !sidebar.classList.contains('active');
        
        if (isOpening) {
            // Opening sidebar
            sidebar.classList.add('active');
            overlay.classList.add('active');
            // Add class to body to prevent scrolling
            document.body.classList.add('sidebar-open');
            
            // Change icon to close
            if (menuIcon) {
                menuIcon.innerHTML = icons.close || icons.collapse;
            }
        } else {
            // Closing sidebar
            closeSidebar();
        }
    } else {
        // Desktop behavior remains the same
        sidebar.classList.remove('collapsed');
        sidebarCollapsed = false;
        localStorage.setItem('sidebarCollapsed', false);
        
        const collapseIcon = document.querySelector('.collapse-icon');
        if (collapseIcon) {
            collapseIcon.innerHTML = icons.collapse;
        }
        
        if (mobileMenuBtn) {
            mobileMenuBtn.style.display = 'none';
        }
    }
}

// Close sidebar
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const menuIcon = mobileMenuBtn?.querySelector('.icon');
    
    // Remove active states
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    // Remove body scroll lock
    document.body.classList.remove('sidebar-open');
    
    // Change icon back to menu
    if (menuIcon) {
        menuIcon.innerHTML = icons.menu;
    }
    
    // Keep button visible on mobile
    if (window.innerWidth <= 768 && mobileMenuBtn) {
        mobileMenuBtn.style.display = 'flex';
    }
}

// IMPROVED WINDOW RESIZE HANDLER
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (window.innerWidth > 768) {
        // Switching to desktop view
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Handle menu button visibility on desktop
        if (sidebar.classList.contains('collapsed')) {
            mobileMenuBtn.style.display = 'flex';
            mobileMenuBtn.style.opacity = '1';
            mobileMenuBtn.style.transform = 'scale(1)';
        } else {
            mobileMenuBtn.style.display = 'none';
        }
    } else {
        // Switching to mobile view
        sidebar.classList.remove('collapsed');
        
        // Show menu button if sidebar is not active
        if (!sidebar.classList.contains('active')) {
            mobileMenuBtn.style.display = 'flex';
            mobileMenuBtn.style.opacity = '1';
            mobileMenuBtn.style.transform = 'scale(1)';
        } else {
            mobileMenuBtn.style.display = 'none';
        }
    }
});

// Close sidebar when clicking on a chapter (mobile)
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to all chapter items
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.addEventListener('click', () => {
            // Only close on mobile
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Close sidebar on window resize if becoming desktop size
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
});

// ============================================
// ENHANCED UI FEATURES
// ============================================

// Add ripple effect to buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple element
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            // Calculate position
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            // Set ripple styles
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            // Add ripple to button
            this.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


// ADD THESE NEW FUNCTIONS for sidebar management

// Variable to track sidebar state
let sidebarCollapsed = false;

// Toggle sidebar on desktop (collapse/expand)
// UPDATE the toggleSidebarDesktop function:
function toggleSidebarDesktop() {
    const sidebar = document.getElementById('sidebar');
    const collapseIcon = document.querySelector('.collapse-icon');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    if (sidebar.classList.contains('collapsed')) {
        // Expand sidebar
        sidebar.classList.remove('collapsed');
        sidebarCollapsed = false;
        
        // Update icon to show collapse arrow
        if (collapseIcon) {
            collapseIcon.innerHTML = icons.collapse;
        }
        
        // Hide mobile menu button on desktop
        if (window.innerWidth > 768 && mobileMenuBtn) {
            mobileMenuBtn.style.display = 'none';
        }
    } else {
        // Collapse sidebar
        sidebar.classList.add('collapsed');
        sidebarCollapsed = true;
        
        // Update icon to show expand arrow
        if (collapseIcon) {
            collapseIcon.innerHTML = icons.expand;
        }
        
        // Show mobile menu button on desktop
        if (window.innerWidth > 768 && mobileMenuBtn) {
            mobileMenuBtn.style.display = 'flex';
        }
    }
    
    // Save preference
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
}

// Toggle sidebar on mobile (slide in/out)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const menuIcon = mobileMenuBtn?.querySelector('.icon');
    
    // Check if we're on mobile or desktop
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Mobile behavior - toggle sidebar
        const isOpening = !sidebar.classList.contains('active');
        
        if (isOpening) {
            // Opening sidebar
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Change icon to close/collapse
            if (menuIcon) {
                menuIcon.innerHTML = icons.close || icons.collapse;
            }
            
            // Keep button visible but move it
            if (mobileMenuBtn) {
                mobileMenuBtn.style.display = 'flex';
            }
        } else {
            // Closing sidebar
            closeSidebar();
        }
    } else {
        // Desktop behavior - expand collapsed sidebar
        sidebar.classList.remove('collapsed');
        sidebarCollapsed = false;
        localStorage.setItem('sidebarCollapsed', false);
        
        // Update icon
        const collapseIcon = document.querySelector('.collapse-icon');
        if (collapseIcon) {
            collapseIcon.innerHTML = icons.collapse;
        }
        
        // Hide menu button on desktop
        if (mobileMenuBtn) {
            mobileMenuBtn.style.display = 'none';
        }
    }
}

// Close sidebar (mobile)
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const menuIcon = mobileMenuBtn?.querySelector('.icon');
    
    // Remove active states
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Change icon back to menu
    if (menuIcon) {
        menuIcon.innerHTML = icons.menu;
    }
    
    // Keep button visible on mobile
    if (window.innerWidth <= 768 && mobileMenuBtn) {
        mobileMenuBtn.style.display = 'flex';
    }
}

// For mobile: Allow closing sidebar with the header toggle button
function toggleSidebarMobile() {
    // This function is called from the sidebar header button on mobile
    closeSidebar();
}

// Initialize sidebar state on page load
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    // Set initial state for mobile
    if (window.innerWidth <= 768 && mobileMenuBtn) {
        mobileMenuBtn.style.display = 'flex';
        
        // Set correct initial icon
        const menuIcon = mobileMenuBtn.querySelector('.icon');
        if (menuIcon) {
            if (sidebar?.classList.contains('active')) {
                menuIcon.innerHTML = icons.close || icons.collapse;
            } else {
                menuIcon.innerHTML = icons.menu;
            }
        }
    }

    // Restore sidebar collapsed state (desktop only)
    if (window.innerWidth > 768) {
        const savedState = localStorage.getItem('sidebarCollapsed') === 'true';
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const collapseIcon = document.querySelector('.collapse-icon');
        
        if (savedState) {
            sidebar.classList.add('collapsed');
            sidebarCollapsed = true;
            mobileMenuBtn.style.display = 'flex';
            if (collapseIcon) {
                collapseIcon.innerHTML = icons.expand;
            }
        } else {
            mobileMenuBtn.style.display = 'none';
            if (collapseIcon) {
                collapseIcon.innerHTML = icons.collapse;
            }
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const overlay = document.querySelector('.sidebar-overlay');
        const menuIcon = mobileMenuBtn?.querySelector('.icon');
        
        if (window.innerWidth > 768) {
            // Switching to desktop view
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset icon
            if (menuIcon) {
                menuIcon.innerHTML = icons.menu;
            }
            
            // Handle menu button visibility on desktop
            if (sidebar.classList.contains('collapsed')) {
                mobileMenuBtn.style.display = 'flex';
            } else {
                mobileMenuBtn.style.display = 'none';
            }
        } else {
            // Switching to mobile view
            sidebar.classList.remove('collapsed');
            
            // Always show menu button on mobile
            if (mobileMenuBtn) {
                mobileMenuBtn.style.display = 'flex';
                
                // Update icon based on sidebar state
                if (sidebar.classList.contains('active')) {
                    menuIcon.innerHTML = icons.close || icons.collapse;
                } else {
                    menuIcon.innerHTML = icons.menu;
                }
            }
        }
    });
});

// UPDATE the existing updateThemeIcon function
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
    }
    
    // Update floating theme button if exists
    const floatingIcon = document.getElementById('themeIcon');
    if (floatingIcon) {
        floatingIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}