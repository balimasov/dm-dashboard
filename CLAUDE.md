@AGENTS.md

# Мова спілкування

Відповідай у чаті українською мовою завжди, незалежно від мови коду,
UI застосунку чи комітів/CHANGELOG.

# Git workflow

Work happens on `claude/dm-character-dashboard-1ti81k`. Once a round of
changes is verified (`tsc --noEmit`, `eslint`, visual check where relevant)
and pushed to that branch, fast-forward merge it into `main` automatically —
no need to ask for confirmation first, as long as it's a clean fast-forward
(no merge commit, no conflicts). If it's not a fast-forward, or anything
about the change is ambiguous, stop and ask.

## Commit message format

Every commit that bumps `package.json`'s version prefixes its subject line
with that version in brackets: `[1.0.1] Fix CI: run on push to every
branch, not just main`. Bump the version and write the commit in the same
step, so the bracketed number always matches what's actually in
`package.json` in that commit.
