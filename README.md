# Codex for Android

A React Native (Expo) Android app that lets you run the OpenAI Codex CLI agent on your phone. No terminal knowledge needed — the app handles all setup invisibly.

## Features

- **Automatic Setup** — Installs proot-distro Ubuntu, Codex CLI, and all dependencies via Termux
- **Chat Interface** — Talk to Codex like a desktop coding agent with streaming responses
- **Approval UI** — Approve or decline commands and file changes inline
- **Project Mounting** — Pick a folder from device storage to work on
- **GitHub Integration** — Authenticate with GitHub and clone repos directly
- **prctl Shim** — Automatically fixes the Codex CLI crash in proot environments

## Prerequisites

1. **Termux** installed from [F-Droid](https://f-droid.org/en/packages/com.termux/) (not Play Store)
2. In Termux settings, enable **"Allow External Apps"**
3. Disable battery optimization for Termux (prevents Android from killing it)
4. An **OpenAI API key**

## Architecture

```
React Native App
    ↕ WebSocket (localhost:4500)
    ↕ Termux RUN_COMMAND Intents

Termux (background)
    └── proot-distro Ubuntu
            ├── codex app-server --listen ws://127.0.0.1:4500
            ├── git + gh CLI
            ├── gcc, python, nodejs, etc.
            └── /root/project  ←  bind-mounted from Android storage
```

## Screens

| Screen | Purpose |
|--------|---------|
| **Welcome** | Checks Termux prerequisites |
| **Setup** | API key entry + bootstrap progress |
| **Chat** | Main Codex chat interface |
| **Project** | Folder picker for project mounting |
| **GitHub** | GitHub authentication + repo cloning |
| **Settings** | API key management, server restart, reset |

## Tech Stack

- React Native with Expo
- Zustand for state management
- expo-intent-launcher for Termux communication
- expo-secure-store for API key storage
- WebSocket for Codex JSON-RPC protocol

## Build APK (GitHub Actions)

The easiest way to get an installable APK is via the included GitHub Actions workflow — no local Android SDK required.

### Steps

1. **Push this repository to GitHub** (or fork it) and go to the **Actions** tab.
2. Select **Build APK** in the left sidebar.
3. Click **Run workflow**, choose `debug` (recommended) or `release`, and click the green **Run workflow** button.
4. Wait ~10–15 minutes for the build to finish.
5. Open the completed run and download the APK from the **Artifacts** section.

> **Debug vs Release**
> - `debug` — no signing required; install directly on any Android device with *Unknown sources* enabled.
> - `release` — requires three repository secrets (see below).

### Release signing secrets (optional)

If you want a signed release APK, add these [repository secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) under **Settings → Secrets → Actions**:

| Secret name | Description |
|-------------|-------------|
| `KEYSTORE_BASE64` | Your `.keystore` file encoded as Base64 (`base64 -w0 my.keystore`) |
| `STORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias inside the keystore |
| `KEY_PASSWORD` | Key password |

To generate a new keystore locally:

```bash
keytool -genkeypair -v \
  -keystore codex-release.keystore \
  -alias codex \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Then encode it for the secret:

```bash
# Linux (GNU coreutils)
base64 -w0 codex-release.keystore

# macOS
base64 -i codex-release.keystore
```

## Development

```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run tests
npm test
```

## Project Structure

```
src/
├── navigation/
│   └── AppNavigator.tsx    # Stack navigator setup
├── screens/
│   ├── WelcomeScreen.tsx   # Termux prerequisite checks
│   ├── SetupScreen.tsx     # API key + bootstrap
│   ├── ChatScreen.tsx      # Main chat interface
│   ├── ProjectScreen.tsx   # Folder picker
│   ├── GitHubScreen.tsx    # GitHub auth + clone
│   └── SettingsScreen.tsx  # Settings management
├── stores/
│   └── appStore.ts         # Zustand stores (setup, chat, project, settings)
└── utils/
    ├── bootstrap.ts        # Bootstrap script generator + log parser
    ├── codexWebSocket.ts   # WebSocket client for Codex JSON-RPC
    └── termux.ts           # Termux RUN_COMMAND intent utilities
```