# Install Phishnet

## 1. Prerequisites

- macOS machine with internet access (always-on recommended)
- [Bun](https://bun.sh) installed
- iCloud account with IMAP access
- Model provider:
  - OpenAI API key, or
  - local [Ollama](https://ollama.com) installation with a pulled model

## 2. Clone and install dependencies

```bash
bun install
cp service/.env.template service/.env
```

## 3. Configure service credentials

Edit `service/.env` and set at minimum:

- `IMAP_USER` (your full iCloud email, e.g. `name@icloud.com`)
- `IMAP_PASSWORD` (Apple app-specific password)
- `MODEL_PROVIDER` (`openai` or `ollama`)
- For OpenAI: `OPENAI_API_KEY`
- For Ollama: `OLLAMA_MODEL` (and optional `OLLAMA_BASE_URL`)

Defaults include:

- `IMAP_HOST=imap.mail.me.com`
- `IMAP_PORT=993`
- `IMAP_SECURE=true`
- `MODEL_PROVIDER=openai`
- `FILTER_PROFILE=light` (`light` = sexual only, `balanced` = sexual + spam, `strict` = sexual + spam + annoyances)
- `POLL_INTERVAL_MINUTES=15`
- `CONFIDENCE_THRESHOLD=0.6`

## 4. Model provider setup

### OpenAI setup (`MODEL_PROVIDER=openai`)

- Create a project API key in the OpenAI API dashboard.
- Recommended: restricted key with model request permissions for chat completions.
- Place it in `service/.env` as `OPENAI_API_KEY`.

### Ollama setup (`MODEL_PROVIDER=ollama`)

1. Install Ollama locally.
2. Pull the model you want to use (example):

```bash
ollama pull llama3.1:8b
```

3. Set `OLLAMA_MODEL` in `service/.env` to your pulled model name.
4. Keep `OLLAMA_BASE_URL=http://127.0.0.1:11434` unless your Ollama server runs elsewhere.

## 5. iCloud app-specific password setup

Use an app-specific password (not your Apple ID password):

1. Open `appleid.apple.com`
2. Sign in and ensure 2FA is enabled
3. Open **Sign-In and Security** -> **App-Specific Passwords**
4. Generate a new app password for Phishnet
5. Put it in `service/.env` as `IMAP_PASSWORD`

Note: username is your iCloud mailbox address (for example `you@icloud.com`).

## 6. Verify service

Run a dry-run cycle:

```bash
bun run service:dry-run-once
```

Validate model-provider connectivity and output parsing:

```bash
bun run service:smoke-model
```

## 7. Optional: run as persistent background services with launchd

Phishnet includes user-specific launchd scripts:

- `scripts/launchd/install.sh`
- `scripts/launchd/status.sh`
- `scripts/launchd/uninstall.sh`

Install interactively:

```bash
bun run launchd:install
```

If bun is installed in a non-standard location, pass it explicitly:

```bash
PHISHNET_BUN_BIN=/absolute/path/to/bun bun run launchd:install
```

Install non-interactively:

```bash
./scripts/launchd/install.sh --yes
```

Check status:

```bash
bun run launchd:status
```

Restart the stack service (for example, after changing `service/.env`):

```bash
bun run launchd:restart
```

### Optional: enable LAN access to the stats UI/API

By default, Phishnet binds UI/API to `127.0.0.1` (local machine only).

To make the stats UI reachable from other devices on your local network, set in `service/.env`:

```env
LAN_MODE=true
```

Then restart:

```bash
bun run launchd:restart
```

Access from another device using your Mac's LAN IP:
- UI: `http://<your-mac-lan-ip>:54321`
- API: `http://<your-mac-lan-ip>:8787`

Security note: the local API/UI does not include authentication. Use LAN mode only on trusted networks.

Logs:

- `~/Library/Logs/phishnet.stack.out.log`
- `~/Library/Logs/phishnet.stack.err.log`
- `~/Library/Logs/phishnet.cleanup.out.log`
- `~/Library/Logs/phishnet.cleanup.err.log`

Uninstall/remove launchd services:

```bash
bun run launchd:uninstall
```

Non-interactive uninstall:

```bash
./scripts/launchd/uninstall.sh --yes
```

The uninstall script can also optionally remove logs and database files.
