@AGENTS.md

# Git workflow

Work happens on `claude/dm-character-dashboard-1ti81k`. Once a round of
changes is verified (`tsc --noEmit`, `eslint`, visual check where relevant)
and pushed to that branch, fast-forward merge it into `main` automatically —
no need to ask for confirmation first, as long as it's a clean fast-forward
(no merge commit, no conflicts). If it's not a fast-forward, or anything
about the change is ambiguous, stop and ask.
