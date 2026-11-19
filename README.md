# voiceover-to-video
Claude Code skill: give it a voiceover (+ script) and it builds a vertical 1080×1920 explainer Short in Three.js — one continuous camera take (no cuts), transitions on the narrator's pauses, camera accents on stressed words, consistent cartoon cast with IK hands, particles, word-synced captions, automated QA. No glow by default.

Install: `/plugin marketplace add harisaimanikanta/<this-repo>` then `/plugin install voiceover-to-video@voiceover-to-video` — or copy `skills/voiceover-to-video` to `~/.claude/skills/`. Then: `bash skills/voiceover-to-video/scripts/setup.sh`.
Use: `/voiceover-to-video:voiceover-to-video voice.mp3 script.txt`. Worked example in `skills/voiceover-to-video/example/`.
Third-party: three.js (MIT), mannequin-js (GPL-3.0, npm dep, not bundled), @pmndrs/assets (CC0), world-atlas (ISC).
