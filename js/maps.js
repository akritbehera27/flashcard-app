// ============================================
// MAPS VIEWER LOGIC
// ============================================

// Global variables
let allMaps = [];
let currentMapFile = null;
let folderStructureMaps = {};

// Load list of available maps from GitHub
async function loadMaps() {
    console.log('Loading maps from GitHub...');
    
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
                        <span class="icon chevron-icon expanded"></span>
                        <span class="folder-count">(${files.length})</span>
                    </div>
                    <ul class="folder-contents" id="map-folder-general"></ul>
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
        
    } catch (error) {
        console.error('Error loading maps:', error);
        mapsList.innerHTML = `
            <li class="error">
                Error loading maps!<br>
                <small>${error.message}</small>
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
        
        folderSection.innerHTML = `
            <div class="folder-header" onclick="toggleMapFolder('${folderIdSafe}')">
                <span class="icon folder-icon"></span>
                <span class="folder-name">${folder.name}</span>
                <span class="icon chevron-icon expanded"></span>
                <span class="folder-count" id="map-count-${folderIdSafe}">...</span>
            </div>
            <ul class="folder-contents" id="map-folder-${folderIdSafe}">
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
    `;
    
    li.onclick = () => loadMapFile(file);
    
    parentElement.appendChild(li);
}

// Toggle folder open/closed
function toggleMapFolder(folderIdSafe) {
    const folderContents = document.getElementById(`map-folder-${folderIdSafe}`);
    const folderHeader = folderContents?.previousElementSibling;
    const chevron = folderHeader?.querySelector('.chevron-icon');
    
    if (folderContents) {
        if (folderContents.style.display === 'none') {
            folderContents.style.display = 'block';
            if (chevron) chevron.innerHTML = icons.chevronDown || '▼';
        } else {
            folderContents.style.display = 'none';
            if (chevron) chevron.innerHTML = icons.chevronRight || '▶';
        }
    }
}

// Load and display HTML map file
async function loadMapFile(file) {
    console.log('Loading map file:', file.name);
    
    try {
        const mapDisplay = document.getElementById('mapDisplay');
        const currentMapTitle = document.getElementById('currentMap');
        const mapInfo = document.getElementById('mapInfo');
        
        // Update UI
        currentMapTitle.textContent = `Loading ${file.name}...`;
        mapDisplay.innerHTML = '<div class="loading">Loading map...</div>';
        
        // Fetch the HTML content
        const response = await fetch(file.download_url);
        const htmlContent = await response.text();
        
        // Update title
        const mapName = file.name.replace('.html', '').replace('.htm', '');
        currentMapTitle.textContent = mapName;
        mapInfo.textContent = `${file.folderPath || 'General'} / ${mapName}`;
        
        // Display HTML content in iframe for isolation
        const iframe = document.createElement('iframe');
        iframe.className = 'map-iframe';
        iframe.srcdoc = htmlContent;
        iframe.sandbox = 'allow-scripts allow-same-origin';
        
        mapDisplay.innerHTML = '';
        mapDisplay.appendChild(iframe);
        
        // Highlight selected map
        document.querySelectorAll('.map-chapter-item').forEach(item => {
            const nameElement = item.querySelector('.chapter-name');
            if (nameElement && nameElement.textContent === mapName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Store current map
        currentMapFile = file;
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        
    } catch (error) {
        console.error('Error loading map:', error);
        document.getElementById('mapDisplay').innerHTML = `
            <div class="error">
                <h3>Error loading map</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Maps viewer initializing...');
    
    // Check authentication
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    // Load maps
    loadMaps();
    
    // Display user key
    const userKey = localStorage.getItem('access_key');
    if (userKey) {
        const userKeyElement = document.getElementById('userKey');
        if (userKeyElement) {
            userKeyElement.textContent = userKey;
        }
    }
});