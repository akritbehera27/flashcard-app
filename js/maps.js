// ============================================
// PUBLIC MAPS VIEWER (NO AUTH REQUIRED)
// ============================================

// Global variables
let allMaps = [];
let currentMapFile = null;
let folderStructureMaps = {};

// Load list of available maps from GitHub
async function loadMaps() {
    console.log('Loading public maps from GitHub...');
    
    const mapsList = document.getElementById('mapsList');
    mapsList.innerHTML = '<li class="loading">Loading maps...</li>';
    
    try {
        // Build the GitHub API URL for maps folder
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/maps`;
        
        console.log('Fetching maps from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            if (response.status === 404) {
                mapsList.innerHTML = '<li class="error">Maps folder not found. Please create a /maps folder in your repository.</li>';
                return;
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const items = await response.json();
        
        mapsList.innerHTML = '';
        folderStructureMaps = {};
        allMaps = [];
        
        // Separate folders and files
        const folders = items.filter(item => item.type === 'dir');
        const files = items.filter(item => item.type === 'file' && 
            (item.name.endsWith('.html') || item.name.endsWith('.htm')));
        
        // Process folders first
        for (const folder of folders) {
            await loadMapFolder(folder, mapsList);
        }
        
        // Add root-level HTML files
        if (files.length > 0) {
            if (folders.length > 0) {
                // Create General section if there are also folders
                const generalSection = document.createElement('li');
                generalSection.className = 'folder-section';
                generalSection.innerHTML = `
                    <div class="folder-header" onclick="toggleMapFolder('general')">
                        <span class="icon folder-icon"></span>
                        <span class="folder-name">General Maps</span>
                        <span class="icon chevron-icon collapsed"></span>
                        <span class="folder-count">(${files.length})</span>
                    </div>
                    <ul class="folder-contents" id="map-folder-general" style="display: none;"></ul>
                `;
                mapsList.appendChild(generalSection);
                
                const generalContents = document.getElementById('map-folder-general');
                let fileCounter = 0;
                files.forEach(file => {
                    fileCounter++;
                    file.displayNumber = fileCounter;
                    addMapToList(file, generalContents);
                });
            } else {
                // Just add files directly
                let fileCounter = 0;
                files.forEach(file => {
                    fileCounter++;
                    file.displayNumber = fileCounter;
                    addMapToList(file, mapsList);
                });
            }
            
            allMaps.push(...files);
        }
        
        if (folders.length === 0 && files.length === 0) {
            mapsList.innerHTML = '<li class="error">No HTML map files found</li>';
        }
        
        console.log(`Loaded ${folders.length} folders and ${allMaps.length} map files`);
        
        // Initialize chevron icons
        initializeChevronIcons();
        
    } catch (error) {
        console.error('Error loading maps:', error);
        mapsList.innerHTML = `
            <li class="error">
                Error loading maps!<br>
                <small>${error.message}</small><br>
                <small>Check console for details</small>
            </li>
        `;
    }
}

// Load contents of a map folder
async function loadMapFolder(folder, parentElement, parentPath = '') {
    try {
        console.log(`Loading map folder: ${folder.name}`);
        
        const folderSection = document.createElement('li');
        folderSection.className = 'folder-section';
        
        const folderId = parentPath ? `${parentPath}-${folder.name}` : folder.name;
        const folderIdSafe = folderId.replace(/[^a-zA-Z0-9-]/g, '_');
        
        // Create folder with COLLAPSED state by default
        folderSection.innerHTML = `
            <div class="folder-header" onclick="toggleMapFolder('${folderIdSafe}')">
                <span class="icon folder-icon"></span>
                <span class="folder-name">${folder.name}</span>
                <span class="icon chevron-icon collapsed" id="chevron-${folderIdSafe}"></span>
                <span class="folder-count" id="map-count-${folderIdSafe}">...</span>
            </div>
            <ul class="folder-contents" id="map-folder-${folderIdSafe}" style="display: none;">
                <li class="loading">Loading...</li>
            </ul>
        `;
        
        parentElement.appendChild(folderSection);
        
        const response = await fetch(folder.url);
        if (!response.ok) {
            throw new Error(`Failed to load folder ${folder.name}`);
        }
        
        const contents = await response.json();
        const files = contents.filter(item => item.type === 'file' && 
            (item.name.endsWith('.html') || item.name.endsWith('.htm')));
        const subfolders = contents.filter(item => item.type === 'dir');
        
        folderStructureMaps[folder.name] = files;
        
        const folderContentsElement = document.getElementById(`map-folder-${folderIdSafe}`);
        folderContentsElement.innerHTML = '';
        
        // Add subfolders
        for (const subfolder of subfolders) {
            await loadMapFolder(subfolder, folderContentsElement, folderId);
        }
        
        // Add HTML files
        let folderFileCounter = 0;
        files.forEach(file => {
            folderFileCounter++;
            file.folderPath = folder.name;
            file.displayNumber = folderFileCounter;
            addMapToList(file, folderContentsElement);
        });
        
        const countElement = document.getElementById(`map-count-${folderIdSafe}`);
        if (countElement) {
            countElement.textContent = `(${files.length})`;
        }
        
        allMaps.push(...files);
        
    } catch (error) {
        console.error(`Error loading map folder ${folder.name}:`, error);
    }
}

// Add map file to the list
function addMapToList(file, parentElement) {
    const li = document.createElement('li');
    li.className = 'map-chapter-item';
    
    const mapName = file.name.replace('.html', '').replace('.htm', '');
    const tooltipText = file.folderPath ? `${file.folderPath} / ${mapName}` : mapName;
    
    li.innerHTML = `
        <span class="chapter-number">${file.displayNumber}</span>
        <span class="chapter-name" title="${tooltipText}">${mapName}</span>
        <span class="chapter-size">${(file.size / 1024).toFixed(1)}KB</span>
        <span class="external-indicator">↗</span>
    `;
    
    // Add click handler
    li.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        openMapFile(file);
    };
    
    parentElement.appendChild(li);
}

// Toggle folder open/closed
function toggleMapFolder(folderIdSafe) {
    console.log('Toggling folder:', folderIdSafe);
    
    const folderContents = document.getElementById(`map-folder-${folderIdSafe}`);
    const chevron = document.getElementById(`chevron-${folderIdSafe}`);
    
    if (folderContents) {
        if (folderContents.style.display === 'none' || folderContents.style.display === '') {
            // Open folder
            folderContents.style.display = 'block';
            if (chevron) {
                chevron.classList.remove('collapsed');
                chevron.classList.add('expanded');
                if (typeof icons !== 'undefined' && icons.chevronDown) {
                    chevron.innerHTML = icons.chevronDown;
                } else {
                    chevron.innerHTML = '▼';
                }
            }
        } else {
            // Close folder
            folderContents.style.display = 'none';
            if (chevron) {
                chevron.classList.remove('expanded');
                chevron.classList.add('collapsed');
                if (typeof icons !== 'undefined' && icons.chevronRight) {
                    chevron.innerHTML = icons.chevronRight;
                } else {
                    chevron.innerHTML = '▶';
                }
            }
        }
    }
}

// Open HTML map file in new tab
function openMapFile(file) {
    console.log('Opening map file:', file.name);
    console.log('Download URL:', file.download_url);
    
    try {
        // Open the file directly in a new tab
        const newWindow = window.open(file.download_url, '_blank');
        
        if (newWindow) {
            newWindow.focus();
        } else {
            // If popup was blocked, show message
            alert('Please allow popups for this site to open maps in new tabs.');
        }
        
        // Update UI to show which map was opened
        const currentMapTitle = document.getElementById('currentMap');
        const mapInfo = document.getElementById('mapInfo');
        const mapName = file.name.replace('.html', '').replace('.htm', '');
        
        if (currentMapTitle) {
            currentMapTitle.textContent = `Opened: ${mapName}`;
        }
        
        if (mapInfo) {
            mapInfo.textContent = `${file.folderPath || 'General'} / ${mapName}`;
        }
        
        // Update the display area
        const mapDisplay = document.getElementById('mapDisplay');
        if (mapDisplay) {
            mapDisplay.innerHTML = `
                <div class="no-map-selected" style="text-align: center; padding: 2rem;">
                    <div style="font-size: 60px; margin-bottom: 1rem;">↗️</div>
                    <h3>Map opened in new tab</h3>
                    <p><strong>${mapName}</strong></p>
                    <p style="color: var(--text-tertiary); margin-top: 1rem;">
                        The map has been opened in a new browser tab.<br>
                        Select another map from the sidebar to continue.
                    </p>
                    <button class="nav-btn" onclick="window.open('${file.download_url}', '_blank')" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Open Again ↗
                    </button>
                </div>
            `;
        }
        
        // Highlight selected map
        document.querySelectorAll('.map-chapter-item').forEach(item => {
            const nameElement = item.querySelector('.chapter-name');
            if (nameElement && nameElement.textContent === mapName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
            closeSidebar();
        }
        
    } catch (error) {
        console.error('Error opening map:', error);
        alert('Error opening map: ' + error.message);
    }
}

// Initialize chevron icons
function initializeChevronIcons() {
    document.querySelectorAll('.chevron-icon').forEach(chevron => {
        if (chevron.classList.contains('collapsed')) {
            if (typeof icons !== 'undefined' && icons.chevronRight) {
                chevron.innerHTML = icons.chevronRight;
            } else {
                chevron.innerHTML = '▶';
            }
        } else if (chevron.classList.contains('expanded')) {
            if (typeof icons !== 'undefined' && icons.chevronDown) {
                chevron.innerHTML = icons.chevronDown;
            } else {
                chevron.innerHTML = '▼';
            }
        }
    });
}

// Initialize on page load (NO AUTH CHECK)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Public maps viewer initializing...');
    
    // Check if config exists
    if (typeof GITHUB_CONFIG === 'undefined') {
        console.error('GITHUB_CONFIG not found. Please check config.js');
        document.getElementById('mapsList').innerHTML = 
            '<li class="error">Configuration error. Please check console.</li>';
        return;
    }
    
    // Load maps immediately - no authentication needed
    loadMaps();
});

// Make functions globally available
window.toggleMapFolder = toggleMapFolder;
window.openMapFile = openMapFile;