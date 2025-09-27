// ============================================
// PUBLIC SSM VIEWER (PDF DOWNLOADS)
// ============================================

// Global variables
let allPDFs = [];
let currentPDFFile = null;
let folderStructureSSM = {};

// Load list of available PDFs from GitHub
async function loadPDFs() {
    console.log('Loading PDFs from GitHub...');
    
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '<li class="loading">Loading study materials...</li>';
    
    try {
        // Build the GitHub API URL for ssm folder
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/ssm`;
        
        console.log('Fetching PDFs from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
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
        console.error('Error loading PDFs:', error);
        pdfList.innerHTML = `
            <li class="error">
                Error loading PDFs!<br>
                <small>${error.message}</small><br>
                <small>Check console for details</small>
            </li>
        `;
    }
}

// Load contents of a folder
async function loadSSMFolder(folder, parentElement, parentPath = '') {
    try {
        console.log(`Loading folder: ${folder.name}`);
        
        const folderSection = document.createElement('li');
        folderSection.className = 'folder-section';
        
        const folderId = parentPath ? `${parentPath}-${folder.name}` : folder.name;
        const folderIdSafe = folderId.replace(/[^a-zA-Z0-9-]/g, '_');
        
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
        
        const response = await fetch(folder.url);
        if (!response.ok) {
            throw new Error(`Failed to load folder ${folder.name}`);
        }
        
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

// Add PDF file to the list
function addPDFToList(file, parentElement) {
    const li = document.createElement('li');
    li.className = 'pdf-item';
    
    const pdfName = file.name.replace('.pdf', '').replace('.PDF', '');
    const tooltipText = file.folderPath ? `${file.folderPath} / ${pdfName}` : pdfName;
    
    // Store the file path for URL construction
    file.webPath = file.folderPath ? `${file.folderPath}/${file.name}` : file.name;
    
    li.innerHTML = `
        <span class="chapter-number">${file.displayNumber}</span>
        <span class="icon pdf-file-icon" style="margin: 0 0.5rem;"></span>
        <span class="chapter-name" title="${tooltipText}">${pdfName}</span>
        <span class="chapter-size">${formatFileSize(file.size)}</span>
        <span class="download-indicator">⬇</span>
    `;
    
    // Add click handler
    li.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        showPDFOptions(file);
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

// Show PDF options (download/view)
function showPDFOptions(file) {
    console.log('Selected PDF:', file.name);
    
    const currentPDFTitle = document.getElementById('currentPDF');
    const pdfInfo = document.getElementById('pdfInfo');
    const pdfDisplay = document.getElementById('pdfDisplay');
    const pdfName = file.name.replace('.pdf', '').replace('.PDF', '');
    
    // Construct URLs
    let downloadUrl = file.download_url;
    let viewUrl;
    
    if (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.domain) {
        viewUrl = `${SITE_CONFIG.domain}/ssm/${file.webPath}`;
    } else {
        viewUrl = file.download_url;
    }
    
    // Update UI
    if (currentPDFTitle) {
        currentPDFTitle.textContent = pdfName;
    }
    
    if (pdfInfo) {
        pdfInfo.textContent = `${file.folderPath || 'General'} / ${pdfName}`;
    }
    
    if (pdfDisplay) {
        pdfDisplay.innerHTML = `
            <div class="no-pdf-selected">
                <span class="icon pdf-large-icon" style="width: 80px; height: 80px; margin-bottom: 1rem;"></span>
                
                <div class="pdf-info">
                    <h3>${pdfName}</h3>
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
                
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="download-btn" onclick="downloadPDF('${downloadUrl}', '${file.name}')">
                        <span class="icon download-icon"></span>
                        <span>Download PDF</span>
                    </button>
                    
                    <button class="download-btn view-btn" onclick="viewPDF('${viewUrl}')">
                        <span class="icon view-icon"></span>
                        <span>View in Browser</span>
                    </button>
                </div>
                
                <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 2rem;">
                    Click "Download" to save the file to your device<br>
                    Click "View" to open in a new browser tab
                </p>
            </div>
        `;
        
        // Re-initialize icons for the new content
        setTimeout(() => {
            const downloadIcon = pdfDisplay.querySelector('.download-icon');
            const viewIcon = pdfDisplay.querySelector('.view-icon');
            const pdfIcon = pdfDisplay.querySelector('.pdf-large-icon');
            
            if (downloadIcon && icons.download) downloadIcon.innerHTML = icons.download;
            if (viewIcon && icons.eye) viewIcon.innerHTML = icons.eye;
            if (pdfIcon && icons.fileText) pdfIcon.innerHTML = icons.fileText;
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
    
    // Store current PDF
    currentPDFFile = file;
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768 && typeof closeSidebar === 'function') {
        closeSidebar();
    }
}

// Download PDF file
function downloadPDF(url, filename) {
    console.log('Downloading:', filename);
    
    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Show confirmation
    showDownloadConfirmation(filename);
}

// View PDF in new tab
function viewPDF(url) {
    console.log('Opening PDF:', url);
    
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
        newWindow.focus();
    } else {
        alert('Please allow popups to view PDFs in a new tab.');
    }
}

// Show download confirmation
function showDownloadConfirmation(filename) {
    const pdfDisplay = document.getElementById('pdfDisplay');
    const originalContent = pdfDisplay.innerHTML;
    
    // Show confirmation message
    const confirmationHTML = `
        <div class="no-pdf-selected" style="background: var(--success); color: white; padding: 2rem; border-radius: 1rem;">
            <div style="font-size: 48px; margin-bottom: 1rem;">✓</div>
            <h3>Download Started!</h3>
            <p>${filename}</p>
            <p style="opacity: 0.9; margin-top: 1rem;">Check your downloads folder</p>
        </div>
    `;
    
    pdfDisplay.innerHTML = confirmationHTML;
    
    // Restore original content after 3 seconds
    setTimeout(() => {
        pdfDisplay.innerHTML = originalContent;
        
        // Re-initialize icons
        const downloadIcon = pdfDisplay.querySelector('.download-icon');
        const viewIcon = pdfDisplay.querySelector('.view-icon');
        const pdfIcon = pdfDisplay.querySelector('.pdf-large-icon');
        
        if (downloadIcon && icons.download) downloadIcon.innerHTML = icons.download;
        if (viewIcon && icons.eye) viewIcon.innerHTML = icons.eye;
        if (pdfIcon && icons.fileText) pdfIcon.innerHTML = icons.fileText;
    }, 3000);
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
window.viewPDF = viewPDF;