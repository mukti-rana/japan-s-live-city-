// Turns the auth provider's error text into something a visitor can act on.
// Unknown messages are shown as the provider wrote them (they are already
// plain sentences) — never anything technical like a stack trace.
const MAP: [RegExp, string][] = [
  [/invalid login credentials|invalid credentials/i, "That email or password isn't right. Please check them and try again."],
  [/email not confirmed|not confirmed/i, "Please confirm your email first — check your inbox for the link we sent."],
  [/already registered|already been registered|already exists/i, "An account with this email already exists. Try signing in instead."],
  [/at least \d+ characters|password should be|weak password/i, "Choose a longer password — at least 6 characters."],
  [/rate limit|too many requests|security purposes/i, "Too many attempts. Please wait a minute and try again."],
  [/valid email|invalid email|unable to validate email/i, "Please enter a valid email address."],
  [/could not authenticate/i, "We couldn't sign you in. Please try again."],
];

export function friendlyAuthError(raw: string): string {
  const text = raw.slice(0, 300);
  return MAP.find(([re]) => re.test(text))?.[1] ?? text;
}
