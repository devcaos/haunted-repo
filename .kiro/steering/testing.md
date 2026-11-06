---
inclusion: always
---

# Testing

- After every change, run lint, build and tests (commands in `tech.md`). Fix errors before saying a task is done.
- **Anything that uses an external service** (AI, cloud database, third-party API, RSS feed) needs at least one test against the **real service**, not only against a mock.
- Mocks must never be more permissive than the real service. If the real service rejects something, the mock rejects it too.
- When a requirement states a rule that must always hold (for example "no line is longer than 40 characters"), propose a property-based test for it in the design.
- The demo must keep working for free, without manual intervention, until 29 January 2027. Flag any design choice that could break this (paid APIs, expiring keys, databases that pause when idle).
