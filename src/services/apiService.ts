import type { TEmbedding } from '../types';

// The base URL for the RandomPlayables platform API.
const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://randomplayables.com/api'
  : '/api';

// Game ID for Emojiphone, loaded from environment variables
const GAME_ID = import.meta.env.VITE_GAME_ID;

// Session storage keys
const SESSION_STORAGE_KEY = 'emojiphoneGameSession';
const SESSION_CREATION_TIME_KEY = 'emojiphoneGameSessionCreationTime';


/**
 * Extracts authentication data from the URL query parameters.
 * The platform will pass these parameters when launching the game.
 */
function getAuthFromURL() {
  if (typeof window === 'undefined') return { token: null, userId: null, username: null };
  
  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('authToken');
  const userId = urlParams.get('userId');
  const username = urlParams.get('username');

  return { token: authToken, userId, username };
}

let sessionInitPromise: Promise<any> | null = null;

/**
 * Initializes a game session with the platform
 * @returns Session information including sessionId
 */
export async function initGameSession() {
  if (sessionInitPromise) {
    return sessionInitPromise;
  }

  sessionInitPromise = (async () => {
    try {
      const lastCreationTime = localStorage.getItem(SESSION_CREATION_TIME_KEY);
      const currentSession = localStorage.getItem(SESSION_STORAGE_KEY);
      const now = Date.now();
      
      if (lastCreationTime && currentSession) {
        if (now - parseInt(lastCreationTime) < 3000) { // 3s for React StrictMode
          return JSON.parse(currentSession);
        }
      }
      
      localStorage.removeItem(SESSION_STORAGE_KEY);
      
      const { token, userId, username } = getAuthFromURL();
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/game-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          gameId: GAME_ID,
          ...(userId && { passedUserId: userId }),
          ...(username && { passedUsername: username })
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn(`Could not connect to RandomPlayables platform. Status: ${response.status}. Using local session.`);
        const localSession = { sessionId: `local-${Date.now()}`, userId, username, isGuest: !userId, gameId: GAME_ID };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(localSession));
        localStorage.setItem(SESSION_CREATION_TIME_KEY, now.toString());
        return localSession;
      }
      
      const session = await response.json();
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(SESSION_CREATION_TIME_KEY, now.toString());
      return session;

    } catch (error) {
      console.error('Error initializing game session:', error);
      const { userId, username } = getAuthFromURL();
      const localSession = { sessionId: `local-${Date.now()}`, userId, username, isGuest: !userId, gameId: GAME_ID };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(localSession));
      localStorage.setItem(SESSION_CREATION_TIME_KEY, Date.now().toString());
      return localSession;
    } finally {
      setTimeout(() => { sessionInitPromise = null; }, 5000);
    }
  })();
  
  return sessionInitPromise;
}


/**
 * Saves round or event data to the platform
 * @param eventName A string describing the event (e.g., 'transformation', 'performance').
 * @param eventData The data object associated with the event.
 * @returns Response from the server or null if offline.
 */
export async function saveGameData(eventName: string, eventData: any): Promise<any | null> {
  const sessionString = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionString) {
    console.error('No active game session found for saving data.');
    return null;
  }
  const session = JSON.parse(sessionString);

  // Map event name to a round number for the backend
  let roundNumber;
  if (eventName === 'session_end') {
      roundNumber = 999;
  } else if (eventName === 'transformation' || eventName === 'performance') {
      roundNumber = eventData.roundNumber || 0; // Assuming eventData might have a round number
  } else {
      roundNumber = 0; // Default
  }

  const { token, userId, username } = getAuthFromURL();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/game-data`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        sessionId: session.sessionId,
        roundNumber, // Use the mapped round number
        roundData: { eventName, ...eventData }, // Nest eventName inside roundData
        ...(userId && { passedUserId: userId }),
        ...(username && { passedUsername: username })
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving game data:', error);
    return null;
  }
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

    // Call the centralized embeddings endpoint on the platform
    const response = await fetch(`${API_BASE_URL}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ words }),
      credentials: 'include',
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