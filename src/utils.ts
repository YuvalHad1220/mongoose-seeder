
export const getRandomCount = (count: [number, number], seed?: number): number => {
  const [min, max] = count;

  if (min > max) {
      throw new Error("Invalid range: min cannot be greater than max");
  }

  // Use seeded random if a seed is provided, otherwise Math.random()
  const random = seed !== undefined ? seededRandom(seed) : Math.random();

  return Math.floor(random * (max - min + 1)) + min;
};

export function getReptitions(repetitions: number | (() => number)){
    if (typeof repetitions === "number")
      return repetitions;
    return repetitions()
  }

export function getRandomElement<T>(array: T[], seed?: number): T | undefined {
      if (array.length === 0) {
          return undefined; // Handle empty array case
      }
  
      // If a seed is provided, use a simple LCG for predictable randomness
      const random = seed !== undefined ? seededRandom(seed) : Math.random();
      const randomIndex = Math.floor(random * array.length);
  
      return array[randomIndex];
  }
  
  export function getRange<T>(defaultValues: [T, T], range?: [T, T]): [T, T]{
      if (range?.[0] !== undefined && range[1] !== undefined){
        return range;
      }
      return defaultValues;
  }

  // Simple LCG for seedable random number generation
  function seededRandom(seed: number): number {
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;

    seed = (seed * a + c) % m;
    return seed / m;
}
