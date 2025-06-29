import { fetchPlatformEmbeddings } from '../services/apiService';
import type { TEmbedding } from "../types";

/**
 * Fetch embeddings for each word in `words` by calling the platform's API.
 */
export async function fetchEmbeddings(words: string[]): Promise<TEmbedding> {
  // The logic is now delegated to the apiService, which calls the platform backend.
  // This keeps the client-side code clean and secure.
  return fetchPlatformEmbeddings(words);
}