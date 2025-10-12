PR Notes for Modifed-Version

Summary:
- Replace external demo recording helpers with an in-page "Play Demo" button that scripts UI interactions (no external tools required).
- Add leaderboard persistence (per-difficulty top-5) with export/share/clear controls.
- Add small WebAudio tones and a mute toggle.
- Fire lightweight confetti on win.
- Accessibility improvements (aria labels, keyboard support, modal focus trap).

Files changed:
- index.html — added controls (Mute, Play Demo), confetti canvas, leaderboard markup
- src/css/styles.css — fixed matched-card animation selector, added styles for leaderboard and confetti
- src/js/app.js — added leaderboard persistence, mute/audio, playDemo(), confetti, and small UX fixes

Testing notes:
- Run a local server from the repository root and open http://localhost:8081/index.html
- Click the Play Demo button to observe scripted playback; watch console for any errors

Follow-ups:
- Optional: split changes into smaller commits for PR clarity
- Optional: run linter and polish inline styles
