import OpenAI from "openai";
import type { TEmbedding } from "../types";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Fetch OpenAI embeddings for each word in `words`.
 */
export async function fetchEmbeddings(words: string[]): Promise<TEmbedding> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: words
  });

  const embeddings: TEmbedding = {};
  response.data.forEach((item, idx) => {
    embeddings[words[idx]] = item.embedding;
  });
  return embeddings;
}