# Security audit — durable-chat-app — 2026-09-27

Part of a 22-repository audit of this account. The cross-repository report (method, pain points, business impact, solution analysis, roadmap) is published at https://claude.ai/artifact/KgdrC9eNyCwdqjvSfwMNuB.

## Summary for this repository

| Severity | Count |
|---|---|
| High | 1 |
| Medium | 2 |
| Low | 2 |

Automated passes run against this repository: gitleaks 8.24.2 (full history and tree), the placeholder-credential checker now shipped in `scripts/`, semgrep 1.178.0 (`p/security-audit`, `p/secrets`, `p/owasp-top-ten`, `p/github-actions`), bandit, pip-audit and npm audit where applicable, plus a manual review of auth, input handling, workflows and deployment files.

## Findings

| ID | Severity | Category | Location | Evidence | Impact | Fix | Status |
|---|---|---|---|---|---|---|---|
| DC-1 | High | SQL injection in the Durable Object | `src/server/index.ts:57-65` | `INSERT INTO messages (...) VALUES ('${message.id}', '${message.user}', '${message.role}', ${JSON.stringify(message.content)})` | `id`, `user`, `role` come from client WebSocket JSON unescaped; `JSON.stringify` is not SQL escaping. A crafted message wipes or forges the room's history. | Bound parameters: `sql.exec("INSERT ... VALUES (?, ?, ?, ?)", id, user, role, content)`. | open |
| DC-2 | Medium | Unvalidated frames re-broadcast; client chooses `user` and `role` | `src/server/index.ts:68-77; src/client/index.tsx:88-93` | `this.broadcast(message)` before parse; `JSON.parse` without try/catch | Impersonation of any user or of `assistant`; malformed JSON crashes the handler. | Validate first, assign identity server-side, broadcast the sanitized object. | open |
| DC-3 | Medium | Any string is a room; no auth, cap or limit | `src/client/index.tsx:127; src/server/index.ts:13,54` | `<Route path="/:room">`; `messages` grows unbounded | Memory and billable storage flood; join any room whose id leaks. | Cap stored messages; per-connection rate limit; join token for private rooms. | open |
| DC-4 | Low | Vulnerable production dependencies | `package-lock.json` | npm audit (prod): nanoid High (infinite loop on bad size), react-router High (open redirect / XSS) | Client-side redirect abuse; DoS in id generation. | Upgrade nanoid ≥5.1.16 and react-router past the advisory range. | open |
| DC-5 | Low | Stray Express stub logs full customer submissions | `server/server.js:11` | `console.log('Submission received:', submission)`; `express` not in package.json | PII in logs if ever run; dead code otherwise. | Delete the stub or declare deps and log a request id only. | open |

## Guardrails added in this change

- `scripts/check-placeholder-secrets.sh` — fails the build on placeholder credentials, secret defaults, disabled-auth defaults, `debug=True`, literal secret assignments, private keys and committed `.env` files.
- `.gitleaks.toml` — gitleaks defaults plus custom placeholder rules and a fixture allowlist.
- `.github/workflows/secret-scan.yml` — runs both on every push and pull request and weekly over full history (SHA-pinned actions).
- `.pre-commit-config.yaml` — the same checks locally; run `pre-commit install` once.
- `docs/security/AI-CODING-GUARDRAILS.md` — the binding rules for any AI-assisted change, with references.
- A "Security rules for AI-assisted changes" section in `CLAUDE.md` (and `AGENTS.md` / Copilot instructions where present).
- `.gitignore` rules for `.env`, keys and Terraform state where they were missing.

See the cross-repository report for the fail-closed pattern by language and the prioritised fix list.
