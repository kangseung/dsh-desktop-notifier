# dsh-desktop-notifier

Desktop notification plus a chime whenever a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) session finishes a turn — so you notice the reply even when the browser tab is minimised, hidden behind another window, or you are away from the screen looking at your phone.

![Plugin icon](icon.svg)

## What it does

Harness already has a browser-notification plugin; this one does **not** need the page to be open or focused, and it does not need the browser `Notification` permission. It runs on the Host side and talks to the real desktop:

| Platform | Notification | Sound |
| --- | --- | --- |
| Linux | `notify-send` (KDE/GNOME/libnotify) | `paplay`, falling back to `pw-play`; Freedesktop stereo sounds |
| macOS | `osascript display notification` | built-in `Glass` sound |

It listens on the `agent/turn-stopping` event, so it fires once at the end of a turn — not for every intermediate model step.

- **Only root sessions** are announced. Subagent and teammate sessions stay silent, so an Agent Team run does not spam you.
- The notification body is the session title, falling back to the working-directory name.
- Notifications expire after 12 seconds; a new turn in the same session replaces the previous notification instead of stacking.
- Firing is fire-and-forget: the turn boundary is never blocked by a notification.

## Requirements

- DeepSeek Harness with a profile (tested against the `web` profile).
- Linux: `notify-send` (`libnotify-bin` on Debian/Ubuntu) and `paplay` (`pulseaudio-utils`) or `pw-play` (PipeWire). KDE Plasma and GNOME both work.
- macOS: nothing extra.
- A running desktop session: when the Harness runs in an SSH-only shell or as a system service without `DBUS_SESSION_BUS_ADDRESS`, notifications cannot reach the desktop.

## Install

```sh
dsh plugin --profile web add https://github.com/kangseung/dsh-desktop-notifier/archive/refs/tags/v1.0.0.tar.gz
```

Restart the Harness (`dsh --profile web ...`) so the Host half loads, then check that the row `dsh-desktop-notifier` shows up as active in **Settings → Plugins**.

Uninstall:

```sh
dsh plugin --profile web remove dsh-desktop-notifier
```

## Tuning

The only knobs are constants at the top of `index.js`:

| Constant | Meaning |
| --- | --- |
| `NOTIFICATION_TITLE` | Notification title line |
| `EXPIRE_MS` | How long the notification stays on screen (Linux) |
| `MACOS_SOUND` | macOS system sound name, e.g. `Glass`, `Ping`, `Sosumi` |
| `LINUX_SOUND_CANDIDATES` | Sound files tried in order |

Edit them in the installed profile copy and restart the Harness. A `Config` schema is intentionally not provided: the plugin has no per-user data, and a constant is one line to change.

## Behaviour details

| Aspect | Effect |
| --- | --- |
| Model tokens | None — notifications are pure UI, never enter a request. |
| Tools | None added. |
| Session log | Unchanged — the plugin only reads the in-memory session and its folded title. |
| Prompt | Unchanged — no system-prompt section is registered. |
| Turn latency | None — `spawn` is detached and the listener returns immediately. |

## Known limits

- If the desktop notification daemon is missing, the failure is logged (`[dsh-desktop-notifier] ... failed`) and the turn continues normally.
- Windows is not supported.
- The notification is plain text; clicking it focuses the notification centre, not the exact turn.

## Development

There is nothing to build — the package ships plain ESM `index.js`.

Quick check without Harness (spawns a real notification and exits):

```sh
node --check index.js
```

## License

MIT — see [LICENSE](LICENSE).
