export const GIT_MUTATION_COMMAND_PATTERNS = Object.freeze([
  /\bgit\s+commit\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+merge\b/i,
  /\bgit\s+rebase\b/i,
  /\bgit\s+reset\b/i,
  /\bgit\s+clean\b/i,
  /\bgit\s+checkout\b/i,
  /\bgit\s+switch\b/i,
  /\bgit\s+worktree\b/i,
  /\bgh\s+pr\s+merge\b/i,
]);

export function commandMatchesGitMutation(command) {
  return GIT_MUTATION_COMMAND_PATTERNS.some((pattern) => pattern.test(String(command ?? "")));
}
