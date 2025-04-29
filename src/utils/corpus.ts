import { gamePhrases } from '../data/gamePhrases';

// This function would extract all unique words from game phrases
export function extractGameVocabulary(): string[] {
  return Array.from(
    new Set(gamePhrases.flatMap(p => p.toLowerCase().split(/\s+/)))
  );
}

// This function would load the full corpus and ensure game words are included
export async function loadEnhancedCorpus(): Promise<string[]> {
  try {
    
    // Load from a pre-downloaded wordlist file
    const response = await fetch('/wordlist.txt');
    const text = await response.text();
    const corpusWords = text.split('\n').map(word => word.trim().toLowerCase()).filter(word => word);
    
    // Ensure all game words are included in the corpus
    const gameWords = extractGameVocabulary();
    const allWords = new Set([...corpusWords, ...gameWords]);
    
    console.log(`Loaded corpus with ${allWords.size} unique words`);
    
    return Array.from(allWords);
  } catch (error) {
    console.error('Error loading corpus:', error);
    // Fallback to just game words if corpus fails to load
    return extractGameVocabulary();
  }
}