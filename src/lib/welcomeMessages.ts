/**
 * Generate a random welcome message for the dashboard
 * Uses date-based seeding so the message stays consistent throughout the day
 * but changes daily. No database queries required.
 */

const WELCOME_MESSAGES = [
  "Exam-day panic prevention starts here, [FirstName].",
  "Still cramming, [FirstName]? Same.",
  "Welcome to your new coping mechanism, [FirstName].",
  "Hope you brought caffeine, [FirstName].",
  "You'll forget this tomorrow anyway, [FirstName].",
  "One more question won't help, [FirstName].",
  "You should've started earlier, [FirstName].",
];

/**
 * Simple seeded random number generator
 * Uses the current date as seed so it's consistent throughout the day
 */
function getSeededRandom(seed: number): number {
  // Better seeded random using multiple iterations
  let value = seed;
  value = ((value * 9301) + 49297) % 233280;
  return value / 233280;
}

/**
 * Get a random welcome message that stays consistent for the day
 * @param firstName - User's first name to insert into the message
 * @returns A welcome message with the user's name
 */
export function getDailyWelcomeMessage(firstName: string): string {
  // Use current date (YYYYMMDD) as seed so message is consistent all day
  const today = new Date();
  // Add some variation to the seed by multiplying year and adding month/day differently
  const seed = (today.getFullYear() * 372) + (today.getMonth() * 31) + today.getDate();
  
  // Generate random index based on seed
  const randomValue = getSeededRandom(seed);
  const index = Math.floor(randomValue * WELCOME_MESSAGES.length);
  
  // Replace [FirstName] with actual first name
  return WELCOME_MESSAGES[index].replace("[FirstName]", firstName);
}
