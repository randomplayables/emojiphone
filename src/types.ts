export type TEmbedding = Record<string, number[]>;

// Utility: compute cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.error("Vector dimensions don't match for cosine similarity");
    return 0;
  }

  // Handle zero vectors
  const isZeroVector = (vec: number[]) => vec.every(val => val === 0);
  if (isZeroVector(a) || isZeroVector(b)) return 0;

  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// Types for scientific data collection

// Track a single phrase transformation
export interface PhraseTransformation {
  originalPhrase: string;
  transformedPhrases: string[];  // Each step of transformation
  finalPhrase: string;
  transformationSettings: TransformationSettings;
  semanticDistances: number[];   // Semantic distance at each step
  timestamp: number;             // When this transformation occurred
}

// Game settings when a transformation occurs
export interface TransformationSettings {
  numEmojis: number;
  vocabPercentage: number;
  vocabSize: number;             // Total vocabulary size
  wordsPerEmoji: number;         // Words per emoji vocabulary
}

// Track user performance in the game
export interface UserPerformance {
  originalPhrase: string;
  finalPhrase: string;
  userGuess: string;
  isCorrect: boolean;
  score: number;
  semanticDistance: number;      // Between original and final
  similarity?: number;           // Levenshtein similarity between guess and original
  timeToGuess: number;           // In milliseconds
  timestamp: number;
}

// Session data to track overall play session
export interface GameSession {
  transformations: PhraseTransformation[];
  userPerformances: UserPerformance[];
  sessionStart: number;
  sessionId: string;             // Random ID for the session
}