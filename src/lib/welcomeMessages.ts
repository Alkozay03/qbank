/**
 * Generate a random welcome message for the dashboard
 * Changes on every page load. Uses weighted randomization to reduce immediate repeats.
 * No database queries required.
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

// Store last shown index using timestamp-based memory (resets on server restart)
let lastShownIndex = -1;
let lastShownTime = 0;

/**
 * Get a random welcome message on every page load
 * Uses weighted randomization to avoid showing the same message consecutively
 * @param firstName - User's first name to insert into the message
 * @returns A welcome message with the user's name
 */
export function getRandomWelcomeMessage(firstName: string): string {
  const now = Date.now();
  
  // If last message was shown within 5 seconds, try to avoid repeating it
  const avoidRepeat = (now - lastShownTime) < 5000 && lastShownIndex !== -1;
  
  let index: number;
  
  if (avoidRepeat && WELCOME_MESSAGES.length > 1) {
    // Pick from all messages except the last one shown
    const availableIndices = WELCOME_MESSAGES
      .map((_, i) => i)
      .filter(i => i !== lastShownIndex);
    
    index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  } else {
    // Pick any message randomly
    index = Math.floor(Math.random() * WELCOME_MESSAGES.length);
  }
  
  // Remember this choice
  lastShownIndex = index;
  lastShownTime = now;
  
  // Replace [FirstName] with actual first name
  return WELCOME_MESSAGES[index].replace("[FirstName]", firstName);
}
