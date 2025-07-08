/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j += 1) {
      matrix[j][0] = j;
    }
    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    return matrix[b.length][a.length];
  }
  
  /**
   * Calculates the similarity percentage between two strings.
   * @returns A value between 0 and 100.
   */
  export function calculateStringSimilarity(a: string, b: string): number {
    const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 100; // Both are empty
    const similarity = (1 - distance / maxLength) * 100;
    return similarity;
  }