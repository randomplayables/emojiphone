// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

// import React, { useState, useEffect } from 'react'
// import { fullEmbedding, subsampleEmbedding } from './utils/embeddings'
// import { cosineSimilarity } from './types'
// import EmojiCircle from './components/EmojiCircle'

// const NUM_EMOJIS = 6
// const SUBSAMPLE_SIZE = 100 // adjust for difficulty

// const randomPhrases = [
//   'hello world',
//   'react is fun',
//   'emojiphone game',
//   // ... more phrases
// ]

// function App() {
//   const [phrase, setPhrase] = useState<string>('')
//   const [displayedPhrase, setDisplayedPhrase] = useState<string>('')
//   const [embeddings, setEmbeddings] = useState<TEmbedding[]>([])
//   const [round, setRound] = useState(0)
//   const [score, setScore] = useState<number[]>([])

//   useEffect(() => {
//     // Pre-generate subsamples for each emoji in the circle
//     const subs = Array.from({ length: NUM_EMOJIS }).map(() =>
//       subsampleEmbedding(fullEmbedding, SUBSAMPLE_SIZE)
//     )
//     setEmbeddings(subs)
//   }, [])

//   const startRound = () => {
//     const p = randomPhrases[Math.floor(Math.random() * randomPhrases.length)]
//     setPhrase(p)
//     let current = p.split(' ')
//     embeddings.forEach(sub => {
//       current = current.map(word => {
//         const vec = fullEmbedding[word] || [0]
//         // find closest word in sub
//         let best = word
//         let bestSim = -1
//         for (const [w, v] of Object.entries(sub)) {
//           const sim = cosineSimilarity(vec, v)
//           if (sim > bestSim) {
//             bestSim = sim
//             best = w
//           }
//         }
//         return best
//       })
//     })
//     setDisplayedPhrase(current.join(' '))
//     setRound(r => r + 1)
//   }

//   const handleGuess = (guess: string) => {
//     if (guess === phrase) {
//       // compute distance in full embedding
//       const dist = phrase
//         .split(' ')
//         .reduce((sum, w, i) => {
//           const v1 = fullEmbedding[w] || [0]
//           const v2 = fullEmbedding[displayedPhrase.split(' ')[i]] || [0]
//           return sum + (1 - cosineSimilarity(v1, v2))
//         }, 0)
//       setScore(prev => [...prev, dist])
//     } else {
//       alert('Wrong! Game Over')
//     }
//   }

//   return (
//     <div className="p-4 max-w-xl mx-auto">
//       <h1 className="text-2xl font-bold">Emojiphone</h1>
//       <button onClick={startRound} className="mt-4 px-3 py-1 bg-blue-500 text-white rounded">
//         Start Round
//       </button>

//       {round > 0 && (
//         <div className="mt-4">
//           <p>Secret: {displayedPhrase}</p>
//           <input
//             type="text"
//             placeholder="Your guess"
//             onKeyDown={e => {
//               if (e.key === 'Enter') handleGuess((e.target as HTMLInputElement).value)
//             }}
//             className="border p-1 w-full"
//           />
//           <p className="mt-2">Score: {score.reduce((a, b) => a + b, 0).toFixed(2)}</p>
//         </div>
//       )}
//     </div>
//   )
// }

// export default App

// import React, { useState, useEffect } from 'react'
import { useState, useEffect } from 'react'
import { fullEmbedding, subsampleEmbedding } from './utils/embeddings'
import { cosineSimilarity } from './types'
import EmojiCircle from './components/EmojiCircle'

const NUM_EMOJIS = 6
const SUBSAMPLE_SIZE = 100 // adjust for difficulty

const randomPhrases = [
  'hello world',
  'react is fun',
  'emojiphone game',
  // ... more phrases
]

function App() {
  const [phrase, setPhrase] = useState<string>('')
  const [displayedPhrase, setDisplayedPhrase] = useState<string>('')
  const [embeddings, setEmbeddings] = useState<any[]>([])
  const [round, setRound] = useState(0)
  const [score, setScore] = useState<number[]>([])

  useEffect(() => {
    // Pre-generate subsamples for each emoji in the circle
    const subs = Array.from({ length: NUM_EMOJIS }).map(() =>
      subsampleEmbedding(fullEmbedding, SUBSAMPLE_SIZE)
    )
    setEmbeddings(subs)
  }, [])

  const startRound = () => {
    const p = randomPhrases[Math.floor(Math.random() * randomPhrases.length)]
    setPhrase(p)
    let current = p.split(' ')
    embeddings.forEach(sub => {
      current = current.map(word => {
        const vec = fullEmbedding[word] || new Array(Object.values(fullEmbedding)[0].length).fill(0)
        // find closest word in sub
        let best = word
        let bestSim = -Infinity
        Object.entries(sub).forEach(([w, v]) => {
          const sim = cosineSimilarity(vec, v as number[])
          if (sim > bestSim) {
            bestSim = sim
            best = w
          }
        })
        return best
      })
    })
    setDisplayedPhrase(current.join(' '))
    setRound(r => r + 1)
  }

  const handleGuess = (guess: string) => {
    if (guess === phrase) {
      const dist = phrase.split(' ').reduce((sum, w, i) => {
        const original = fullEmbedding[w] || new Array(Object.values(fullEmbedding)[0].length).fill(0)
        const transformed = fullEmbedding[displayedPhrase.split(' ')[i]] || new Array(Object.values(fullEmbedding)[0].length).fill(0)
        return sum + (1 - cosineSimilarity(original, transformed))
      }, 0)
      setScore(prev => [...prev, dist])
    } else {
      alert('Wrong! Game Over')
      // TODO: trigger game-over state and reset
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Emojiphone</h1>
      <button
        onClick={startRound}
        disabled={embeddings.length === 0}
        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Start Round
      </button>

      {round > 0 && (
        <div className="mt-4 space-y-2">
          <p><strong>Secret:</strong> {displayedPhrase}</p>
          <input
            type="text"
            placeholder="Your guess"
            onKeyDown={e => {
              if (e.key === 'Enter') handleGuess((e.target as HTMLInputElement).value)
            }}
            className="border p-1 w-full"
          />
          <p><strong>Score:</strong> {score.reduce((a, b) => a + b, 0).toFixed(2)}</p>
        </div>
      )}

      <EmojiCircle />
    </div>
  )
}

export default App
