import rawEmbeddings from '../data/embeddings.json'
import { TEmbedding } from '../types'

export const fullEmbedding: TEmbedding = rawEmbeddings

/**
 * Subsample the embedding by selecting k random words
 */
export function subsampleEmbedding(embedding: TEmbedding, k: number): TEmbedding {
  const keys = Object.keys(embedding)
  const sample = new Set<string>()
  while (sample.size < k && sample.size < keys.length) {
    const w = keys[Math.floor(Math.random() * keys.length)]
    sample.add(w)
  }
  return Object.fromEntries(
    Array.from(sample).map(w => [w, embedding[w]])
  )
}
