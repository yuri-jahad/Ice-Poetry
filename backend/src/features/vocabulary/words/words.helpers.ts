// words.helpers.ts
import type { WordDetails } from "@words/words.types";

/**
 * Processes and deduplicates words with tag merging
 */
export function processWords(
  wordsWithTags: WordDetails[]
): Map<string, string[]> {
  const validWordsMap = new Map<string, string[]>();

  wordsWithTags.forEach((wordWithTags) => {
    const cleanName = wordWithTags.name?.trim().toLowerCase();
    if (cleanName && cleanName.length > 0) {
      if (validWordsMap.has(cleanName)) {
        const existingTags = validWordsMap.get(cleanName)!;
        const mergedTags = [
          ...new Set([...existingTags, ...wordWithTags.tags]),
        ];
        validWordsMap.set(cleanName, mergedTags);
      } else {
        validWordsMap.set(cleanName, [...wordWithTags.tags]);
      }
    }
  });

  return validWordsMap;
}

/**
 * Filters out existing words from a processed words map
 */
export function filterNewWords(
  validWordsMap: Map<string, string[]>,
  existingWords: string[]
): Array<[string, string[]]> {
  const existingWordsSet = new Set(existingWords);
  return Array.from(validWordsMap.entries()).filter(
    ([wordName]) => !existingWordsSet.has(wordName)
  );
}

/**
 ** Extracts all 2-character and 3-character substrings (n-grams) from a word
 * Excludes words containing apostrophes or hyphens
 */
const INVALID_CHARS_REGEX = /['-]/;

export const cut = (word: string): Set<string> | null => {
  const len = word.length;

  if (INVALID_CHARS_REGEX.test(word)) return null;

  const syllables = new Set<string>();
  const wordLower = word.toLowerCase();

  // Boucle optimisée avec moins de conditions
  for (let i = 0, maxI = len - 1; i < maxI; i++) {
    // 2-gram
    syllables.add(wordLower.substring(i, i + 2));

    // 3-gram (condition simplifiée)
    if (i < len - 2) {
      syllables.add(wordLower.substring(i, i + 3));
    }
  }
  return syllables;
};

/**
 * Helper function to convert tags to database flags
 */
export function createTagFlags(tags: string[]) {
  const tagSet = new Set(tags);
  return {
    is_demonym: tagSet.has("is_demonym") ? 1 : 0,
    is_adverb: tagSet.has("is_adverb") ? 1 : 0,
    is_verb: tagSet.has("is_verb") ? 1 : 0,
    is_animal: tagSet.has("is_animal") ? 1 : 0,
  };
}

export function mapWordErrorToStatus(error: string): number {
  switch (error) {
    case "User not found":
      return 404;
    case "No valid words provided":
    case "Required fields missing":
    case "Invalid word data":
    case "Invalid tags":
    case "Invalid word ID":
    case "Invalid search parameters":
      return 400;
    case "Some words already exist":
    case "Cannot delete word with dependencies":
      return 409; 
    case "Word not found":
      return 404; 
    case "Search timeout": 
      return 408; 
    case "Database connection error":
    case "Update failed":
    case "Server error while adding words":
    case "Internal server error": // 
      return 500; 
    default:
      if (error.includes("duplicate") || error.includes("ER_DUP_ENTRY")) {
        return 409;
      }
      return 500;
  }
}