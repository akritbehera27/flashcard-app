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

// Subscribe to realtime updates for session conflicts
function subscribeToRealtimeUpdates() {
    console.log('Setting up realtime subscription...');
    
    const keyId = localStorage.getItem('key_id');
    const sessionId = localStorage.getItem('session_id');
    const deviceFingerprint = localStorage.getItem('device_fingerprint');
    
    if (!keyId || !sessionId) return;
    
    // Subscribe to changes in active_sessions table
    realtimeSubscription = supabase
        .channel('session-monitor')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'active_sessions',
                filter: `key_id=eq.${keyId}`
            },
            (payload) => {
                console.log('New session detected:', payload);
                
                // Check if it's a different device
                if (payload.new.device_fingerprint !== deviceFingerprint) {
                    console.log('Different device logged in!');
                    showLogoutWarning();
                }
            }
        )
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
                forceLogout('Your session has been terminated.');
            }
        )
        .subscribe((status) => {
            console.log('Realtime subscription status:', status);
        });
}

// Show logout warning modal
function showLogoutWarning() {
    console.log('Showing logout warning...');
    
    // Show warning modal
    const modal = document.getElementById('sessionWarning');
    modal.style.display = 'flex';
    
    // Start countdown
    let countdown = 15;
    const countdownElement = document.getElementById('warningCountdown');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            forceLogout('Logged out due to session conflict.');
        }
    }, 1000);
    
    // Store interval so we can cancel it
    warningTimeout = countdownInterval;
}

// Cancel logout (user wants to stay)
function cancelLogout() {
    console.log('User canceling logout...');
    
    // Hide modal
    document.getElementById('sessionWarning').style.display = 'none';
    
    // Stop countdown
    if (warningTimeout) {
        clearInterval(warningTimeout);
    }
    
    // Force delete other sessions with same key
    deleteOtherSessions();
}

// Delete other sessions using the same key
async function deleteOtherSessions() {
    const keyId = localStorage.getItem('key_id');
    const sessionId = localStorage.getItem('session_id');
    
    try {
        // Delete all sessions with this key except current one
        const { error } = await supabase
            .from('active_sessions')
            .delete()
            .eq('key_id', keyId)
            .neq('id', sessionId);
        
        if (error) {
            console.error('Error deleting other sessions:', error);
        } else {
            console.log('Other sessions deleted');
        }
        
    } catch (error) {
        console.error('Failed to delete other sessions:', error);
    }
}

// Force logout
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
    
    // Show message and redirect
    if (message) {
        alert(message);
    }
    
    window.location.href = 'index.html';
}

// Manual logout function
async function logout() {
    console.log('User logging out...');
    
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
    
    // Force logout
    forceLogout('You have been logged out successfully.');
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