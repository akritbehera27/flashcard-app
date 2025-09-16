// ============================================
// FLASHCARD LOGIC - CLEANED VERSION
// ============================================

// Global variables to store flashcard data
let allChapters = [];        // List of all available chapters
let currentCards = [];       // Cards in current deck (always shuffled)
let currentCardIndex = 0;    // Which card we're showing
let isFlipped = false;       // Is the current card flipped?
let currentChapterName = ''; // Name of current chapter
let folderStructure = {};

function handleCardClick() {
    // If no cards are loaded, open sidebar instead of flipping
    if (currentCards.length === 0) {
        console.log('No deck loaded - opening sidebar');
        
        // Check if we're on mobile or desktop
        if (window.innerWidth <= 768) {
            // Mobile - open sidebar
            toggleSidebar();
        } else {
            // Desktop - check if sidebar is collapsed
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('collapsed')) {
                // Expand sidebar
                toggleSidebarDesktop();
            }
        }
        
        // Add a small animation to draw attention to sidebar
        setTimeout(() => {
            const chapterList = document.getElementById('chapterList');
            if (chapterList) {
                chapterList.style.animation = 'pulse 1s ease-in-out';
                setTimeout(() => {
                    chapterList.style.animation = '';
                }, 1000);
            }
        }, 300);
    } else {
        // Normal behavior - flip the card
        flipCard();
    }
}


