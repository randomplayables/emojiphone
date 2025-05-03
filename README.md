# Emojiphone

## Overview

Emojiphone is a word transformation game inspired by the classic telephone game, but with a mathematical twist using vector embeddings and subsampling.

## How It Works

1. **Vector Transformations:** The game uses word embeddings (semantic vector representations of words) to transform phrases as they pass through emoji filters.

2. **Telephone Effect:** Each emoji has a limited vocabulary, forcing words to transform into their closest semantic neighbors within that vocabulary.

3. **Scientific Collection:** The game collects data on semantic drift and human ability to reconstruct original meaning.

## Game Modes

### Regular Game Mode
- A famous quote or phrase passes through a series of emoji filters
- Each emoji transforms the phrase based on its limited vocabulary
- You see the final transformed phrase and must guess the original
- Score points for correct guesses - harder transformations earn more points

### "Send It" Practice Mode
- Enter your own phrase and watch how it transforms
- See the step-by-step transformation through each emoji
- Great for understanding how the transformation process works

## Gameplay Settings

Customize your experience with adjustable settings:

- **Number of Emojis:** More emojis mean more transformation steps and greater semantic drift
- **Vocabulary Percentage:** Controls how restricted each emoji's vocabulary is:
  - Low percentage (1-55%): Dramatic transformations, very challenging
  - Medium percentage (56-80%): Balanced transformations, moderate challenge
  - High percentage (81-100%): Subtle transformations, easier guessing

## Technical Features

- Uses OpenAI's embedding model for semantic word representations
- Implements cosine similarity for finding nearest word neighbors
- Collects scientific data on semantic transformations for research

## Development

This game was built using:
- React
- TypeScript
- Vite

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

randomplayables@proton.me
