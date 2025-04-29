import * as fs from 'fs';
import * as path from 'path';
// Note: For Node.js v18+ you can use the built-in fetch API
// For earlier versions, uncomment the line below and install node-fetch
// import fetch from 'node-fetch';

// Use one of these sources for a comprehensive English wordlist
const WORDLIST_SOURCES = [
  'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt', // ~370k English words
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt', // Common 10k words
  'https://www.mit.edu/~ecprice/wordlist.10000', // Another 10k common words
];

// Extract game vocabulary to ensure these words are included
const extractGameVocabulary = async (): Promise<string[]> => {
  // Import the game phrases
  const { gamePhrases } = await import('../src/data/gamePhrases');
  return Array.from(
    new Set(gamePhrases.flatMap(p => p.toLowerCase().split(/\s+/)))
  );
};

// Path where to save the wordlist in your public folder
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'wordlist.txt');

async function downloadWordlist() {
  try {
    // Create public directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Choose which source to use
    const sourceUrl = WORDLIST_SOURCES[2]; // You can change the index to use a different source
    console.log(`Downloading wordlist from ${sourceUrl}...`);
    
    // For Node.js v18+ use the built-in fetch
    // For earlier versions, use the imported fetch from node-fetch
    const response = await fetch(sourceUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Basic processing - remove empty lines, trim whitespace, convert to lowercase
    const words = text
      .split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0);
    
    console.log(`Downloaded ${words.length} words.`);
    
    // Get game vocabulary and merge with downloaded wordlist
    const gameWords = await extractGameVocabulary();
    console.log(`Extracted ${gameWords.length} words from game phrases.`);
    
    // Combine both word lists and remove duplicates
    const allWords = Array.from(new Set([...words, ...gameWords]));
    console.log(`Total unique words after merging: ${allWords.length}`);
    
    // Save to file
    fs.writeFileSync(OUTPUT_PATH, allWords.join('\n'));
    console.log(`Wordlist saved to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error downloading wordlist:', error);
  }
}

// Run the function
downloadWordlist();