// Fisher-Yates shuffle algorithm - ALWAYS USED
function shuffleArray(array) {
    const shuffled = [...array]; // Create a copy
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Reshuffle current deck
function reshuffleCards() {
    if (currentCards.length === 0) return;
    
    console.log('Reshuffling cards...');
    
    // Reshuffle the current cards
    currentCards = shuffleArray(currentCards);
    
    // Reset to first card
    currentCardIndex = 0;
    
    // Display the new first card
    displayCard();
    
    // That's it! No animations or messages
}

// Load list of available chapters from GitHub
async function loadChapters() {
    console.log('Loading chapters and folders from GitHub...');
    
    // Show loading state in sidebar
    const chapterList = document.getElementById('chapterList');
    chapterList.innerHTML = '<li class="loading">Loading chapters...</li>';
    
    try {
        // Build the GitHub API URL
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.folder}`;
        
        console.log('Fetching from:', apiUrl);
        
        // Fetch the root flashcards folder
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const items = await response.json();
        
        // Clear the list
        chapterList.innerHTML = '';
        folderStructure = {};
        
        // Separate folders and files
        const folders = items.filter(item => item.type === 'dir');
        const files = items.filter(item => item.type === 'file' && item.name.endsWith('.txt'));
        
        // Process folders first
        for (const folder of folders) {
            await loadFolderContents(folder, chapterList);
        }
        
        // Then add root-level files
        if (files.length > 0) {
            // Add a section for root files if there are also folders
            if (folders.length > 0 && files.length > 0) {
                const generalSection = document.createElement('li');
                generalSection.className = 'folder-section';
                generalSection.innerHTML = `
                    <div class="folder-header" onclick="toggleFolder('general')">
                        <span class="icon folder-icon"></span>
                        <span class="folder-name">General</span>
                        <span class="icon chevron-icon expanded"></span>
                    </div>
                    <ul class="folder-contents" id="folder-general">
                    </ul>
                `;
                chapterList.appendChild(generalSection);
                
                const generalContents = document.getElementById('folder-general');
                files.forEach((file, index) => {
                    addFileToList(file, generalContents, index);
                });
            } else {
                // Just add files directly if no folders
                files.forEach((file, index) => {
                    addFileToList(file, chapterList, index);
                });
            }
        }
        
        // Store all chapters for reference
        allChapters = [...files];
        
        if (folders.length === 0 && files.length === 0) {
            chapterList.innerHTML = '<li class="error">No flashcard files or folders found</li>';
        }
        
        console.log(`Loaded ${folders.length} folders and ${files.length} root files`);
        
    } catch (error) {
        console.error('Error loading chapters:', error);
        chapterList.innerHTML = `
            <li class="error">
                Error loading chapters!<br>
                <small>${error.message}</small><br>
                <small>Check console for details</small>
            </li>
        `;
        
        if (GITHUB_CONFIG.owner === 'YOUR-GITHUB-USERNAME') {
            alert('Please update GITHUB_CONFIG in js/config.js with your GitHub username!');
        }
    }
}


// NEW FUNCTION: Load contents of a folder
async function loadFolderContents(folder, parentElement) {
    try {
        console.log(`Loading folder: ${folder.name}`);
        
        // Create folder section
        const folderSection = document.createElement('li');
        folderSection.className = 'folder-section';
        
        // Create folder header
        folderSection.innerHTML = `
            <div class="folder-header" onclick="toggleFolder('${folder.name}')">
                <span class="icon folder-icon"></span>
                <span class="folder-name">${folder.name}</span>
                <span class="icon chevron-icon expanded"></span>
                <span class="folder-count" id="count-${folder.name}">...</span>
            </div>
            <ul class="folder-contents" id="folder-${folder.name}">
                <li class="loading">Loading...</li>
            </ul>
        `;
        
        parentElement.appendChild(folderSection);
        
        // Fetch folder contents
        const response = await fetch(folder.url);
        if (!response.ok) {
            throw new Error(`Failed to load folder ${folder.name}`);
        }
        
        const contents = await response.json();
        const files = contents.filter(item => item.type === 'file' && item.name.endsWith('.txt'));
        const subfolders = contents.filter(item => item.type === 'dir');
        
        // Update folder structure
        folderStructure[folder.name] = files;
        
        // Update the folder contents
        const folderContentsElement = document.getElementById(`folder-${folder.name}`);
        folderContentsElement.innerHTML = '';
        
        // Add subfolders first
        for (const subfolder of subfolders) {
            await loadFolderContents(subfolder, folderContentsElement);
        }
        
        // Add files
        files.forEach((file, index) => {
            // Store file with folder path for proper loading
            file.folderPath = folder.name;
            addFileToList(file, folderContentsElement, index);
        });
        
        // Update count
        const countElement = document.getElementById(`count-${folder.name}`);
        if (countElement) {
            countElement.textContent = `(${files.length})`;
        }
        
        // Add files to global chapters array
        allChapters.push(...files);
        
    } catch (error) {
        console.error(`Error loading folder ${folder.name}:`, error);
        const folderContentsElement = document.getElementById(`folder-${folder.name}`);
        if (folderContentsElement) {
            folderContentsElement.innerHTML = '<li class="error">Error loading folder contents</li>';
        }
    }
}

// NEW FUNCTION: Add file to the list
function addFileToList(file, parentElement, index) {
    const li = document.createElement('li');
    li.className = 'chapter-item';
    
    // Remove .txt extension for display
    const chapterName = file.name.replace('.txt', '');
    
    // Add folder path to display if it exists
    const displayName = file.folderPath ? `${chapterName}` : chapterName;
    
    li.innerHTML = `
        <span class="chapter-number">${index + 1}</span>
        <span class="chapter-name" title="${displayName}">${displayName}</span>
        <span class="chapter-size">${(file.size / 1024).toFixed(1)}KB</span>
    `;
    
    // Add click handler
    li.onclick = () => loadFlashcards(file);
    
    parentElement.appendChild(li);
}

// NEW FUNCTION: Toggle folder open/closed
function toggleFolder(folderName) {
    const folderContents = document.getElementById(`folder-${folderName}`);
    const chevron = document.querySelector(`#folder-${folderName}`).previousElementSibling.querySelector('.chevron-icon');
    
    if (folderContents) {
        if (folderContents.style.display === 'none') {
            folderContents.style.display = 'block';
            chevron?.classList.add('expanded');
            chevron?.classList.remove('collapsed');
        } else {
            folderContents.style.display = 'none';
            chevron?.classList.remove('expanded');
            chevron?.classList.add('collapsed');
        }
    }
}

// Parse flashcard content from text format
function parseFlashcards(content, filename) {
    console.log(`Parsing flashcards from ${filename}...`);
    
    const cards = [];
    const lines = content.split('\n');
    
    let currentQuestion = '';
    let currentAnswer = '';
    let isReadingAnswer = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this line starts a new question
        if (line.startsWith('Q:') || line.startsWith('q:')) {
            // Save previous card if exists
            if (currentQuestion && currentAnswer) {
                cards.push({
                    question: currentQuestion.trim(),
                    answer: currentAnswer.trim()
                });
            }
            
            // Start new question
            currentQuestion = line.substring(2).trim();
            currentAnswer = '';
            isReadingAnswer = false;
            
        // Check if this line starts an answer
        } else if (line.startsWith('A:') || line.startsWith('a:')) {
            currentAnswer = line.substring(2).trim();
            isReadingAnswer = true;
            
        // Continue reading answer (for multi-line answers)
        } else if (isReadingAnswer && line) {
            currentAnswer += '\n' + line;
            
        // Continue reading question (for multi-line questions)
        } else if (!isReadingAnswer && line && currentQuestion) {
            currentQuestion += '\n' + line;
        }
    }
    
    // Don't forget the last card!
    if (currentQuestion && currentAnswer) {
        cards.push({
            question: currentQuestion.trim(),
            answer: currentAnswer.trim()
        });
    }
    
    console.log(`Parsed ${cards.length} flashcards`);
    return cards;
}

