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

function App() {
  // Game state
  const [fullEmbedding, setFullEmbedding] = useState<TEmbedding>({});
  const [subsamples, setSubsamples] = useState<TEmbedding[]>([]);
  const [originalPhrase, setOriginalPhrase] = useState<string>('');
  const [finalPhrase, setFinalPhrase] = useState<string>('');
  const [transformedPhrases, setTransformedPhrases] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'idle' | 'animating' | 'guessing' | 'gameOver'>('idle');
  const [score, setScore] = useState<number>(0);
  const [rounds, setRounds] = useState<number>(0);
  const [userGuess, setUserGuess] = useState<string>('');
  const [activeEmojiIndex, setActiveEmojiIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

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

  // Start a new round
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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-4">Emojiphone</h1>
      <p className="text-center mb-6">
        The telephone game, but with emoji-based vector transformations!
      </p>
      
      {/* Game instructions */}
      {gamePhase === 'idle' && Object.keys(fullEmbedding).length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">How to Play:</h2>
          <ol className="list-decimal list-inside space-y-1">
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
          {/* Score display */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-bold">
              Score: {score.toFixed(1)}
            </div>
            <div>
              Round: {rounds + 1}
            </div>
          </div>
          
          {/* Emoji circle */}
          <EmojiCircle 
            emojis={EMOJIS}
            activeIndex={activeEmojiIndex}
            transformedPhrases={transformedPhrases}
            isAnimating={isAnimating}
          />
          
          {/* Final phrase (shown after animation) */}
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