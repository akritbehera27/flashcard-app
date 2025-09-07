// ============================================
// AUTHENTICATION LOGIC
// ============================================
// This file handles user login and authentication

// Function to handle Enter key press in input field
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        login();
    }
}

// Generate a unique fingerprint for this device/browser
// This helps us identify if the same device is being used
function getDeviceFingerprint() {
    // Combine various browser/device properties to create a unique identifier
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    const colorDepth = window.screen.colorDepth;
    
    // Create a simple hash from these properties
    const fingerprintString = `${screenResolution}-${timezone}-${language}-${platform}-${colorDepth}`;
    
    // Convert string to a simple hash (not cryptographically secure, but good enough for our needs)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
        const char = fingerprintString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString();
}

// Get user's IP address (using a free API service)
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Could not get IP address:', error);
        return 'unknown';
    }
}

// Show error message to user - IMPROVED VERSION
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    
    if (message) {
        // Show error with message
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }, 5000);
    } else {
        // Hide error if no message
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

// Also add this function to clear errors
function clearError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

// Show/hide loading spinner
function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const button = document.getElementById('loginBtn');
    
    if (show) {
        spinner.style.display = 'block';
        button.disabled = true;
        button.style.opacity = '0.5';
    } else {
        spinner.style.display = 'none';
        button.disabled = false;
        button.style.opacity = '1';
    }
}

// Main login function - UPDATED VERSION
async function login() {
    // Get the access key from input field
    const keyInput = document.getElementById('accessKey').value.trim();
    
    // Validate input
    if (!keyInput) {
        showError('Please enter an access key');
        return;
    }
    
    // Show loading spinner
    toggleLoading(true);
    
    try {
        // Step 1: Check if the key exists and is active in database
        console.log('Checking access key...');
        const { data: keyData, error: keyError } = await supabase
            .from('access_keys')
            .select('*')
            .eq('key_code', keyInput)
            .eq('is_active', true)
            .single();
        
        if (keyError || !keyData) {
            throw new Error('Invalid or inactive access key');
        }
        
        console.log('Key validated:', keyData);
        
        // Step 2: Get device fingerprint and IP
        const deviceFingerprint = getDeviceFingerprint();
        const ipAddress = await getIPAddress();
        
        // Step 3: Check for existing active sessions with this key
        const { data: existingSessions } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('key_id', keyData.id)
            .gte('last_heartbeat', new Date(Date.now() - 120000).toISOString());
        
        // Step 4: NEW LOGIC - Just check if key is in use by another device
        if (existingSessions && existingSessions.length > 0) {
            const otherDevice = existingSessions.find(s => s.device_fingerprint !== deviceFingerprint);
            
            if (otherDevice) {
                // CHANGED: Don't auto-logout, just show error
                toggleLoading(false);
                showError('This key is currently in use on another device. Please use a different key or wait for the other session to end.');
                return; // Stop here, don't proceed with login
            }
        }
        
        // Step 5: Clean up any old sessions for this device
        await supabase
            .from('active_sessions')
            .delete()
            .eq('device_fingerprint', deviceFingerprint);
        
        // Step 6: Create new session
        const { data: newSession, error: sessionError } = await supabase
            .from('active_sessions')
            .insert({
                key_id: keyData.id,
                device_fingerprint: deviceFingerprint,
                ip_address: ipAddress,
                user_agent: navigator.userAgent,
                last_heartbeat: new Date().toISOString()
            })
            .select()
            .single();
        
        if (sessionError) {
            throw new Error('Failed to create session: ' + sessionError.message);
        }
        
        console.log('Session created:', newSession);
        
        // Step 7: Store session information
        localStorage.setItem('session_id', newSession.id);
        localStorage.setItem('key_id', keyData.id);
        localStorage.setItem('device_fingerprint', deviceFingerprint);
        localStorage.setItem('access_key', keyInput);
        
        // Step 8: Redirect to main app
        console.log('Login successful! Redirecting...');
        window.location.href = 'app.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Login failed. Please try again.');
        toggleLoading(false);
    }
}

// Check if user is already logged in when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
        // User might already be logged in, verify session
        console.log('Existing session found, verifying...');
        
        supabase
            .from('active_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()
            .then(({ data, error }) => {
                if (data && !error) {
                    // Session is valid, redirect to app
                    window.location.href = 'app.html';
                } else {
                    // Session is invalid, clear storage
                    localStorage.clear();
                }
            });
    }
});