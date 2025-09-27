// ============================================
// PUBLIC SSM VIEWER (DIRECT PDF DOWNLOADS)
// ============================================

// Global variables
let allPDFs = [];
let currentPDFFile = null;
let folderStructureSSM = {};

// Load list of available PDFs from GitHub
async function loadPDFs() {
    console.log('Loading ...');
    
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '<li class="loading">Loading ...</li>';
    
    try {
        // Build the GitHub API URL for ssm folder
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/ssm`;
        
        console.log('Fetching PDFs from:', apiUrl);
        
        // ADD authentication headers if token exists
        const headers = {};
        if (GITHUB_CONFIG.token) {
            headers['Authorization'] = `token ${GITHUB_CONFIG.token}`;
        }
        
        const response = await fetch(apiUrl, { headers });
        
        // Check rate limit
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const limit = response.headers.get('X-RateLimit-Limit');
        console.log(`GitHub API Rate Limit: ${remaining}/${limit}`);
        
        if (!response.ok) {
            if (response.status === 403) {
                const resetTime = response.headers.get('X-RateLimit-Reset');
                const resetDate = new Date(resetTime * 1000);
                pdfList.innerHTML = `
                    <li class="error">
                        GitHub API rate limit exceeded!<br>
                        <small>Resets at: ${resetDate.toLocaleTimeString()}</small><br>
                        <small>Add a GitHub token to js/config.js to increase limit</small>
                    </li>`;
                return;
            }
            if (response.status === 404) {
                pdfList.innerHTML = '<li class="error">SSM folder not found. Please create a /ssm folder in your repository.</li>';
                return;
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        if (!response.ok) {
            if (response.status === 404) {
                pdfList.innerHTML = '<li class="error">SSM folder not found. Please create a /ssm folder in your repository.</li>';
                return;
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const items = await response.json();

        pdfList.innerHTML = '';
        folderStructureSSM = {};
        allPDFs = [];
        
        // Separate folders and files
        const folders = items.filter(item => item.type === 'dir');
        const files = items.filter(item => item.type === 'file' && 
            (item.name.endsWith('.pdf') || item.name.endsWith('.PDF')));
        
        // Process folders first
        for (const folder of folders) {
            await loadSSMFolder(folder, pdfList);
        }
        
        // Add root-level PDF files
        if (files.length > 0) {
            if (folders.length > 0) {
                // Create General section if there are also folders
                const generalSection = document.createElement('li');
                generalSection.className = 'folder-section';
                generalSection.innerHTML = `
                    <div class="folder-header" onclick="toggleSSMFolder('general')">
                        <span class="icon folder-icon"></span>
                        <span class="folder-name">General Materials</span>
                        <span class="icon chevron-icon collapsed" id="chevron-general"></span>
                        <span class="folder-count">(${files.length})</span>
                    </div>
                    <ul class="folder-contents" id="ssm-folder-general" style="display: none;"></ul>
                `;
                pdfList.appendChild(generalSection);
                
                const generalContents = document.getElementById('ssm-folder-general');
                let fileCounter = 0;
                files.forEach(file => {
                    fileCounter++;
                    file.displayNumber = fileCounter;
                    addPDFToList(file, generalContents);
                });
            } else {
                // Just add files directly
                let fileCounter = 0;
                files.forEach(file => {
                    fileCounter++;
                    file.displayNumber = fileCounter;
                    addPDFToList(file, pdfList);
                });
            }
            
            allPDFs.push(...files);
        }
        
        if (folders.length === 0 && files.length === 0) {
            pdfList.innerHTML = '<li class="error">No PDF files found</li>';
        }
        
        console.log(`Loaded ${folders.length} folders and ${allPDFs.length} PDF files`);
        
        // Initialize chevron icons
        initializeChevronIcons();
        
    } catch (error) {
        console.error('Error loading SSMs:', error);
        pdfList.innerHTML = `
            <li class="error">
                Error loading SSMs!<br>
                <small>${error.message}</small><br>
                <small>Check console for details</small>
            </li>
        `;
    }
}

// Load contents of a folder
async function loadSSMFolder(folder, parentElement, parentPath = '') {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
        console.log(`Loading folder: ${folder.name}`);
        
        const folderSection = document.createElement('li');
        folderSection.className = 'folder-section';
        
        const folderId = parentPath ? `${parentPath}-${folder.name}` : folder.name;
        const folderIdSafe = folderId.replace(/[^a-zA-Z0-9-]/g, '_');
        
        // ADD authentication headers
        const headers = {};
        if (GITHUB_CONFIG.token) {
            headers['Authorization'] = `token ${GITHUB_CONFIG.token}`;
        }
        
        const response = await fetch(folder.url, { headers });
        
        if (!response.ok) {
            throw new Error(`Failed to load folder ${folder.name}`);
        }
       
        // Create folder with COLLAPSED state by default
        folderSection.innerHTML = `
            <div class="folder-header" onclick="toggleSSMFolder('${folderIdSafe}')">
                <span class="icon folder-icon"></span>
                <span class="folder-name">${folder.name}</span>
                <span class="icon chevron-icon collapsed" id="chevron-${folderIdSafe}"></span>
                <span class="folder-count" id="ssm-count-${folderIdSafe}">...</span>
            </div>
            <ul class="folder-contents" id="ssm-folder-${folderIdSafe}" style="display: none;">
                <li class="loading">Loading...</li>
            </ul>
        `;
        
        parentElement.appendChild(folderSection);
        
        const contents = await response.json();
        const files = contents.filter(item => item.type === 'file' && 
            (item.name.endsWith('.pdf') || item.name.endsWith('.PDF')));
        const subfolders = contents.filter(item => item.type === 'dir');
        
        folderStructureSSM[folder.name] = files;
        
        const folderContentsElement = document.getElementById(`ssm-folder-${folderIdSafe}`);
        folderContentsElement.innerHTML = '';
        
        // Add subfolders with proper path tracking
        for (const subfolder of subfolders) {
            const subfolderPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
            await loadSSMFolder(subfolder, folderContentsElement, subfolderPath);
        }
        
        // Add PDF files
        let folderFileCounter = 0;
        files.forEach(file => {
            folderFileCounter++;
            file.folderPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
            file.displayNumber = folderFileCounter;
            file.webPath = `${file.folderPath}/${file.name}`;
            addPDFToList(file, folderContentsElement);
        });
        
        const countElement = document.getElementById(`ssm-count-${folderIdSafe}`);
        if (countElement) {
            countElement.textContent = `(${files.length})`;
        }
        
        allPDFs.push(...files);
        
    } catch (error) {
        console.error(`Error loading folder ${folder.name}:`, error);
    }
}

// Add PDF file to the list - CLICK TO DOWNLOAD DIRECTLY
function addPDFToList(file, parentElement) {
    const li = document.createElement('li');
    li.className = 'pdf-item';
    
    const pdfName = file.name.replace('.pdf', '').replace('.PDF', '');
    const tooltipText = file.folderPath ? `${file.folderPath} / ${pdfName}` : pdfName;
    
    li.innerHTML = `
        <span class="chapter-number">${file.displayNumber}</span>
        <span class="icon pdf-file-icon" style="margin: 0 0.5rem;"></span>
        <span class="chapter-name" title="${tooltipText}">${pdfName}</span>
        <span class="chapter-size">${formatFileSize(file.size)}</span>
        <span class="download-indicator">⬇</span>
    `;
    
    // Add click handler - DIRECT DOWNLOAD
    li.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        downloadPDF(file);
    };
    
    parentElement.appendChild(li);
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Toggle folder open/closed
function toggleSSMFolder(folderIdSafe) {
    console.log('Toggling folder:', folderIdSafe);
    
    const folderContents = document.getElementById(`ssm-folder-${folderIdSafe}`);
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

// SIMPLIFIED - Download PDF file directly
function downloadPDF(file) {
    console.log('Downloading:', file.name);
    
    // Update UI to show which file is being downloaded
    const currentPDFTitle = document.getElementById('currentPDF');
    const pdfInfo = document.getElementById('pdfInfo');
    const pdfDisplay = document.getElementById('pdfDisplay');
    const pdfName = file.name.replace('.pdf', '').replace('.PDF', '');
    
    // Update header
    if (currentPDFTitle) {
        currentPDFTitle.textContent = `Downloading: ${pdfName}`;
    }
    
    if (pdfInfo) {
        pdfInfo.textContent = `${file.folderPath || 'General'} / ${pdfName}`;
    }
    
    // Show download status
    if (pdfDisplay) {
        pdfDisplay.innerHTML = `
            <div class="no-pdf-selected">
                <div class="download-animation">
                    <span class="icon download-icon-large" style="width: 80px; height: 80px; color: var(--primary);"></span>
                </div>
                
                <h3>Downloading...</h3>
                <p style="font-size: 1.25rem; font-weight: 600; margin: 1rem 0;">${pdfName}</p>
                
                <div class="pdf-info" style="max-width: 400px;">
                    <div class="pdf-info-item">
                        <span class="pdf-info-label">File Name:</span>
                        <span class="pdf-info-value">${file.name}</span>
                    </div>
                    <div class="pdf-info-item">
                        <span class="pdf-info-label">Size:</span>
                        <span class="pdf-info-value">${formatFileSize(file.size)}</span>
                    </div>
                    <div class="pdf-info-item">
                        <span class="pdf-info-label">Location:</span>
                        <span class="pdf-info-value">${file.folderPath || 'Root'}</span>
                    </div>
                </div>
                
                <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 2rem;">
                    The file will be saved to your Downloads folder
                </p>
            </div>
        `;
        
        // Add download animation
        setTimeout(() => {
            const iconElement = pdfDisplay.querySelector('.download-icon-large');
            if (iconElement && icons.download) {
                iconElement.innerHTML = icons.download;
                iconElement.style.animation = 'pulse 1s ease-in-out infinite';
            }
        }, 0);
    }
    
    // Highlight selected PDF
    document.querySelectorAll('.pdf-item').forEach(item => {
        const nameElement = item.querySelector('.chapter-name');
        if (nameElement && nameElement.textContent === pdfName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Create download link and trigger it
    const a = document.createElement('a');
    a.href = file.download_url;
    a.download = file.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Show success message after a short delay
    setTimeout(() => {
        showDownloadSuccess(file);
    }, 1500);
    
    // Store current PDF
    currentPDFFile = file;
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
        closeSidebar();
    }
}

// Show download success message
function showDownloadSuccess(file) {
    const pdfDisplay = document.getElementById('pdfDisplay');
    const pdfName = file.name.replace('.pdf', '').replace('.PDF', '');
    
    if (pdfDisplay) {
        pdfDisplay.innerHTML = `
            <div class="no-pdf-selected" style="text-align: center;">
                <div style="font-size: 80px; color: var(--success); margin-bottom: 1rem;">✓</div>
                <h3 style="color: var(--success);">Download Complete!</h3>
                <p style="font-size: 1.25rem; font-weight: 600; margin: 1rem 0;">${pdfName}</p>
                <p style="color: var(--text-tertiary); margin-top: 1rem;">
                    Check your Downloads folder for the file
                </p>
                
                <button class="download-btn" onclick="downloadPDF(${JSON.stringify(file).replace(/"/g, '&quot;')})" 
                        style="margin-top: 2rem;">
                    <span class="icon download-icon"></span>
                    <span>Download Again</span>
                </button>
                
                <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 2rem;">
                    Select another PDF from the sidebar to continue
                </p>
            </div>
        `;
        
        // Re-initialize download icon
        setTimeout(() => {
            const downloadIcon = pdfDisplay.querySelector('.download-icon');
            if (downloadIcon && icons.download) {
                downloadIcon.innerHTML = icons.download;
            }
        }, 0);
    }
    
    // Update header
    const currentPDFTitle = document.getElementById('currentPDF');
    if (currentPDFTitle) {
        currentPDFTitle.textContent = `Downloaded: ${pdfName}`;
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
    
    // Initialize PDF file icons
    document.querySelectorAll('.pdf-file-icon').forEach(icon => {
        if (typeof icons !== 'undefined' && icons.fileText) {
            icon.innerHTML = icons.fileText;
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('SSM PDF viewer initializing...');
    
    // Check if config exists
    if (typeof GITHUB_CONFIG === 'undefined') {
        console.error('GITHUB_CONFIG not found. Please check config.js');
        document.getElementById('pdfList').innerHTML = 
            '<li class="error">Configuration error. Please check console.</li>';
        return;
    }
    
    // Load PDFs immediately - no authentication needed
    loadPDFs();
});

// Make functions globally available
window.toggleSSMFolder = toggleSSMFolder;
window.downloadPDF = downloadPDF;
