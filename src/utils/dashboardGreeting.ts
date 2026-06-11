/**
 * Warm, varied dashboard greetings — not tied to time-of-day "Good morning".
 */

const HEART_GREETINGS: Array<(firstName: string) => string> = [
  (n) => `Hey ${n}, we're so glad you're here ❤️`,
  (n) => `${n}, your learning journey matters 💛`,
  (n) => `Welcome back, ${n} — let's make today count ❤️`,
  (n) => `Hi ${n}! Ready to grow a little more today? 💛`,
  (n) => `${n}, every step you take counts ❤️`,
  (n) => `Good to see you, ${n} — you've got this 💛`,
  (n) => `${n}, learning looks great on you ❤️`,
  (n) => `Hey ${n}, let's learn something awesome today 💛`,
];

export function firstNameFrom(fullName?: string | null): string {
  const raw = fullName?.trim() || 'Friend';
  return raw.split(/\s+/)[0] || 'Friend';
}

/** Stable pick for the day — same message all day, rotates daily. */
export function getDashboardHeartGreeting(fullName?: string | null, date = new Date()): string {
  const first = firstNameFrom(fullName);
  const seed = date.getFullYear() * 366 + date.getMonth() * 31 + date.getDate();
  return HEART_GREETINGS[seed % HEART_GREETINGS.length](first);
}
