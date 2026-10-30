# 🐝 Spellbean

**Spellbean** is a focused, distraction-free spelling competition trainer built specifically to help students prepare for the **School of Tomorrow (SOT®P) National and Junior Student Convention** spelling events.

Official convention rules mandate that judges pronounce each word twice and read its definition aloud while the contestant writes the word on paper. Alternative or British spellings are strictly prohibited; every entry must conform exactly to the official 1,604-word competition list.

---

## 🌟 Key Features

### 1. 🎙️ Virtual Proctor & Audio Synthesizer
* **Official Cadence ("Say Word")**: Pronounces the target word twice with an exact 2-second pause in between, accompanied by an interactive countdown timer.
* **Contest Inquiries**:
  * 🔊 **Repeat Word (1x)**
  * 📖 **Definition**: Fetches authoritative definitions (with offline fallback) and reads them aloud.
  * 🏷️ **Part of Speech**: Pronounces and displays the word's grammatical function.
  * 💬 **Sentence in Context**: Displays the sentence with the word masked (`__________`) and pronounces the sentence aloud with "blank" replacing the word so the answer is never spoiled.
  * 🌍 **Language of Origin / Etymology**

### 2. ✍️ Dual Input Modes
* **Mode A: Pen & Paper (Contest Replication)**:
  * Replicates the exact physical convention environment.
  * Proctor speaks the word twice; the letters remain hidden on screen (revealing only a discrete letter count).
  * Contestant writes on actual paper.
  * Contestant clicks **"Reveal Spelling"** (or presses `Enter`) and self-reports: `[Got It (1)]` or `[Missed It (2)]`.
* **Mode B: Interactive Typing**:
  * Auto-focused high-contrast input box with immediate `Enter` submission.
  * Case-insensitive comparison against the exact official word list.
  * **Visual Character Diff**: Highlights matching letters (green), transposed pairs (purple with swap indicator), missing letters (dashed amber), and extra/incorrect letters (red strike-through).

### 3. 🎯 Daily Quota & Exhaustion Engine
* **Target Milestone**: Dynamic countdown to February 2027 (or customizable convention date).
* **Daily Quota**: Automatically computes $\lceil \text{unmastered\_words} / \text{days\_remaining} \rceil$.
* **Session Batching**: Generates batches of 20–50 words (70% unmastered/unseen + 30% reinforcement from the Missed Words Vault).
* **Mastery Standard**: Words graduate to `mastered` status **only after 3 consecutive error-free recall sessions**.

### 4. 🏆 Contest Simulation Mode (Mock Bee)
* **Official SOT Rules**: Round begins with **2 unscored practice words**.
* **Configurable Length**: 25, 50, or 100 words.
* **Deferred Feedback**: Words are pronounced twice with definitions and contestants enter their answers, but **corrections and typos remain concealed until the exam is submitted**.
* **Comprehensive Scorecard**:
  * Final accuracy percentage & convention ranking tier (Gold / Silver / Bronze / Certificate).
  * Time spent and average time per word.
  * Itemized breakdown with visual character diffs for every typo.
  * **1-Click Action**: *"Send All Errors to Missed Words Review Queue"*.

### 5. ⚠️ Missed Words Vault & 📚 Word Bank Explorer
* **1,604 Official Words**: Ingests and persists all entries from `sotp_spelling_words.json`.
* **Missed Words Vault**: Prioritizes words by error frequency and allows instant 1-click drill sessions.
* **Word Bank Explorer**: Searchable, filterable by status (`All`, `Unseen`, `Learning`, `Mastered`, `Starred`), and navigable via an A–Z alphabet jump bar.
* **Word Detail Modal**: View definitions, phonetic pronunciations, origins, speller notes, and personal accuracy statistics.
* **100% Offline Capability & Backup**: LocalStorage persistence with JSON progress export and import.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Pronounce target word twice with 2-second pause (Official Cadence) |
| `R` | Repeat word once |
| `D` | Read and display definition |
| `P` | Read and display part of speech |
| `S` | Read and display example sentence in context (word masked) |
| `Enter` | Submit typed spelling / Reveal paper answer |
| `1` | Self-report "Got it" / Correct (Pen & Paper mode) |
| `2` | Self-report "Missed it" / Incorrect (Pen & Paper mode) |
| `?` | Toggle keyboard shortcuts help dialog |
| `Esc` | Close active modal |

---

## 🚀 Tech Stack

- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS (warm amber `#F59E0B` palette, stone/slate backgrounds, dark mode support)
- **State Management & Persistence:** Zustand with `localStorage` (100% offline capable)
- **Audio Synthesizer:** Web Speech API (`SpeechSynthesisUtterance`) tuned for en-US clarity (rate: 0.85) + Web Audio API synthesized chimes
- **Icons:** Lucide React
- **Celebrations:** Canvas-confetti

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```
