@AGENTS.md

# Мова спілкування

Відповідай у чаті українською мовою завжди, незалежно від мови коду,
UI застосунку чи комітів/CHANGELOG.

# Звітування про виконану роботу

Наприкінці кожної репліки, де було щось зроблено, давай структурований і
зрозумілий перелік — не розмите прозове резюме на 1-2 речення. Головне —
ЩО ЗМІНИЛОСЬ ПО ФУНКЦІОНАЛУ, а не як саме це було задеплоєно. Пріоритет:

1. **Функціональні зміни — головна і найдетальніша частина звіту.** Для
   кожної зміни описуй: що саме було не так / чого не вистачало → що саме
   тепер відбувається натомість, конкретно й предметно (яка вкладка/блок/
   кнопка, як саме змінилась поведінка чи вигляд, які саме дані тепер
   показуються чи ховаються). Не обмежуйся назвою файлу чи компонента —
   користувачу треба зрозуміти зміну з тексту звіту, не заглядаючи в код.
   Якщо це продовження раунду фідбеку (кілька пунктів від користувача) —
   явно прив'язуй кожен опис до відповідного пункту фідбеку (по номеру).
2. **Git/CI-механіка — коротко, другорядно.** Перевірка CI, git fetch/
   merge/push тощо — перелічуй окремими пунктами з результатом
   (успіх/статус, номер ран/коміту), але стисло, без розгорнутих пояснень
   кожної команди. Це довідкова інформація для відстеження, не основний
   зміст відповіді.

Не міняй місцями пріоритет: якщо в репліці і код змінювався, і робились
git-дії, функціональний опис має бути детальнішим і йти першим,
git/CI-звіт — коротким і після нього.

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
