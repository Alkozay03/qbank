/**
 * Generate a random welcome message for the dashboard
 * Changes on every page load. No database queries required.
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
 * Get a random welcome message on every page load
 * @param firstName - User's first name to insert into the message
 * @returns A welcome message with the user's name
 */
export function getRandomWelcomeMessage(firstName: string): string {
  // Pick a truly random message on every call
  const index = Math.floor(Math.random() * WELCOME_MESSAGES.length);
  
  // Replace [FirstName] with actual first name
  return WELCOME_MESSAGES[index].replace("[FirstName]", firstName);
}
