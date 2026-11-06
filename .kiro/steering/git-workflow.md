---
inclusion: always
---

# Git workflow

- One branch per spec: `feat/<spec-name>`, `fix/<name>`, `docs/<name>` or `chore/<name>`. Never work on `main`.
- **One commit = one thing.** Each task in a spec's `tasks.md` ends in its own commit, made only after its tests pass. If a commit message needs an "and", it is two commits.
- If a pull request would change more than ~500 lines (excluding lockfiles and generated files), warn and propose how to split it.
- Create the pull request with `gh pr create`, filling in `.github/pull_request_template.md`. Never merge.
- Never commit secrets. Keys go in `.env.local` (ignored by git). `.env.example` contains only variable names.
- Never add `.kiro/` or any of its subfolders to `.gitignore`. The hackathon rules require it to be in the repository.
