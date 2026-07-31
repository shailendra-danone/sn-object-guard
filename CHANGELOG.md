# Changelog

Notable changes to the Danone ESM Agent Template. The agent reads this when checking for updates, to explain in plain language what changed and recommend what to fold into a user's own `AGENTS.md`. Newest first.

## 2026-06-23

- The OAuth helper `sn-oauth` moved from the public `github.com/pchec/sn-oauth` to the private `github.com/danone/esm.sn-oauth`. If you cloned the old URL into `Shared/`, re-clone from the new one (`git clone https://github.com/danone/esm.sn-oauth.git Shared/esm.sn-oauth`) and update its path references. The new repo is private to the Danone org, so cloning it needs org membership, the same as this template and the knowledge base. The redirect now lands on the ESM-owned `esm_oauth_landing` page; the tool's own config handles that, so no action unless you pinned a redirect yourself.
- Start using the new client from `Shared/esm.sn-oauth` for all authentication requests towards Danone ServiceNow instances. You can offer the user to safely delete the old `sn-oauth` repo once the new one is confirmed working on all instances.

## 2026-06-17

- New README with two setup paths. On a Danone laptop: install Git for Windows, VS Code, and the GitHub Copilot Chat extension, then ask the agent to set you up. No Node, no command line. On a personal PC or Mac: Claude Code (recommended), or GitHub Copilot CLI or OpenAI Codex CLI. Both paths share one prerequisite, a GitHub account with two-factor authentication on, added to the Danone organization.
- The agent now builds your own `AGENTS.md` from the template into your working folder, copies the `CLAUDE.md` and `GEMINI.md` pointers in beside it, makes the folder a git repository, and gitignores `Shared/`. The clean template lives in `Shared/esm.agent-template` as the upstream for updates.
- Added a "Staying current" routine. The agent pulls every repo under `Shared/` at the start of each session and on demand, and checks the template for updates against the last reviewed commit.
- You install git; the agent installs the GitHub CLI (`gh`) later, only for opening pull requests from the command line. Browser pull requests work as a fallback where `gh` cannot be installed.
- Documentation reflowed to one line per paragraph (soft wrap), so it renders cleanly as a wiki.
