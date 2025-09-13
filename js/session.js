// ============================================
// SESSION MANAGEMENT
// ============================================
// This file handles session tracking and device management

let heartbeatInterval;      // Timer for sending heartbeats
let realtimeSubscription;   // Supabase realtime subscription
let warningTimeout;          // Timeout for logout warning

// Check if user is authenticated
async function checkAuth() {
    console.log('Checking authentication...');
    
    // Get stored session info
    const sessionId = localStorage.getItem('session_id');
    const deviceFingerprint = localStorage.getItem('device_fingerprint');
    
    // If no session, redirect to login
    if (!sessionId || !deviceFingerprint) {
        console.log('No session found, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Verify session still exists in database
        const { data, error } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        
        if (error || !data) {
            console.log('Session invalid, redirecting to login...');
            localStorage.clear();
            window.location.href = 'index.html';
            return;
        }
        
        console.log('Session verified:', data);
        
        // Start heartbeat to keep session alive
        startHeartbeat();
        
        // Subscribe to realtime updates
        subscribeToRealtimeUpdates();
        
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

// Send heartbeat to keep session alive
function startHeartbeat() {
    console.log('Starting heartbeat...');
    
    // Send first heartbeat immediately
    sendHeartbeat();
    
    // Then send every 30 seconds
    heartbeatInterval = setInterval(sendHeartbeat, 30000);
}

// Send single heartbeat
async function sendHeartbeat() {
    const sessionId = localStorage.getItem('session_id');
    
    if (!sessionId) {
        console.log('No session ID, stopping heartbeat');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        return;
    }
    
    try {
        // Update last_heartbeat timestamp
        const { error } = await supabase
            .from('active_sessions')
            .update({ 
                last_heartbeat: new Date().toISOString() 
            })
            .eq('id', sessionId);
        
        if (error) {
            console.error('Heartbeat error:', error);
            // Session might be deleted, check and redirect if needed
            checkAuth();
        } else {
            console.log('Heartbeat sent at', new Date().toLocaleTimeString());
        }
        
    } catch (error) {
        console.error('Heartbeat failed:', error);
    }
}

// SIMPLIFIED: Remove warning system, just monitor for session deletion
function subscribeToRealtimeUpdates() {
    console.log('Setting up realtime subscription...');
    
    const sessionId = localStorage.getItem('session_id');
    
    if (!sessionId) return;
    
    // Only subscribe to deletion of current session
    realtimeSubscription = supabase
        .channel('session-monitor')
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'active_sessions',
                filter: `id=eq.${sessionId}`
            },
            (payload) => {
                console.log('Session deleted:', payload);
                forceLogout('Your session has been terminated by an administrator.');
            }
        )
        .subscribe((status) => {
            console.log('Realtime subscription status:', status);
        });
}

// REMOVED: showLogoutWarning function (delete this entire function)
// REMOVED: cancelLogout function (delete this entire function)
// REMOVED: deleteOtherSessions function (delete this entire function)

// Keep the forceLogout function as is, but remove warning-related code
// UPDATED Force logout function - with smooth overlay
function forceLogout(message) {
    console.log('Forcing logout:', message);
    
    // Stop heartbeat
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    // Unsubscribe from realtime
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
    
    // Clear local storage
    localStorage.clear();
    
    // Show logout overlay instead of alert
    showLogoutOverlay(message);
    
    // Redirect after a short delay
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500); // 1.5 seconds delay for smooth transition
}

// UPDATED Manual logout function
async function logout() {
    console.log('User logging out...');
    
    // Show logout overlay immediately
    showLogoutOverlay();
    
    const sessionId = localStorage.getItem('session_id');
    
    // Delete session from database
    if (sessionId) {
        try {
            await supabase
                .from('active_sessions')
                .delete()
                .eq('id', sessionId);
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    }
    
    // Clear local storage
    localStorage.clear();
    
    // Redirect after animation
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// ADD THIS NEW FUNCTION - Show logout overlay
function showLogoutOverlay(customMessage) {
    const overlay = document.getElementById('logoutOverlay');
    if (overlay) {
        // Update message if custom message provided
        if (customMessage && customMessage !== 'You have been logged out successfully.') {
            const messageElement = overlay.querySelector('h2');
            if (messageElement) {
                messageElement.textContent = customMessage;
            }
        }
        
        // Show overlay with fade-in effect
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        
        // Trigger animation
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
        
        // Add blur to main content
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.filter = 'blur(5px)';
            appContainer.style.transition = 'filter 0.3s ease';
        }
    }
}

// Clean up when page is closed
window.addEventListener('beforeunload', () => {
    // Try to delete session (might not always work)
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
        // Use sendBeacon for reliability
        const data = JSON.stringify({ session_id: sessionId });
        navigator.sendBeacon('/cleanup', data);
    }
});