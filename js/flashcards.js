// ============================================
// FLASHCARD LOGIC - CLEANED VERSION
// ============================================

// Global variables to store flashcard data
let allChapters = [];        // List of all available chapters
let currentCards = [];       // Cards in current deck (always shuffled)
let currentCardIndex = 0;    // Which card we're showing
let isFlipped = false;       // Is the current card flipped?
let currentChapterName = ''; // Name of current chapter

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
    console.log('Loading chapters from GitHub...');
    
    // Show loading state in sidebar
    const chapterList = document.getElementById('chapterList');
    chapterList.innerHTML = '<li class="loading">Loading chapters...</li>';
    
    try {
        // Build the GitHub API URL
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.folder}`;
        
        console.log('Fetching from:', apiUrl);
        
        // Fetch the list of files
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const files = await response.json();
        
        // Filter for .txt files only
        const textFiles = files.filter(file => file.name.endsWith('.txt'));
        
        if (textFiles.length === 0) {
            chapterList.innerHTML = '<li class="error">No flashcard files found</li>';
            return;
        }
        
        // Clear the list
        chapterList.innerHTML = '';
        allChapters = textFiles;
        
        // Add each chapter to the sidebar
        textFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'chapter-item';
            
            // Remove .txt extension for display
            const chapterName = file.name.replace('.txt', '');
            
            // Create chapter button
            li.innerHTML = `
                <span class="chapter-number">${index + 1}</span>
                <span class="chapter-name">${chapterName}</span>
                <span class="chapter-size">${(file.size / 1024).toFixed(1)}KB</span>
            `;
            
            // Add click handler
            li.onclick = () => loadFlashcards(file);
            
            chapterList.appendChild(li);
        });
        
        console.log(`Loaded ${textFiles.length} chapters`);
        
    } catch (error) {
        console.error('Error loading chapters:', error);
        chapterList.innerHTML = `
            <li class="error">
                Error loading chapters!<br>
                <small>${error.message}</small><br>
                <small>Check console for details</small>
            </li>
        `;
        
        // Show helpful error info
        if (GITHUB_CONFIG.owner === 'YOUR-GITHUB-USERNAME') {
            alert('Please update GITHUB_CONFIG in js/config.js with your GitHub username!');
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

// Display current card
function displayCard() {
    if (currentCards.length === 0) return;
    
    // Get current card
    const card = currentCards[currentCardIndex];
    
    // Update card content
    document.getElementById('questionText').textContent = card.question;
    document.getElementById('answerText').textContent = card.answer;
    
    // Reset flip state (always show question first)
    isFlipped = false;
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');
    
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