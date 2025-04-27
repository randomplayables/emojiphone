import { TEmbedding } from '../types';

// Function to generate random vector with stable values
function randomVector(word: string, dimension: number): number[] {
  // Use word as seed for deterministic random values
  const seed = Array.from(word).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return Array.from({ length: dimension }, (_, i) => {
    // Pseudo-random but deterministic value generation
    const value = Math.sin(seed * (i + 1)) * 10000;
    return (value - Math.floor(value)) * 2 - 1; // Range: -1 to 1
  });
}

// Function to generate mock embeddings for common words
export function generateMockEmbeddings(wordCount: number, dimension: number): TEmbedding {
  const commonWords = [
    // Basic nouns
    'cat', 'dog', 'house', 'car', 'tree', 'book', 'phone', 'computer', 'coffee', 'water',
    'game', 'ball', 'sun', 'moon', 'star', 'bird', 'fish', 'table', 'chair', 'door',
    
    // Basic verbs
    'run', 'walk', 'jump', 'eat', 'drink', 'sleep', 'write', 'read', 'talk', 'listen',
    'work', 'play', 'think', 'feel', 'look', 'see', 'hear', 'touch', 'smell', 'taste',
    
    // Basic adjectives
    'big', 'small', 'hot', 'cold', 'happy', 'sad', 'good', 'bad', 'fast', 'slow',
    'hard', 'soft', 'loud', 'quiet', 'bright', 'dark', 'new', 'old', 'young', 'funny',
    
    // Tech words
    'code', 'program', 'data', 'app', 'web', 'internet', 'emoji', 'vector', 'pixel',
    'crypto', 'digital', 'virtual', 'online', 'software', 'hardware', 'network', 'server', 'cloud', 'robot',
    
    // Additional common words
    'time', 'day', 'night', 'year', 'month', 'week', 'hour', 'minute', 'second', 'morning',
    'afternoon', 'evening', 'today', 'tomorrow', 'yesterday', 'now', 'later', 'soon', 'never', 'always',
    
    // Words that might appear in game phrases
    'hello', 'world', 'welcome', 'amazing', 'challenge', 'victory', 'defeat', 'score', 'level', 'player',
    'start', 'finish', 'begin', 'end', 'win', 'lose', 'try', 'attempt', 'success', 'failure',
    
    // Common prepositions and articles
    'in', 'on', 'at', 'with', 'from', 'to', 'of', 'by', 'for', 'the',
    'a', 'an', 'and', 'but', 'or', 'if', 'then', 'so', 'because', 'about'
  ];
  
  // Generate vectors for all words
  const embeddings: TEmbedding = {};
  
  // Take first N unique words
  const uniqueWords = Array.from(new Set(commonWords));
  const selectedWords = uniqueWords.slice(0, Math.min(wordCount, uniqueWords.length));
  
  // Create embeddings with similar words having similar vectors
  selectedWords.forEach(word => {
    embeddings[word] = randomVector(word, dimension);
  });
  
  // Add words from phrases to ensure they're in our vocabulary
  gamePhrases.forEach(phrase => {
    phrase.split(' ').forEach(word => {
      const lowerWord = word.toLowerCase();
      if (!embeddings[lowerWord]) {
        embeddings[lowerWord] = randomVector(lowerWord, dimension);
      }
    });
  });
  
  return embeddings;
}

// Preset phrases for the game
export const gamePhrases = [
  'hello world',
  'welcome to the game',
  'play with emoji',
  'telephone with vectors',
  'guess the phrase',
  'have fun playing',
  'this is a fun game',
  'emoji telephone challenge',
  'vector word transformation',
  'can you guess right',
  'language is amazing',
  'words change meaning',
  'signal gets distorted',
  'telephone game online',
  'math meets language'
];