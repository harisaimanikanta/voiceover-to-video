# voiceover-to-video
Claude Code skill: give it a voiceover (+ script) and it builds a vertical 1080×1920 Short in a polished 3D cartoon style (sculpted characters with emotional faces and lip-sync, mood lighting, dressed sets, a storyboard sheet for approval) in Three.js — one continuous camera take (no cuts), transitions on the narrator's pauses, camera accents on stressed words, consistent cartoon cast with IK hands, particles, word-synced captions, automated QA. No glow by default.

Install: `/plugin marketplace add harisaimanikanta/<this-repo>` then `/plugin install voiceover-to-video@voiceover-to-video` — or copy `skills/voiceover-to-video` to `~/.claude/skills/`. Then: `bash skills/voiceover-to-video/scripts/setup.sh`.
Use: `/voiceover-to-video:voiceover-to-video voice.mp3 script.txt`. Worked example in `skills/voiceover-to-video/example/`.
Self-improving: every production starts by reading `skills/voiceover-to-video/learning/` (all past mistakes, scores and the quality bar) and ends with a post-mortem (`scripts/review.py` automatic critique + a scored self-review + your feedback) that adds new lessons and raises the bar. Repeat mistakes get fixed in the kit itself. Lessons persist by being committed to this repo, so install from a git clone (or let the skill push its `learning/` updates) to keep the memory across days.

Third-party: three.js (MIT), mannequin-js (GPL-3.0, npm dep, not bundled), @pmndrs/assets (CC0), world-atlas (ISC).
