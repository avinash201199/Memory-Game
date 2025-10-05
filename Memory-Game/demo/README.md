Demo recording instructions

This folder contains scripts and instructions to record a short demo video (MP4) of the Memory‑Game with the changes (leaderboard, mute, confetti, etc.). I can’t create a video in this environment, but the scripts below will produce one on your machine.

Prerequisites
- Node.js (v16+ recommended) and npm
- ffmpeg (in PATH) for screen recording (Windows builds: https://www.gyan.dev/ffmpeg/builds/ or https://ffmpeg.org/)
- Python 3 (for the HTTP server; already present in many systems)

What the included files do
- `auto_play.js` — a small Puppeteer script that opens the local page and performs a few interactions (card flips, restart, change difficulty, hint) to produce visible UI changes.
- `record_demo.ps1` — a PowerShell helper that:
  1. Starts a local Python static server in the project's playable folder.
  2. Launches `node demo/auto_play.js` (so UI actions occur while recording).
  3. Runs `ffmpeg` to capture the desktop for a fixed duration (15s) and saves `demo/video.mp4`.

How to run (recommended)
1. Open a PowerShell with Administrator privileges (if needed for ffmpeg access).
2. From the repo root run:
   ```powershell
   cd "C:\Users\harsh\OneDrive\Pictures\Documents\HACKOBERFEST\Memory Game\Memory-Game\Memory-Game"
   npm install puppeteer --no-save
   .\demo\record_demo.ps1
   ```
3. Wait ~20 seconds. When finished, `demo/video.mp4` should exist.

Notes & troubleshooting
- If ffmpeg is not installed, install it and make sure `ffmpeg.exe` is in your PATH.
- The `record_demo.ps1` uses `ffmpeg -f gdigrab -i desktop` to capture the entire primary display. If you prefer to capture only the browser window, update the ffmpeg input to `-i title="Microsoft Edge"` or similar; run `ffmpeg -list_devices true -f dshow -i dummy` for capture options.
- Puppeteer will launch a visible browser (not headless) to show the interactions. If you prefer to manually interact and record with OBS, you can skip `auto_play.js` and run only the ffmpeg command while you play.

Customization
- Adjust recording duration via `-t 15` in `record_demo.ps1`.
- Replace the `auto_play.js` sequence with the exact interactions you want showcased.

If you want, I can also:
- Create a short narrated script (text) you can record as voiceover.
- Produce a smaller GIF (requires imagemagick/ffmpeg steps) instead of MP4.

Enjoy — run the script and let me know if ffmpeg or puppeteer run into issues and I'll help fix them.