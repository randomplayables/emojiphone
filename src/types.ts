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