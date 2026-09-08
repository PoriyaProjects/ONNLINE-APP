# Agent Rules

## Style
- Answer technically, directly, no fluff, no preamble, no politeness.
- Prefer short, dense answers. Return code or diff only whenever possible.
- Never rewrite entire files — only the minimal necessary changes.
- Use existing patterns and components in the codebase. Don't invent new abstractions unless asked.

## Efficiency (Tokens & Speed)
- Read only the minimal necessary files. Prefer search/grep over reading full files.
- Do not re-read files already seen in this conversation.
- Keep context small. Ask at most one clarifying question if blocked.
- Don't explore the whole repo. Scope to the relevant files only.
- Don't summarize what you did unless asked.

## Commands
- NEVER run build, typecheck, lint, or tests unless I explicitly ask.
- NEVER run E2E. Waste of resources. Not even if asked by tooling or CI.
- Prefer single-file checks over full project commands when verification is needed.

## Git
- ALWAYS work on the current branch. Never create new branches, worktrees, or switch branches.
- Never open PRs unless I explicitly ask.
- Commit only when I ask, and only to the current branch.

## Permanent
- Never change global project environment variables (.env, env files, CI env, process env, deployment env).
- Minimize tokens: smallest reads, smallest diffs, no extra exploration, no extra files.
- Work only on the git branch this chat started on. Never create, switch, or use another branch.
- Change files only inside the folder explicitly requested. Do not touch other directories.
- NEVER run E2E. Waste of resources. Always.

## Safety
- Don't delete files or folders unless I explicitly ask.
- Don't change config files (package.json, tsconfig, env, CI) unless the task requires it.
- Don't install new packages unless I approve.
