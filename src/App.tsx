import { useState, useEffect, useCallback } from 'react';
import './App.css';
import EmojiCircle from './components/EmojiCircle';
import { cosineSimilarity, TEmbedding } from './types';
import { fetchEmbeddings } from './utils/openaiEmbeddings';
import { gamePhrases } from './data/gamePhrases';
import { subsampleEmbedding } from './utils/embeddings';

// Game config
const NUM_EMOJIS = 6;
const SUBSAMPLE_SIZE = 50; // Size of each emoji's vocabulary

// Emoji set
const EMOJIS = ['😀', '🎮', '🚀', '🧠', '🤖', '🎯'];

// Game phases
type GamePhase = 'idle' | 'animating' | 'guessing' | 'gameOver' | 'practice';

function App() {
  // Game state
  const [fullEmbedding, setFullEmbedding] = useState<TEmbedding>({});
  const [subsamples, setSubsamples] = useState<TEmbedding[]>([]);
  const [originalPhrase, setOriginalPhrase] = useState<string>('');
  const [finalPhrase, setFinalPhrase] = useState<string>('');
  const [transformedPhrases, setTransformedPhrases] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  const [score, setScore] = useState<number>(0);
  const [rounds, setRounds] = useState<number>(0);
  const [userGuess, setUserGuess] = useState<string>('');
  const [activeEmojiIndex, setActiveEmojiIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  // New state for practice mode
  const [practicePhrase, setPracticePhrase] = useState<string>('');

  // Fetch real embeddings for our phrase vocabulary on mount
  useEffect(() => {
    const load = async () => {
      const vocab = Array.from(
        new Set(gamePhrases.flatMap(p => p.toLowerCase().split(' ')))
      );
      const embeds = await fetchEmbeddings(vocab);
      setFullEmbedding(embeds);
    };
    load();
  }, []);

  // Generate subsamples whenever the full embedding changes
  useEffect(() => {
    if (Object.keys(fullEmbedding).length === 0) return;
    
    // Generate a subsample for each emoji
    const samples = Array.from({ length: NUM_EMOJIS }).map(() => 
      subsampleEmbedding(fullEmbedding, SUBSAMPLE_SIZE)
    );
    setSubsamples(samples);
  }, [fullEmbedding]);

  // Function to pass phrase through emoji subsamples
  const passPhraseThroughEmojis = useCallback((phrase: string) => {
    if (subsamples.length === 0) return { transformedPhrases: [], finalPhrase: phrase };
    
    let currentPhrase = phrase;
    const allPhrases: string[] = [];
    
    // Pass through each emoji's subsample
    subsamples.forEach(subsample => {
      const words = currentPhrase.split(' ');
      const transformedWords = words.map(word => {
        // Skip transformation for words not in our full embedding
        if (!fullEmbedding[word.toLowerCase()]) return word;
        
        const originalVector = fullEmbedding[word.toLowerCase()];
        
        // Find closest word in the subsample
        let bestWord = word;
        let bestSimilarity = -Infinity;
        
        Object.entries(subsample).forEach(([candidateWord, candidateVector]) => {
          const similarity = cosineSimilarity(originalVector, candidateVector);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestWord = candidateWord;
          }
        });
        
        return bestWord;
      });
      
      currentPhrase = transformedWords.join(' ');
      allPhrases.push(currentPhrase);
    });
    
    return { transformedPhrases: allPhrases, finalPhrase: currentPhrase };
  }, [fullEmbedding, subsamples]);

  // Start a new regular game round
  const startNewRound = useCallback(() => {
    if (Object.keys(fullEmbedding).length === 0 || subsamples.length === 0) {
      return; // Game not ready yet
    }
    
    // Select a random phrase
    const phrase = gamePhrases[Math.floor(Math.random() * gamePhrases.length)];
    setOriginalPhrase(phrase);
    
    // Process phrase through emoji subsamples
    const { transformedPhrases, finalPhrase } = passPhraseThroughEmojis(phrase);

    // Development logs: original and intermediate phrases
    console.log('Original phrase:', phrase);
    console.log('Transformed phrases:', transformedPhrases);
    
    setTransformedPhrases(transformedPhrases);
    setFinalPhrase(finalPhrase);
    setGamePhase('animating');
    setIsAnimating(true);
    setActiveEmojiIndex(0);
    setUserGuess('');
    
    // After animation completes, move to guessing phase
    setTimeout(() => {
      setIsAnimating(false);
      setGamePhase('guessing');
    }, (NUM_EMOJIS + 1) * 1000); // Animation time plus a buffer
  }, [fullEmbedding, subsamples, passPhraseThroughEmojis]);

  // New function to handle the "Send It" practice mode
  const startPracticeMode = useCallback(() => {
    if (Object.keys(fullEmbedding).length === 0 || subsamples.length === 0 || !practicePhrase.trim()) {
      return; // Not ready or no phrase entered
    }
    
    // Process the user's phrase through emoji subsamples
    const { transformedPhrases, finalPhrase } = passPhraseThroughEmojis(practicePhrase);
    
    console.log('Practice phrase:', practicePhrase);
    console.log('Transformed practice phrases:', transformedPhrases);
    
    setOriginalPhrase(practicePhrase);
    setTransformedPhrases(transformedPhrases);
    setFinalPhrase(finalPhrase);
    setGamePhase('practice');
    setIsAnimating(true);
    setActiveEmojiIndex(0);
    
    // After animation completes, stop animating but stay in practice mode
    setTimeout(() => {
      setIsAnimating(false);
      // Show all emojis as active to display their transformations
      setActiveEmojiIndex(NUM_EMOJIS - 1);
    }, (NUM_EMOJIS + 1) * 1000); // Animation time plus a buffer
  }, [fullEmbedding, subsamples, practicePhrase, passPhraseThroughEmojis]);

  // Calculate score based on semantic distance
  const calculateScore = useCallback(() => {
    if (!originalPhrase || !finalPhrase) return 0;
    
    const originalWords = originalPhrase.split(' ');
    const finalWords = finalPhrase.split(' ');
    
    // Calculate total semantic distance
    let totalDistance = 0;
    const maxLength = Math.max(originalWords.length, finalWords.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i >= originalWords.length || i >= finalWords.length) {
        // Penalize different lengths
        totalDistance += 1;
        continue;
      }
      
      const origWord = originalWords[i].toLowerCase();
      const finalWord = finalWords[i].toLowerCase();
      
      if (origWord === finalWord) {
        // No distance for identical words
        continue;
      }
      
      // If we have embeddings for both words, compute cosine distance
      if (fullEmbedding[origWord] && fullEmbedding[finalWord]) {
        const similarity = cosineSimilarity(fullEmbedding[origWord], fullEmbedding[finalWord]);
        totalDistance += (1 - similarity); // Convert similarity to distance
      } else {
        // Default penalty for unknown words
        totalDistance += 1;
      }
    }
    
    // Scale score - higher is better, so we invert the distance
    // and scale by number of words for fairness
    return Math.max(0, 10 - (totalDistance * 2)) * originalWords.length;
  }, [originalPhrase, finalPhrase, fullEmbedding]);

  // Handle user's guess
  const submitGuess = useCallback(() => {
    if (gamePhase !== 'guessing') return;
    
    // Check if guess matches the original phrase (case-insensitive)
    if (userGuess.toLowerCase() === originalPhrase.toLowerCase()) {
      // Correct guess - award points
      const roundScore = calculateScore();
      setScore(prevScore => prevScore + roundScore);
      setRounds(prevRounds => prevRounds + 1);
      
      // Show result briefly before starting next round
      setGamePhase('idle');
      setTimeout(startNewRound, 2000);
    } else {
      // Incorrect guess - game over
      setGamePhase('gameOver');
    }
  }, [gamePhase, userGuess, originalPhrase, calculateScore, startNewRound]);

  // Restart the game after game over
  const restartGame = () => {
    setScore(0);
    setRounds(0);
    setGamePhase('idle');
    // Refetch embeddings for a fresh run
    (async () => {
      const vocab = Array.from(
        new Set(gamePhrases.flatMap(p => p.toLowerCase().split(' ')))
      );
      const embeds = await fetchEmbeddings(vocab);
      setFullEmbedding(embeds);
    })();
  };

  // Return to the main menu from practice mode
  const returnToMenu = () => {
    setGamePhase('idle');
    setPracticePhrase('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-4">Emojiphone</h1>
      <p className="text-center mb-6">
        The telephone game, but with emoji-based vector transformations!
      </p>
      
      {/* Game instructions and menu */}
      {gamePhase === 'idle' && Object.keys(fullEmbedding).length > 0 && (
        <div className="space-y-6">
          {/* Game mode */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Play Game:</h2>
            <ol className="list-decimal list-inside space-y-1 mb-4">
              <li>A phrase will travel through a circle of emojis</li>
              <li>Each emoji transforms the phrase using vector embeddings</li>
              <li>You'll see the final transformed phrase</li>
              <li>Your goal: Guess what the original phrase was</li>
              <li>Score points for correct guesses based on transformation distance</li>
            </ol>
            <button 
              onClick={startNewRound}
              className="w-full mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Game
            </button>
          </div>
          
          {/* Practice mode - "Send It" */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Practice: "Send It"</h2>
            <p className="mb-4">
              Enter your own phrase and see how it transforms through each emoji!
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={practicePhrase}
                onChange={(e) => setPracticePhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startPracticeMode()}
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter a phrase to transform..."
              />
              <button
                onClick={startPracticeMode}
                disabled={!practicePhrase.trim()}
                className={`w-full py-2 rounded-lg transition-colors ${
                  practicePhrase.trim() 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Send It!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Game loading indicator */}
      {gamePhase === 'idle' && Object.keys(fullEmbedding).length === 0 && (
        <div className="text-center py-8">
          <p>Loading game data...</p>
        </div>
      )}
      
      {/* Game board */}
      {gamePhase !== 'idle' && (
        <div className="space-y-4">
          {/* Score display (only shown in regular game mode, not practice) */}
          {gamePhase !== 'practice' && (
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-bold">
                Score: {score.toFixed(1)}
              </div>
              <div>
                Round: {rounds + 1}
              </div>
            </div>
          )}
          
          {/* Practice mode header */}
          {gamePhase === 'practice' && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Practice Mode: Send It</h2>
              <button
                onClick={returnToMenu}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Back to Menu
              </button>
            </div>
          )}
          
          {/* Emoji circle */}
          <EmojiCircle 
            emojis={EMOJIS}
            activeIndex={activeEmojiIndex}
            transformedPhrases={transformedPhrases}
            isAnimating={isAnimating}
            showAllPhrases={gamePhase === 'practice'} // Show all phrases in practice mode
          />
          
          {/* Original phrase (shown in practice mode after animation) */}
          {gamePhase === 'practice' && !isAnimating && (
            <div className="mt-6 space-y-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <p className="text-center text-lg font-semibold">Original Phrase:</p>
                <p className="text-center text-xl">{originalPhrase}</p>
              </div>
              
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <p className="text-center text-lg font-semibold">Final Transformation:</p>
                <p className="text-center text-xl">{finalPhrase}</p>
              </div>
              
              <button
                onClick={() => {
                  // Reset the needed states to try another phrase
                  setPracticePhrase('');
                  setTransformedPhrases([]);
                  setFinalPhrase('');
                  setOriginalPhrase('');
                  setActiveEmojiIndex(0);
                  
                  // Return to menu to enter a new phrase
                  setGamePhase('idle');
                }}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Another Phrase
              </button>
            </div>
          )}
          
          {/* Final phrase (shown after animation in regular game mode) */}
          {gamePhase === 'guessing' && (
            <div className="mt-6 space-y-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <p className="text-center text-lg font-semibold">Final Phrase:</p>
                <p className="text-center text-xl">{finalPhrase}</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Guess the original phrase:
                </label>
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Type your guess here..."
                  autoFocus
                />
                <button
                  onClick={submitGuess}
                  className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Submit Guess
                </button>
              </div>
            </div>
          )}
          
          {/* Game over screen */}
          {gamePhase === 'gameOver' && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
              <p className="mb-4">
                The original phrase was: <strong>{originalPhrase}</strong>
              </p>
              <p className="mb-4">
                Final Score: <strong>{score.toFixed(1)}</strong> points in {rounds} rounds
              </p>
              <button
                onClick={restartGame}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;