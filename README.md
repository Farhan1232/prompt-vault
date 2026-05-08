<h1 align="center">✨ PromptVault</h1>
<p align="center">AI Prompt Manager — Desktop App built with Go + Wails + React</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go"/>
  <img src="https://img.shields.io/badge/Wails-v2.12-red?style=flat-square"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript"/>
  <img src="https://img.shields.io/badge/SQLite-local-003B57?style=flat-square&logo=sqlite"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
</p>

---

## What is PromptVault?

PromptVault is a **local-first desktop application** for managing your AI prompts. Store, organize, version, and render prompts for ChatGPT, Claude, Gemini, and any other AI model — all saved privately on your own machine with no subscriptions or cloud required.

---

## Features

| Feature | Description |
|---------|-------------|
| **Prompt Library** | Full CRUD — create, edit, delete, copy prompts |
| **Collections** | Color-coded folders with custom icons |
| **Tags** | Multi-tag support with colored badges |
| **Favorites & Pins** | Pin prompts to top, mark as favorites |
| **Star Ratings** | Rate prompts 1–5 stars after use |
| **Usage Tracking** | Counts how often each prompt is used |
| **Variable Templates** | `{{variable}}` syntax — fill and render dynamically |
| **Prompt Renderer** | Fill variables → preview final prompt → copy |
| **Version History** | Auto-saves versions on edit, restore any version |
| **Prompt Chains** | Link prompts in sequence for multi-step workflows |
| **Analytics Dashboard** | Most used, recently updated, all key stats |
| **Export / Import** | Full JSON backup and restore with collections & tags |
| **Search & Filter** | Full-text search, rating filter, multiple sort options |
| **Grid / List View** | Toggle between card grid and compact list |
| **Model Hints** | Tag prompts for GPT-4, Claude, Gemini, Llama, etc. |

---

## Tech Stack

- **Backend:** Go 1.25 + [Wails v2](https://wails.io)
- **Frontend:** React 18 + TypeScript + Vite
- **Database:** SQLite via [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) (pure Go, no CGO)
- **UI:** Custom CSS — dark navy / purple / cyan theme

---

## Getting Started

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

**Linux only** — install GTK/WebKit dependencies:
```bash
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev
```

### Run in Development

```bash
git clone https://github.com/Farhan1232/prompt-vault.git
cd prompt-vault

# Linux (Ubuntu 24.04 with webkit2gtk-4.1)
export PKG_CONFIG_PATH=~/.local/pkgconfig:$PKG_CONFIG_PATH
mkdir -p ~/.local/pkgconfig
cp /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.1.pc ~/.local/pkgconfig/webkit2gtk-4.0.pc
sed -i 's/webkit2gtk-4.1/webkit2gtk-4.0/g' ~/.local/pkgconfig/webkit2gtk-4.0.pc

wails dev -tags webkit2_41
```

### Build for Production

```bash
wails build -tags webkit2_41
```

The binary will be in `build/bin/`.

---

## Data Storage

All prompts are stored locally at:
- **Linux:** `~/.ai-prompt-manager/prompts.db`
- **macOS:** `~/Library/Application Support/.ai-prompt-manager/prompts.db`
- **Windows:** `%APPDATA%\.ai-prompt-manager\prompts.db`

No data ever leaves your machine.

---

## Variable Templates

Use `{{variable}}` syntax in any prompt:

```
You are a {{role}}. Write a {{tone}} email about {{topic}} for {{audience}}.
```

The app detects variables automatically. Click **Render** to fill them in and copy the final prompt.

---

## License

MIT — free to use, modify, and distribute.
