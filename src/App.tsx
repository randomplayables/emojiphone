import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import EmojiCircle from './components/EmojiCircle';
import { 
  cosineSimilarity, 
  TEmbedding, 
  PhraseTransformation,
  TransformationSettings,
  UserPerformance,
  GameSession
} from './types';
import { fetchEmbeddings } from './utils/openaiEmbeddings';
import { gamePhrases } from './data/gamePhrases';
import { subsampleEmbedding } from './utils/embeddings';

// Game config
const DEFAULT_NUM_EMOJIS = 6; // Default number of emojis
const MAX_NUM_EMOJIS = 12; // Maximum number of emojis allowed
const MIN_NUM_EMOJIS = 3; // Minimum number of emojis allowed
const DEFAULT_VOCAB_PERCENTAGE = 60; // Default: use 60% of available vocabulary

// Emoji set (extended to support the maximum number)
const EMOJIS = ['😀', '🎮', '🚀', '🧠', '🤖', '🎯', '🌈', '🔥', '💎', '🍕', '🎸', '🏆'];

// Game phases
type GamePhase = 'idle' | 'animating' | 'guessing' | 'gameOver' | 'practice' | 'correct';

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
  
  // Practice mode
  const [practicePhrase, setPracticePhrase] = useState<string>('');
  
  // Game settings
  const [numEmojis, setNumEmojis] = useState<number>(DEFAULT_NUM_EMOJIS);
  const [vocabPercentage, setVocabPercentage] = useState<number>(DEFAULT_VOCAB_PERCENTAGE);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // New state for scientific data collection
  const [gameSession, setGameSession] = useState<GameSession>({
    transformations: [],
    userPerformances: [],
    sessionStart: Date.now(),
    sessionId: Math.random().toString(36).substring(2, 15)
  });
  
  // Refs for timing measurements
  const guessStartTimeRef = useRef<number>(0);
  const transformationStartTimeRef = useRef<number>(0);
  const semanticDistancesRef = useRef<number[]>([]);

  // Fetch real embeddings for our entire vocabulary on mount
  useEffect(() => {
    const load = async () => {
      try {
        // Load the enhanced corpus with both external words and game phrases
        const { loadEnhancedCorpus } = await import('./utils/corpus');
        const allWords = await loadEnhancedCorpus();
        
        console.log(`Fetching embeddings for ${allWords.length} words...`);
        
        // Get embeddings in reasonable-sized batches to avoid API limits
        const BATCH_SIZE = 1000;
        let embeds: TEmbedding = {};
        
        for (let i = 0; i < allWords.length; i += BATCH_SIZE) {
          const batch = allWords.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(allWords.length/BATCH_SIZE)}`);
          
          const batchEmbeds = await fetchEmbeddings(batch);
          embeds = { ...embeds, ...batchEmbeds };
        }
        
        setFullEmbedding(embeds);
        console.log(`Loaded embeddings for ${Object.keys(embeds).length} words`);
      } catch (error) {
        console.error("Error loading corpus or embeddings:", error);
        
        // Fallback to just game phrases if corpus loading fails
        const vocab = Array.from(
          new Set(gamePhrases.flatMap(p => p.toLowerCase().split(' ')))
        );
        const embeds = await fetchEmbeddings(vocab);
        setFullEmbedding(embeds);
      }
    };
    
    load();
  }, []);

  // Generate subsamples whenever the full embedding, vocab percentage, or number of emojis changes
  useEffect(() => {
    if (Object.keys(fullEmbedding).length === 0) return;
    
    // Calculate the actual subsample size based on percentage
    const totalVocabSize = Object.keys(fullEmbedding).length;
    const subsampleSize = Math.max(
      5, // Minimum 5 words to avoid extreme transformations
      Math.round(vocabPercentage * totalVocabSize / 100)
    );
    
    console.log(`Generating vocabularies: ${subsampleSize} words per emoji (${vocabPercentage}% of ${totalVocabSize} total words)`);
    console.log(`Number of emojis: ${numEmojis}`);
    
    // Generate a subsample for each emoji
    const samples = Array.from({ length: numEmojis }).map(() => 
      subsampleEmbedding(fullEmbedding, subsampleSize)
    );
    setSubsamples(samples);
  }, [fullEmbedding, vocabPercentage, numEmojis]);

  // Function to calculate semantic distances between phrases
  const calculateSemanticDistances = useCallback((originalPhrase: string, transformedPhrases: string[]): number[] => {
    if (!originalPhrase || transformedPhrases.length === 0 || Object.keys(fullEmbedding).length === 0) {
      return [];
    }

    const distances: number[] = [];
    
    // For each transformed phrase, calculate distance from original
    transformedPhrases.forEach(phrase => {
      const origWords = originalPhrase.toLowerCase().split(' ');
      const transWords = phrase.toLowerCase().split(' ');
      
      let totalDistance = 0;
      const maxLength = Math.max(origWords.length, transWords.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (i >= origWords.length || i >= transWords.length) {
          // Penalize different lengths
          totalDistance += 1;
          continue;
        }
        
        const origWord = origWords[i];
        const transWord = transWords[i];
        
        if (origWord === transWord) {
          // No distance for identical words
          continue;
        }
        
        // If we have embeddings for both words, compute cosine distance
        if (fullEmbedding[origWord] && fullEmbedding[transWord]) {
          const similarity = cosineSimilarity(fullEmbedding[origWord], fullEmbedding[transWord]);
          totalDistance += (1 - similarity); // Convert similarity to distance
        } else {
          // Default penalty for unknown words
          totalDistance += 1;
        }
      }
      
      // Normalize by number of words for consistency
      const normalizedDistance = totalDistance / maxLength;
      distances.push(normalizedDistance);
    });
    
    return distances;
  }, [fullEmbedding]);

  // Enhanced version of passPhraseThroughEmojis
  const passPhraseThroughEmojis = useCallback((phrase: string) => {
    if (subsamples.length === 0) return { 
      transformedPhrases: [], 
      finalPhrase: phrase, 
      semanticDistances: [] 
    };
    
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
    
    // Calculate semantic distances for each transformation step
    const semanticDistances = calculateSemanticDistances(phrase, allPhrases);
    
    return { 
      transformedPhrases: allPhrases, 
      finalPhrase: currentPhrase,
      semanticDistances
    };
  }, [fullEmbedding, subsamples, calculateSemanticDistances]);

  // Start a new game round with scientific data collection
  const startNewRound = useCallback(() => {
    if (Object.keys(fullEmbedding).length === 0 || subsamples.length === 0) {
      return; // Game not ready yet
    }
    
    // Record when transformation started
    transformationStartTimeRef.current = Date.now();
    
    // Select a random phrase
    const phrase = gamePhrases[Math.floor(Math.random() * gamePhrases.length)];
    setOriginalPhrase(phrase);
    
    // Process phrase through emoji subsamples
    const { transformedPhrases, finalPhrase, semanticDistances } = passPhraseThroughEmojis(phrase);

    // Store semantic distances for later
    semanticDistancesRef.current = semanticDistances;

    // Development logs: original and intermediate phrases
    console.log('Original phrase:', phrase);
    console.log('Transformed phrases:', transformedPhrases);
    
    // Set up game state
    setTransformedPhrases(transformedPhrases);
    setFinalPhrase(finalPhrase);
    setGamePhase('animating');
    setIsAnimating(true);
    setActiveEmojiIndex(0);
    setUserGuess('');
    
    // Create transformation settings data
    const transformationSettings: TransformationSettings = {
      numEmojis,
      vocabPercentage,
      vocabSize: Object.keys(fullEmbedding).length,
      wordsPerEmoji: Math.round(vocabPercentage * Object.keys(fullEmbedding).length / 100)
    };
    
    // Create phrase transformation data
    const phraseTransformation: PhraseTransformation = {
      originalPhrase: phrase,
      transformedPhrases,
      finalPhrase,
      transformationSettings,
      semanticDistances,
      timestamp: Date.now()
    };
    
    // Add to game session data
    setGameSession(prev => ({
      ...prev,
      transformations: [...prev.transformations, phraseTransformation]
    }));
    
    // Log the transformation data for scientific collection
    console.log('Scientific Data - Phrase Transformation:', phraseTransformation);
    
    // After animation completes, move to guessing phase
    setTimeout(() => {
      setIsAnimating(false);
      setGamePhase('guessing');
      
      // Record when guessing started
      guessStartTimeRef.current = Date.now();
    }, (numEmojis + 1) * 1000); // Animation time plus a buffer
  }, [fullEmbedding, subsamples, passPhraseThroughEmojis, numEmojis, vocabPercentage]);

  // Enhanced practice mode
  const startPracticeMode = useCallback(() => {
    if (Object.keys(fullEmbedding).length === 0 || subsamples.length === 0 || !practicePhrase.trim()) {
      return; // Not ready or no phrase entered
    }
    
    // Record when transformation started
    transformationStartTimeRef.current = Date.now();
    
    // Process the user's phrase through emoji subsamples
    const { transformedPhrases, finalPhrase, semanticDistances } = passPhraseThroughEmojis(practicePhrase);
    
    // Store semantic distances
    semanticDistancesRef.current = semanticDistances;
    
    console.log('Practice phrase:', practicePhrase);
    console.log('Transformed practice phrases:', transformedPhrases);
    
    // Set up game state
    setOriginalPhrase(practicePhrase);
    setTransformedPhrases(transformedPhrases);
    setFinalPhrase(finalPhrase);
    setGamePhase('practice');
    setIsAnimating(true);
    setActiveEmojiIndex(0);
    
    // Create transformation settings data
    const transformationSettings: TransformationSettings = {
      numEmojis,
      vocabPercentage,
      vocabSize: Object.keys(fullEmbedding).length,
      wordsPerEmoji: Math.round(vocabPercentage * Object.keys(fullEmbedding).length / 100)
    };
    
    // Create phrase transformation data
    const phraseTransformation: PhraseTransformation = {
      originalPhrase: practicePhrase,
      transformedPhrases,
      finalPhrase,
      transformationSettings,
      semanticDistances,
      timestamp: Date.now()
    };
    
    // Add to game session data
    setGameSession(prev => ({
      ...prev,
      transformations: [...prev.transformations, phraseTransformation]
    }));
    
    // Log the transformation data for scientific collection
    console.log('Scientific Data - Practice Transformation:', phraseTransformation);
    
    // After animation completes, stop animating but stay in practice mode
    setTimeout(() => {
      setIsAnimating(false);
      // Show all emojis as active to display their transformations
      setActiveEmojiIndex(numEmojis - 1);
    }, (numEmojis + 1) * 1000); // Animation time plus a buffer
  }, [fullEmbedding, subsamples, practicePhrase, passPhraseThroughEmojis, numEmojis, vocabPercentage]);

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

  // Enhanced submit guess
  const submitGuess = useCallback(() => {
    if (gamePhase !== 'guessing') return;
    
    const guessEndTime = Date.now();
    const timeToGuess = guessEndTime - guessStartTimeRef.current;
    
    // Get overall semantic distance (last element if available)
    const semanticDistance = semanticDistancesRef.current.length > 0 
      ? semanticDistancesRef.current[semanticDistancesRef.current.length - 1] 
      : 0;
    
    // Check if guess matches the original phrase (case-insensitive)
    const isCorrect = userGuess.toLowerCase() === originalPhrase.toLowerCase();
    
    if (isCorrect) {
      // Correct guess - award points
      const roundScore = calculateScore();
      setScore(prevScore => prevScore + roundScore);
      setRounds(prevRounds => prevRounds + 1);
      
      // Create user performance data
      const userPerformance: UserPerformance = {
        originalPhrase,
        finalPhrase,
        userGuess,
        isCorrect: true,
        score: roundScore,
        semanticDistance,
        timeToGuess,
        timestamp: Date.now()
      };
      
      // Add to game session data
      setGameSession(prev => ({
        ...prev,
        userPerformances: [...prev.userPerformances, userPerformance]
      }));
      
      // Log the performance data for scientific collection
      console.log('Scientific Data - User Performance (Correct):', userPerformance);
      
      // Show success screen before starting next round
      setGamePhase('correct');
      setTimeout(startNewRound, 2000);
    } else {
      // Incorrect guess - game over
      const userPerformance: UserPerformance = {
        originalPhrase,
        finalPhrase,
        userGuess,
        isCorrect: false,
        score: 0,
        semanticDistance,
        timeToGuess,
        timestamp: Date.now()
      };
      
      // Add to game session data
      setGameSession(prev => ({
        ...prev,
        userPerformances: [...prev.userPerformances, userPerformance]
      }));
      
      // Log the performance data for scientific collection
      console.log('Scientific Data - User Performance (Incorrect):', userPerformance);
      
      setGamePhase('gameOver');
    }
  }, [gamePhase, userGuess, originalPhrase, finalPhrase, calculateScore, startNewRound]);

  // Restart the game after game over
  const restartGame = useCallback(() => {
    // Log full session data before resetting
    console.log('Scientific Data - Complete Game Session:', gameSession);
    
    setScore(0);
    setRounds(0);
    setGamePhase('idle');
    
    // Create new session
    setGameSession({
      transformations: [],
      userPerformances: [],
      sessionStart: Date.now(),
      sessionId: Math.random().toString(36).substring(2, 15)
    });
    
    // Refetch embeddings for a fresh run
    (async () => {
      try {
        // Use the same enhanced corpus approach as the initial load
        const { loadEnhancedCorpus } = await import('./utils/corpus');
        const allWords = await loadEnhancedCorpus();
        
        console.log(`Reloading embeddings for ${allWords.length} words...`);
        
        // Get embeddings in batches to avoid API limits
        const BATCH_SIZE = 1000;
        let embeds: TEmbedding = {};
        
        for (let i = 0; i < allWords.length; i += BATCH_SIZE) {
          const batch = allWords.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(allWords.length/BATCH_SIZE)}`);
          
          const batchEmbeds = await fetchEmbeddings(batch);
          embeds = { ...embeds, ...batchEmbeds };
        }
        
        setFullEmbedding(embeds);
        console.log(`Reloaded embeddings for ${Object.keys(embeds).length} words`);
      } catch (error) {
        console.error("Error reloading corpus or embeddings:", error);
        
        // Fallback to just game phrases if corpus loading fails
        const vocab = Array.from(
          new Set(gamePhrases.flatMap(p => p.toLowerCase().split(' ')))
        );
        const embeds = await fetchEmbeddings(vocab);
        setFullEmbedding(embeds);
      }
    })();
  }, [gameSession]);

  // Return to the main menu from practice mode
  const returnToMenu = useCallback(() => {
    setGamePhase('idle');
    setPracticePhrase('');
  }, []);

  // Handle vocab percentage change
  const handleVocabChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(100, Math.max(1, parseInt(e.target.value) || DEFAULT_VOCAB_PERCENTAGE));
    setVocabPercentage(value);
  }, []);

  // Toggle settings
  const toggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings]);

  // On component unmount or when user navigates away, log final data
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Scientific Data - Final Game Session on Exit:', gameSession);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('Scientific Data - Final Game Session on Unmount:', gameSession);
    };
  }, [gameSession]);

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
            
            {/* Transformation settings */}
            <div className="mb-4">
              <button
                onClick={toggleSettings}
                className="text-sm text-blue-500 hover:underline flex items-center mb-2"
              >
                {showSettings ? '- Hide Game Settings' : '+ Show Game Settings'}
              </button>
              
              {showSettings && (
                <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  {/* Emoji Count Slider */}
                  <div className="mb-4 border-b pb-3 border-gray-300 dark:border-gray-600">
                    <label className="block text-sm font-medium mb-1">
                      Number of Emojis: {numEmojis}
                    </label>
                    <div className="px-2">
                      <input
                        type="range"
                        min={MIN_NUM_EMOJIS}
                        max={MAX_NUM_EMOJIS}
                        value={numEmojis}
                        onChange={(e) => setNumEmojis(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-gray-600 dark:text-gray-400">
                      <span>Fewer transformations</span>
                      <span>More transformations</span>
                    </div>
                    
                    <div className="mt-2 text-xs">
                      <div>More emojis = more transformation steps</div>
                      <div>Each emoji transforms the phrase using different vocabulary</div>
                    </div>
                  </div>
                  
                  {/* Vocabulary Percentage Slider */}
                  <label className="block text-sm font-medium mb-1">
                    Vocabulary Percentage: {vocabPercentage}%
                  </label>
                  <div className="px-2">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={vocabPercentage}
                      onChange={handleVocabChange}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-gray-600 dark:text-gray-400">
                    <span>More changes</span>
                    <span>Fewer changes</span>
                  </div>
                  
                  <div className="mt-3 text-sm">
                    {vocabPercentage <= 55 && (
                      <div className="px-2 py-1 bg-red-100 dark:bg-red-900 rounded text-red-700 dark:text-red-200">
                        Hard: Phrases transform dramatically - challenging to guess
                      </div>
                    )}
                    {vocabPercentage > 55 && vocabPercentage <= 80 && (
                      <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded text-yellow-700 dark:text-yellow-200">
                        Medium: Balanced transformation - moderate challenge
                      </div>
                    )}
                    {vocabPercentage > 80 && (
                      <div className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-green-700 dark:text-green-200">
                        Easy: Phrases change less - easier to guess
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs">
                    <div>Total words in vocabulary: {Object.keys(fullEmbedding).length}</div>
                    <div>Words per emoji: {Math.round(vocabPercentage * Object.keys(fullEmbedding).length / 100)}</div>
                  </div>
                </div>
              )}
            </div>
            
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
              <div className="input-container relative">
                <input
                  type="text"
                  value={practicePhrase}
                  onChange={(e) => setPracticePhrase(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startPracticeMode()}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter a phrase to transform..."
                />
              </div>
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
            emojis={EMOJIS.slice(0, numEmojis)}
            activeIndex={activeEmojiIndex}
            transformedPhrases={transformedPhrases}
            isAnimating={isAnimating}
            showAllPhrases={gamePhase === 'practice'} // Show all phrases in practice mode
          />
          
          {/* Original phrase (shown in practice mode after animation) */}
          {gamePhase === 'practice' && !isAnimating && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-teal-50 dark:bg-teal-900 rounded-lg border-l-4 border-teal-400">
                <p className="text-center text-lg font-semibold text-teal-800 dark:text-teal-200">Original Phrase:</p>
                <p className="text-center text-xl text-teal-900 dark:text-teal-100">{originalPhrase}</p>
              </div>
              
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900 rounded-lg border-l-4 border-indigo-400">
                <p className="text-center text-lg font-semibold text-indigo-800 dark:text-indigo-200">Final Transformation:</p>
                <p className="text-center text-xl text-indigo-900 dark:text-indigo-100">{finalPhrase}</p>
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
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Another Phrase
              </button>
            </div>
          )}
          
          {/* Correct guess screen */}
          {gamePhase === 'correct' && (
            <div className="mt-6 p-4 bg-green-100 dark:bg-green-900 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-2 text-green-800 dark:text-green-200">Correct!</h2>
              <p className="mb-2 text-green-700 dark:text-green-300">
                Well done! Loading next round...
              </p>
              <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                Score: {score.toFixed(1)}
              </p>
            </div>
          )}
          
          {/* Final phrase (shown after animation in regular game mode) */}
          {gamePhase === 'guessing' && (
            <div className="mt-6 space-y-4">
              <div className="final-phrase p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <p className="text-center text-lg font-semibold text-yellow-800 dark:text-yellow-200">Final Phrase:</p>
                <p className="text-center text-xl text-yellow-900 dark:text-yellow-100">{finalPhrase}</p>
              </div>
              
              <div className="guess-container space-y-3">
                <label className="block text-sm font-medium">
                  Guess the original phrase:
                </label>
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                  className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Type your guess here..."
                  autoFocus
                />
                <button
                  onClick={submitGuess}
                  className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Submit Guess
                </button>
              </div>
            </div>
          )}
          
          {/* Game over screen */}
          {gamePhase === 'gameOver' && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">Game Over!</h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                The original phrase was: <strong className="text-gray-900 dark:text-white">{originalPhrase}</strong>
              </p>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Final Score: <strong className="text-gray-900 dark:text-white">{score.toFixed(1)}</strong> points in {rounds} rounds
              </p>
              <button
                onClick={restartGame}
                className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors"
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