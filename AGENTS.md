# Software Factory

Shows where a software project stands, read from GitHub. `README.md` says what it is for.

## Rules every change follows

- **It owns nothing it can read elsewhere.** No cache, database or file holds a copy of a
  project's issues or pull requests. Each run reads GitHub again.
- **Never guess.** Something that can't be placed from GitHub's own data is shown as unplaced.
  Titles, bodies and comments are text for people: code never parses them for meaning.
- **A check, not a sentence.** A rule that a type, lint rule or test can enforce is enforced
  there and is not written here.
- **`any` is banned**, by lint, and so is working around it with a cast.
- **Few dependencies.** Adding a runtime dependency needs a reason in the pull request.
- **This repository is public.** No name, data or output of a private repository goes into its
  code, tests, issues, pull requests or commits. Tests use made-up data.

## Run and test

```
npm ci
npm start -- <owner>/<repo>
npm start -- <owner>/<repo> --closed-efforts
npm run typecheck
npm run lint
npm test
```
