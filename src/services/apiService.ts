import type { TEmbedding } from '../types';

// The base URL for the RandomPlayables platform API.
// This should be configured in your .env file.
const API_BASE_URL = import.meta.env.VITE_PLATFORM_API_URL || 'https://randomplayables.com/api';

/**
 * Extracts authentication data from the URL query parameters.
 * The platform will pass these parameters when launching the game.
 */
function getAuthFromURL() {
  if (typeof window === 'undefined') return { token: null };
  
  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('authToken');
  
  return { token: authToken };
}

/**
 * Fetches word embeddings from the RandomPlayables platform.
 * This centralizes API calls, keeps secrets on the server, and allows for usage tracking.
 * @param {string[]} words - An array of words to get embeddings for.
 * @returns {Promise<TEmbedding>} A promise that resolves to the embedding object.
 */
export async function fetchPlatformEmbeddings(words: string[]): Promise<TEmbedding> {
  try {
    const { token } = getAuthFromURL();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include the auth token if it exists, allowing the platform to identify the user.
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Call the new centralized embeddings endpoint on the platform
    const response = await fetch(`${API_BASE_URL}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ words }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch embeddings from platform. Status: ${response.status}`);
    }

    const data = await response.json();
    return data.embeddings;

  } catch (error) {
    console.error('Error fetching embeddings from platform:', error);
    // On error, return an empty object to prevent the game from crashing.
    // The game logic should handle cases where embeddings are not found.
    return {};
  }
}