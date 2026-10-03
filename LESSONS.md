# What won Hack-Nation 6 (Vienna hub) — and how to repeat it

Source: Omar's winning repo `Omar-s-Org/Biohackers` ("Genome Firewall", Challenge 06, OpenAI track, 4 people). Read this once at kickoff; the rules in `CLAUDE.md` are built from it.

## The timeline that worked
| When | What happened |
|---|---|
| Sat ~20:00 (3 h after kickoff) | **Interface contract first**: `schemas.py` (the data shape between modules), synthetic fixtures, and one stub file per teammate, all in one commit. Everyone could build in parallel against fake data from hour 3. |
| Sat 22:30 – Sun 05:00 | Each owner built their own module on a branch; small PRs merged often (14 PRs over the weekend). |
| Sun 00:49 | `CLAUDE.md` written as the team's shared brain: what we build, scope, rules, owners, decisions. |
| Sun 09:00 | Swapped synthetic data for **real data at scale** (119 → 2,127 genomes). The real numbers became the headline. |
| Sun 10:00 – 14:00 | Front end wired to the real pipeline, then a full UI redesign — on top of a demo path that already worked. |
| Sun 14:30 – 15:00 | **Demo hardening**: bounded LLM calls, honesty fixes in the UI, a bundled example chosen because it shows every outcome, a demo runbook, docs corrected. |

## Why it won (the patterns to copy)
1. **Built straight from the official brief.** `CLAUDE.md` opened with the challenge, its scope, and what judges penalize. → Save this weekend's brief to `docs/challenge.md` first thing.
2. **Contract + fake data in the first 3 hours.** Nobody waited on anyone. → `contract/api.md` + the mock LLM already do this; add fixtures for the challenge's data the moment it is known.
3. **Honesty as the differentiator.** A real "no-call" outcome instead of forced answers, calibrated confidence never shown as 100%, evidence split into "known cause" vs "statistical association", a disclaimer on every result, and inflated early numbers publicly corrected. AI-lab judges reward a system that knows what it doesn't know.
4. **Deterministic core, LLM only for explanation.** The model predicted; GPT only wrote the plain-language text, with an 8 s timeout and a template fallback. The demo never depended on the LLM being up.
5. **Measured results, not claims.** Held-out metrics averaged over 8 splits, a results table, plots. A table with real numbers puts you in a different class from most hackathon projects.
6. **One demo input chosen on purpose.** They led with the one example genome that shows all three verdicts, so the judges saw the full range in one run.
7. **"Decisions made (don't silently reverse)" with the reason for each.** This stopped one person's Claude from undoing another's fix at 4 a.m.
8. **Clear file ownership and a rule for Claude:** do the task in front of you, never implement another owner's file, propose contract changes instead of making them.
9. **A README that sells:** a one-question hook, a "common shortcut vs. what we do instead" table, how it works (diagram), results, limitations, and the video in the repo.

## What to do better this time
- **Two people, not four:** fewer modules, one shared contract, no PR ceremony — commit small to `main`, pull often, `make smoke` before every push.
- **Pitch and video got the last minutes last time** (the video file landed at the end). This time `PITCH.md` has its own block: Sun 07:00–09:30, and Zoha owns it.
- **The UI redesign at Sun 14:04 was a risk** that happened to work. This time the look is decided Saturday night and only polished Sunday.
