// ============================================
// ADMIN PANEL LOGIC
// ============================================

let isAdminAuthenticated = false;

// Admin login
// UPDATE the adminLogin function
function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminError');
    
    if (password === ADMIN_PASSWORD) {
        isAdminAuthenticated = true;
        document.getElementById('adminAuth').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Hide any error messages
        errorDiv.style.display = 'none';
        
        // Load data
        loadKeys();
        loadSessions();
        
        // Refresh data every 10 seconds
        setInterval(() => {
            loadKeys();
            loadSessions();
        }, 10000);
        
    } else {
        // Show error message
        errorDiv.textContent = 'Invalid password!';
        errorDiv.style.display = 'block';
        
        // Hide error after 3 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Load all keys
async function loadKeys() {
    if (!isAdminAuthenticated) return;
    
    try {
        const { data: keys, error } = await supabase
            .from('access_keys')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const tbody = document.getElementById('keysTableBody');
        
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No keys found</td></tr>';
            return;
        }
        
        tbody.innerHTML = keys.map(key => `
            <tr>
                <td><code>${key.key_code}</code></td>
                <td>
                    <span style="color: ${key.is_active ? '#10b981' : '#ef4444'}">
                        ${key.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                </td>
                <td>${new Date(key.created_at).toLocaleDateString()}</td>
                <td id="sessions-${key.id}">Loading...</td>
                <td>
                    <button 
                        class="delete-btn" 
                        onclick="toggleKey('${key.id}', ${!key.is_active})"
                    >
                        ${key.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                        class="delete-btn" 
                        onclick="deleteKey('${key.id}')"
                        style="margin-left: 5px;"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Load session counts
        for (const key of keys) {
            loadSessionCount(key.id);
        }
        
    } catch (error) {
        console.error('Error loading keys:', error);
    }
}

// Load session count for a key
async function loadSessionCount(keyId) {
    try {
        const { data, error } = await supabase
            .from('active_sessions')
            .select('id')
            .eq('key_id', keyId)
            .gte('last_heartbeat', new Date(Date.now() - 120000).toISOString());
        
        const element = document.getElementById(`sessions-${keyId}`);
        if (element) {
            element.textContent = data ? data.length : 0;
        }
        
    } catch (error) {
        console.error('Error loading session count:', error);
    }
}

// Load all active sessions
async function loadSessions() {
    if (!isAdminAuthenticated) return;
    
    try {
        const { data: sessions, error } = await supabase
            .from('active_sessions')
            .select(`
                *,
                access_keys (key_code)
            `)
            .gte('last_heartbeat', new Date(Date.now() - 120000).toISOString())
            .order('last_heartbeat', { ascending: false });
        
        if (error) throw error;
        
        const tbody = document.getElementById('sessionsTableBody');
        
        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No active sessions</td></tr>';
            return;
        }
        
        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td><code>${session.access_keys?.key_code || 'Unknown'}</code></td>
                <td>${session.device_fingerprint?.substring(0, 8)}...</td>
                <td>${session.ip_address}</td>
                <td>${new Date(session.last_heartbeat).toLocaleTimeString()}</td>
                <td>
                    <button 
                        class="delete-btn" 
                        onclick="killSession('${session.id}')"
                    >
                        Kill Session
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

// Create new key
async function createKey() {
    const keyInput = document.getElementById('newKeyInput').value.trim();
    
    if (!keyInput) {
        alert('Please enter a key code');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('access_keys')
            .insert({ key_code: keyInput })
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                alert('This key already exists!');
            } else {
                throw error;
            }
            return;
        }
        
        document.getElementById('newKeyInput').value = '';
        document.getElementById('createKeyMessage').innerHTML = 
            `<span style="color: #10b981;">✓ Key created successfully!</span>`;
        
        setTimeout(() => {
            document.getElementById('createKeyMessage').innerHTML = '';
        }, 3000);
        
        loadKeys();
        
    } catch (error) {
        console.error('Error creating key:', error);
        alert('Error creating key: ' + error.message);
    }
}

// Toggle key active status
async function toggleKey(keyId, activate) {
    try {
        const { error } = await supabase
            .from('access_keys')
            .update({ is_active: activate })
            .eq('id', keyId);
        
        if (error) throw error;
        
        loadKeys();
        
    } catch (error) {
        console.error('Error toggling key:', error);
        alert('Error: ' + error.message);
    }
}

// Delete key
async function deleteKey(keyId) {
    if (!confirm('Are you sure you want to delete this key? This will also end all active sessions.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('access_keys')
            .delete()
            .eq('id', keyId);
        
        if (error) throw error;
        
        loadKeys();
        
    } catch (error) {
        console.error('Error deleting key:', error);
        alert('Error: ' + error.message);
    }
}

// Kill a session
async function killSession(sessionId) {
    if (!confirm('Are you sure you want to end this session?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('active_sessions')
            .delete()
            .eq('id', sessionId);
        
        if (error) throw error;
        
        loadSessions();
        
    } catch (error) {
        console.error('Error killing session:', error);
        alert('Error: ' + error.message);
    }
}

// Admin logout
function adminLogout() {
    isAdminAuthenticated = false;
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}