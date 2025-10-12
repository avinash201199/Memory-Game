# 🕹️ Vault-Tec Memory Game

[![HTML5](https://img.shields.io/badge/HTML5-Game-orange?logo=html5)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5) [![CSS3](https://img.shields.io/badge/CSS3-Styled-blue?logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS) [![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

[Join WhatsApp channel for any doubts](https://chat.whatsapp.com/BfBWJhy4xj3CJFSGE2qBrL)


## 📌 Overview

**Vault-Tec Memory** is a retro-inspired card matching game styled after the Pip-Boy from Fallout.  
Test your memory, race against the clock, and try to earn the highest star rating!

<br>
Url- https://avinash201199.github.io/Memory-Game/
<br>

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

### Built-in Demo

This fork includes a small in-page "Play Demo" button (top-left) that runs a scripted playback showing the game UI, hints, difficulty changes and an automatic win demonstration. Use this to preview the UI without recording or external videos.

### Recommended: Run with a Local Server

Some browsers restrict loading local images/scripts due to security.  
To avoid this, you can use a simple local server:

**Using Python (pre-installed on most systems):**
```sh
cd /path/to/Memory-Game/Memory-Game
python3 -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080) in your browser or go to file and double click on index.html.

**Or use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code.**

---

## 🖼️ UI Preview

| ![](Memory-Game/img/Game-ui.png) |
|:-------------------------------:|

---

## 🛠️ How to Contribute

We welcome contributions from the community to make Vault-Tec Memory Game even better! To ensure a smooth collaboration, please follow these steps:

### 1. Fork the Repository

Click the **Fork** button at the top right of this page to create a copy of the repository under your GitHub account.

### 2. Clone Your Fork

Clone your forked repository to your local machine:
```sh
https://github.com/avinash201199/Memory-Game.git
cd Memory-Game
```

### 3. Create a New Branch

Create a new branch for your feature or bugfix:
```sh
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

Edit the code or documentation as needed. Please ensure your changes are well-documented and tested.

### 5. Commit and Push

Commit your changes with a clear message:
```sh
git add .
git commit -m "Describe your changes"
git push origin feature/your-feature-name
```

### 6. Open a Pull Request

Go to your fork on GitHub and open a **Pull Request** against the main repository's `main` branch.  
Include a clear description of your changes and reference any related issues if applicable.

### 7. Code Review & Discussion

Please be responsive to code review comments or questions. We may request changes before merging.

---

**Contribution Guidelines:**
- Follow the existing code style and structure.
- Write clear, descriptive commit messages.
- Test your changes before submitting a pull request.
- If you are adding a new feature, consider including relevant documentation and/or screenshots.
- Be respectful and collaborative in all discussions.

---

Thank you for your interest in contributing!  
If you have any questions, feel free to open an issue or reach out via the [WhatsApp channel](https://chat.whatsapp.com/BfBWJhy4xj3CJFSGE2qBrL).

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
