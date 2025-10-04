# 🕹️ Vault-Tec Memory Game

[![HTML5](https://img.shields.io/badge/HTML5-Game-orange?logo=html5)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5) [![CSS3](https://img.shields.io/badge/CSS3-Styled-blue?logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS) [![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Overview

**Vault-Tec Memory** is a retro-inspired card matching game styled after the Pip-Boy from Fallout.  
Test your memory, race against the clock, and try to earn the highest star rating!

---

## 🎮 Features

- **Card flipping and matching mechanics**
- **Move and time tracking**
- **Star rating** based on performance (thresholds vary by difficulty)
- **Three difficulty levels:**
  - 🟡 **Easy:** 12 tiles, 60 seconds, hint enabled
  - 🟡 **Medium:** 16 tiles, 60 seconds, hint enabled
  - 🟡 **Hard:** 16 tiles, 45 seconds, hint disabled
- **Visual countdown progress bar**
- **Distinct "You Win" and "You Lose" modals**
- **Responsive design** for all screen sizes
- **Difficulty selection** with clear yellow highlight for the active level

---

## 🗂️ Project Structure

```
Memory-Game
├── index.html
├── src
│   ├── js
│   │   └── app.js
│   └── css
│       └── styles.css
├── img
│   └── [game images]
├── package.json
└── README.md
```

---

## 🚀 How to Run

### Quick Start

- **Just open `index.html` in your web browser** to play the game.
- No build step or server is required for basic use.

### Recommended: Run with a Local Server

Some browsers restrict loading local images/scripts due to security.  
To avoid this, you can use a simple local server:

**Using Python (pre-installed on most systems):**
```sh
cd /path/to/Memory-Game/Memory-Game
python3 -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080) in your browser.

**Or use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code.**

---

## 🖼️ UI Preview

| ![](img/Vault-Boy-Thumb-Up.jpg) | ![](img/10.jpg) |
|:-------------------------------:|:---------------:|

---

## ✨ Difficulty Selection

- The **selected difficulty** is highlighted in **yellow**.
- The other levels remain **grey** for clarity.

---

## 🤝 Contributing

Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

---

## 📜 License

This project is licensed under the **MIT License**. See the LICENSE file for more details.