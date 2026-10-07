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

const GIT_MUTATION_SUBCOMMANDS = new Set([
  "commit",
  "push",
  "merge",
  "rebase",
  "reset",
  "clean",
  "checkout",
  "switch",
  "worktree",
]);

// Git global options that consume the following token as their value.
const GIT_OPTIONS_WITH_VALUE = new Set(["-c", "-C", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env", "--super-prefix"]);

const SHELL_SEPARATORS = new Set("&|;<>\n\r");
const ALWAYS_CONTROL = new Set("\u0060$%");

export function commandMatchesGitMutation(command) {
  const text = String(command ?? "");
  if (GIT_MUTATION_COMMAND_PATTERNS.some((pattern) => pattern.test(text))) return true;
  const tokens = tokenizeCommand(text);
  for (let index = 0; index < tokens.length; index += 1) {
    const name = executableName(tokens[index]);
    if (name === "git" && gitSubcommandIsMutation(tokens, index + 1)) return true;
    if (name === "gh" && tokens[index + 1]?.toLowerCase() === "pr" && tokens[index + 2]?.toLowerCase() === "merge") return true;
  }
  return false;
}

export function commandUsesShellControlSyntax(command) {
  const text = String(command ?? "");
  let quote = null;
  for (const character of text) {
    if (quote) {
      if (character === quote) quote = null;
      else if (ALWAYS_CONTROL.has(character)) return true;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (SHELL_SEPARATORS.has(character) || character === "^" || ALWAYS_CONTROL.has(character)) return true;
  }
  return false;
}

function gitSubcommandIsMutation(tokens, start) {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (GIT_OPTIONS_WITH_VALUE.has(token)) {
      index += 1;
      continue;
    }
    if (token.startsWith("-")) continue;
    return GIT_MUTATION_SUBCOMMANDS.has(token.toLowerCase());
  }
  return false;
}

function executableName(token) {
  const base = String(token ?? "").split(/[\\/]/).pop().toLowerCase();
  return base.replace(/\.(exe|cmd|bat|com)$/, "");
}

function tokenizeCommand(text) {
  const tokens = [];
  let current = "";
  let quote = null;
  let hasToken = false;
  for (const character of text) {
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      hasToken = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (hasToken) tokens.push(current);
      current = "";
      hasToken = false;
      continue;
    }
    current += character;
    hasToken = true;
  }
  if (hasToken) tokens.push(current);
  return tokens;
}
