# SillyTavern-EchoCore

> **The All-in-One Immersive Voice OS & Multi-Provider Hub for SillyTavern**  
> *(Formerly known as: SillyTavern-GPT-SoVITS)*

[**English**](./README_EN.md) | [**简体中文**](./README.md)

![License](https://img.shields.io/badge/license-MIT-blue) ![Python](https://img.shields.io/badge/python-3.10+-yellow) ![SillyTavern](https://img.shields.io/badge/SillyTavern-Extension-purple) ![Status](https://img.shields.io/badge/status-Feature_Complete_%7C_Maintenance-brightgreen)

> 📢 **【Project Status & Rebranding Announcement / Maintenance Mode】**  
> After months of continuous evolution, this project has outgrown its origin as a single-model connector and transformed into a full-fledged **Immersive Voice Operating System & Multi-Provider Ecosystem (MiniMax / ElevenLabs / Doubao / GPT-SoVITS, etc.)** featuring **microkernel plugin architecture**, **5 flagship themes**, and a **Creative Workshop**. It is now officially rebranded as **SillyTavern-EchoCore**.  
> 
> The project has officially transitioned into **Feature Complete & Maintenance Mode**. Moving forward, focus will be directed toward core stability and upstream compatibility. Community developers are warmly welcomed to build upon the open microkernel hooks.

This is a comprehensive full-stack voice middleware and interaction operating system tailored for **SillyTavern**.

It is far more than a simple TTS connector. It features a full-stack architecture with a Python Fast-API backend manager and a vanilla JS frontend extension, providing zero-latency audio caching, dynamic model switching, and **12 highly customizable immersive voice bubble UI themes**.

---

## 🚀 Architecture & Feature Branches

This project is built with a highly **modular and extensible** architecture. The core engine handles TTS stability and frontend visuals, while advanced, cutting-edge capabilities are developed in independent branches to ensure system scalability and decoupling:

* **`main` branch**: The stable core engine, including model management, UI bubble rendering, and smart hashing cache mechanisms.
* **`fe_RealTime` branch**: 🔥 **Ultra-low Latency Real-time Voice Chat**. Built with WebSockets and VAD (Voice Activity Detection), this branch brings real-time, interruptible streaming voice conversations designed for highly immersive AI interactions.
* **`fe_tg_bot` branch**: 🤖 **Telegram Bot Integration**. Seamlessly connects the core AI engine to the Telegram Bot API, allowing remote interactions, scheduling, and complex state machine management via a Telegram client.

---

## ✨ Core Features

### 🎛️ Admin Dashboard
* **📊 System Dashboard**: Access `http://localhost:3000/admin-ui` to monitor system status, memory cache, and version info.
* **🤖 Model Management**: Visually manage and upload GPT/SoVITS `.pth` and `.ckpt` weights directly from the browser.
* **🎵 Reference Audio Manager**: Play, rename, batch-modify emotion prefixes, and delete audio files online without manually touching the file system.
* **⚙️ System Settings**: Tweak config parameters seamlessly in the web UI.

### 🔄 Auto-Update System 
* **Version Detection**: Automatically checks GitHub for the latest releases.
* **One-Click Update**: Supports automatic `git pull` or ZIP downloads for smart user upgrades.
* **Smart Processing**: Automatically stashes local changes, cleans tracking files, and restarts services.

### 🎧 Ultimate Audiovisual Experience
* **Immersive Voice Bubbles**: Generates iMessage/Messenger-style voice bars next to chat messages, complete with dynamic waveforms and duration displays.
* **🎨 12 Built-in Themes**: From Cyberpunk and Steampunk to Kawaii and Minimalist. Switch themes instantly.
* **🖼️ CSS Iframe Injection**: Exclusive support for "Iframe Mode", perfectly injecting styles into heavily customized SillyTavern aesthetic cards.

### 🤖 Automation & Performance
* **Dynamic Model Switching**: Automatically switches GPT and SoVITS weights based on the speaking character.
* **⚡ Smart MD5 Caching**: Generates a unique hash (Text + Emotion + Reference + Prompt). Cache hits result in 0ms delay and ZERO GPU usage.
* **🔄 FIFO Task Queue**: Built-in queue scheduler prevents concurrent request VRAM overflow. Background silent generation, foreground smooth reading.

### 🧠 Live Character Engine (v2.0+)
* **4D Character Analysis**: Continuously analyzes chat context using LLMs, tracking characters across physical, emotional, cognitive, and social dimensions.
* **Dynamic Action Triggers**: The engine evaluates potential actions (e.g., initiating a phone call, whispering, leaving) based on urgency and emotional intensity.

### 📞 Smart Phone Call System (v2.0+)
* **LLM-Driven Incoming Calls**: The analysis engine dynamically decides when, who, and why to trigger an incoming phone call based on the plot.
* **Multi-Scenario Support**: Emergency SOS, casual greetings, emotional venting, etc.
* **Seamless UI Integration**: Call content is synthesized via GPT-SoVITS and displayed beautifully in the chat interface.

### 👂 Eavesdrop System (v2.0+)
* **Private Whispers**: Trigger the "Eavesdrop" function to generate private conversations between multiple characters in the scene.
* **Multi-Speaker Synthesis**: Automatically identifies each speaker and uses their respective TTS models.
* **Synchronized Subtitles**: Generates precise timeline subtitles with scrolling highlights.

### 📡 Remote & Cross-Device
* **📱 Mobile/Remote Mode**: Run the heavy backend on your PC while enjoying the SillyTavern UI smoothly on your smartphone browser.

---

## 🎨 Visual Styles

12 meticulously crafted CSS themes are built-in, ready to adapt to any Roleplay scenario:
* 🌿 **Minimalist Green** (Default)
* 💎 **Kawaii Glassmorphism**
* ⚡ **Cyberpunk Neon**
* ✒️ **Ink & Wash** (Wuxia/Ancient)
* 🌸 **Cherry Blossom** (Romance)
* 📜 **Epic Scroll** (D&D/Fantasy)
* 💋 **Rouge Velvet** (Vampire/Mature)
* 🛸 **Holographic Sci-Fi**
* ⚙️ **Steampunk Brass**
* 📼 **Retro Classic**
* 🌑 **Obsidian Dark**
* 🟢 **Tactical HUD**

---

## 💡 Architecture Details (How it Works)

To guarantee lightning-fast response times and protect GPU resources, this project employs multi-layer optimization:

### 1. Smart MD5 Caching
`Hash = MD5(Text Content + Emotion Tag + Reference Path + Prompt)`
* **Memory/Disk Dual Check**: RAM priority, Disk fallback.
* **0 GPU Footprint**: Cache hits completely bypass the GPU, reducing response time to < 10ms.

### 2. Auto Pre-generation & Queuing
* **Silent Parsing**: Parses `[TTSVoice]` tags from AI replies in the background.
* **FIFO Pipeline**: Tasks are processed sequentially to avoid CUDA Out-Of-Memory errors.
* **Seamless UX**: By the time the user finishes reading the text and clicks the bubble, the audio is already generated.

### 3. Database Persistence
* **SQLite Database**: Saved voice clips are persistently stored via SQLite.
* **Fingerprinting**: Uses Message ID and Content Hash `m{mesid}_{content_hash}` for precise data matching.

---

## 🚀 Installation & Usage

*(Please refer to the Chinese documentation or the standard SillyTavern extension installation process for detailed instructions).*

---

## ☕ Author's Note & Epilogue

> *"Code is a sequence of cold characters, but the passion for creation was once incandescent."*

This project started from a simple dream: to give SillyTavern characters warm, expressive, and living voices. From an early Python script to a mature v3.2 flagship ecosystem with 5 themes, creative workshop, and an asynchronous microkernel, it reflects countless late nights and weekends of dedicated craftsmanship.

**This open-source journey has fulfilled its greatest mission**: bringing an immersive audiovisual experience to thousands of users while marking a meaningful chapter of architectural exploration and personal growth.

As my personal schedule and work priorities shift, active community support will be concluded. **With the microkernel registration mechanism now fully open, the future possibilities are in the capable hands of the community.**

Heartfelt thanks to everyone who provided authentic support, feedback, and Stars along the way.

**May this codebase continue to illuminate your roleplaying worlds with the magic of voice. Wishing you all the best! ✨**

— *haide-D (Project Creator & Lead Maintainer)*

