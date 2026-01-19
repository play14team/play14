export function deduplicate<T>(...arrays: T[][]) {
  return [...new Set(arrays.flat())]
}

export function deduplicateBy<T>(
  getKey: (item: T) => string | number | null | undefined,
  ...arrays: T[][]
): T[] {
  const seen = new Set<string | number>()
  const result: T[] = []

  for (const item of arrays.flat()) {
    const key = getKey(item)

    if (key === null || key === undefined) {
      result.push(item)
      continue
    }

    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

/**
 * Shuffles an array using the Fisher-Yates algorithm
 * @param array - The array to shuffle
 * @returns A new shuffled array (original array is not modified)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
