import { TEmbedding } from '../types';

/**
 * Subsample the embedding by selecting k random words
 */
export function subsampleEmbedding(embedding: TEmbedding, k: number): TEmbedding {
  const keys = Object.keys(embedding);
  
  // If k is larger than available keys, return all
  if (k >= keys.length) {
    return {...embedding};
  }
  
  const sample = new Set<string>();
  
  // Ensure we get k unique words or use all available words
  while (sample.size < k && sample.size < keys.length) {
    const w = keys[Math.floor(Math.random() * keys.length)];
    sample.add(w);
  }
  
  // Convert set back to object with embeddings
  return Object.fromEntries(
    Array.from(sample).map(w => [w, embedding[w]])
  );
}