// Load flashcards from selected chapter - ALWAYS SHUFFLED
async function loadFlashcards(file) {
    console.log('Loading flashcards from:', file.name);
    
    try {
        // Update UI to show loading state
        document.getElementById('currentDeck').textContent = `Loading ${file.name}...`;
        document.getElementById('questionText').textContent = 'Loading...';
        document.getElementById('answerText').textContent = 'Loading...';
        
        // Fetch the file content
        const response = await fetch(file.download_url);
        const content = await response.text();
        
        // Parse the flashcards
        const parsedCards = parseFlashcards(content, file.name);
        
        if (parsedCards.length === 0) {
            alert('No valid flashcards found in this file!\n\nMake sure your file uses the format:\nQ: Question here\nA: Answer here');
            return;
        }
        
        // ALWAYS SHUFFLE THE CARDS
        currentCards = shuffleArray(parsedCards);
        console.log(`Shuffled ${currentCards.length} cards`);
        
        // Reset to first card
        currentCardIndex = 0;
        currentChapterName = file.name.replace('.txt', '');
        
        // Update UI
        document.getElementById('currentDeck').textContent = currentChapterName;
        
        // Show shuffle button
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            shuffleBtn.style.display = 'inline-flex';
        }
        
        // Highlight selected chapter in sidebar
        document.querySelectorAll('.chapter-item').forEach((item, index) => {
            if (allChapters[index].name === file.name) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Display first card
        displayCard();
        
        // Enable controls
        document.getElementById('prevBtn').disabled = false;
        document.getElementById('nextBtn').disabled = false;
        document.getElementById('flipHint').style.display = 'block';
        
        // AUTO-CLOSE SIDEBAR ON MOBILE after selecting chapter
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        
    } catch (error) {
        console.error('Error loading flashcards:', error);
        alert('Error loading flashcards! Check console for details.');
    }
}


function resetToInitialState() {
    // Clear current cards
    currentCards = [];
    currentCardIndex = 0;
    
    // Show initial prompt
    const initialPrompt = document.getElementById('initialPrompt');
    const questionElement = document.getElementById('questionText');
    
    if (initialPrompt) {
        initialPrompt.style.display = 'flex';
    } else if (questionElement) {
        // Fallback if prompt doesn't exist
        questionElement.innerHTML = `
            <div class="initial-prompt" id="initialPrompt">
                <h5>Select a study deck.</h5>
                <span class="arrow-indicator">→</span>
            </div>
        `;
    }
    
    // Reset other UI elements
    document.getElementById('answerText').textContent = 'The answer will appear here';
    document.getElementById('currentDeck').textContent = 'Welcome! Select a deck to begin';
    document.getElementById('cardCounter').textContent = 'No cards loaded';
    document.getElementById('flipHint').style.display = 'none';
    
    // Hide shuffle button
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.style.display = 'none';
    }
    
    // Disable navigation buttons
    document.getElementById('prevBtn').disabled = true;
    document.getElementById('nextBtn').disabled = true;
}


// Display current card
function displayCard() {
    if (currentCards.length === 0) return;
    
    // Hide initial prompt when cards are loaded
    const initialPrompt = document.getElementById('initialPrompt');
    if (initialPrompt) {
        initialPrompt.style.display = 'none';
    }
    
    // Get current card
    const card = currentCards[currentCardIndex];
    
    // Update card content (show plain text, not the prompt)
    const questionElement = document.getElementById('questionText');
    const answerElement = document.getElementById('answerText');
    
    // Clear any HTML and set plain text
    questionElement.textContent = card.question;
    answerElement.textContent = card.answer;
    
    // Reset flip state (always show question first)
    isFlipped = false;
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');
    
    // Show flip hint when cards are loaded
    document.getElementById('flipHint').style.display = 'block';
    
    // Update counter
    document.getElementById('cardCounter').textContent = 
        `Card ${currentCardIndex + 1} of ${currentCards.length}`;
    
    // Update progress bar
    const progress = ((currentCardIndex + 1) / currentCards.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    
    // Update button states
    document.getElementById('prevBtn').disabled = (currentCardIndex === 0);
    document.getElementById('nextBtn').disabled = (currentCardIndex === currentCards.length - 1);
}

// Flip the current card
function flipCard() {
    if (currentCards.length === 0) return;
    
    isFlipped = !isFlipped;
    const flashcard = document.getElementById('flashcard');
    
    if (isFlipped) {
        flashcard.classList.add('flipped');
    } else {
        flashcard.classList.remove('flipped');
    }
}

// Go to next card
function nextCard() {
    if (currentCardIndex < currentCards.length - 1) {
        currentCardIndex++;
        displayCard();
    }
}

// Go to previous card
function previousCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        displayCard();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case ' ':  // Spacebar
            event.preventDefault();
            flipCard();
            break;
        case 'ArrowLeft':
            event.preventDefault();
            previousCard();
            break;
        case 'ArrowRight':
            event.preventDefault();
            nextCard();
            break;
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Flashcard app initializing...');
    console.log('Automatic shuffle is ENABLED for all decks');
    
    // Check authentication first
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    // Load chapters
    loadChapters();
    
    // Display user key
    const userKey = localStorage.getItem('access_key');
    if (userKey) {
        const userKeyElement = document.getElementById('userKey');
        if (userKeyElement) {
            userKeyElement.textContent = userKey;
        }
    }
});