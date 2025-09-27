// ============================================
// CONFIGURATION FILE
// ============================================
// IMPORTANT: Replace these with your actual Supabase credentials!

// Your Supabase project URL (from Supabase dashboard > Settings > API)
const SUPABASE_URL = 'https://otlgdqakekwxtaoqwsxh.supabase.co';

// Your Supabase anonymous public key (from Supabase dashboard > Settings > API)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bGdkcWFrZWt3eHRhb3F3c3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDk4NzYsImV4cCI6MjA3MjgyNTg3Nn0.bIQCONxVgeUXHGXIhOn4M0KU5gXK2jkNqoOV1nMjzeE';

// GitHub repository details for fetching flashcard files
const GITHUB_CONFIG = {
    owner: 'akritbehera27',  // Replace with your GitHub username
    repo: 'flashcard-app',           // Your repository name
    branch: 'main',                  // Branch name (usually 'main' or 'master')
    folder: 'flashcards'             // Folder containing .txt files    

};

const SITE_CONFIG = {
    domain: 'https://pensapedia.pages.dev'
};

// Admin password for the admin panel (change this!)
const ADMIN_PASSWORD = 'admin2712';

// Initialize Supabase client (this creates our connection to the database)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if configuration is properly set
if (SUPABASE_URL.includes('YOUR-PROJECT-ID')) {
    console.error('⚠️ Please update SUPABASE_URL in js/config.js with your actual Supabase URL');
}

if (SUPABASE_ANON_KEY === 'YOUR-ANON-KEY-HERE') {
    console.error('⚠️ Please update SUPABASE_ANON_KEY in js/config.js with your actual Supabase key');
}

