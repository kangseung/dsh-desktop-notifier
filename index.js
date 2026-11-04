/**
 * Host half of the desktop reply notifier.
 *
 * When a root session finishes a turn (the model owes no further response),
 * this listener raises a desktop notification and plays a chime, so the
 * completion is visible and audible even when the browser tab is hidden or
 * minimised. Subagent and teammate sessions are skipped: only the session the
 * user is actually chatting with is announced.
 *
 * Supported desktops: Linux (notify-send + paplay/pw-play) and macOS
 * (osascript, with the built-in Glass sound). Both run detached and never
 * block the turn boundary.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

export const name = 'dsh-desktop-notifier'
export const inject = ['agents', 'sessions', 'sessionTitle']

const NOTIFICATION_TITLE = 'AI 回复完成'
const EXPIRE_MS = '12000'
const MACOS_SOUND = 'Glass'
const LINUX_SOUND_CANDIDATES = [
  '/usr/share/sounds/freedesktop/stereo/complete.oga',
  '/usr/share/sounds/freedesktop/stereo/bell.oga',
]

/** Resolve a command on PATH without spawning it. */
function locate(command) {
  const path = process.env.PATH ?? ''
  return path
    .split(delimiter)
    .filter((dir) => dir.length > 0)
    .map((dir) => join(dir, command))
    .find((candidate) => existsSync(candidate))
}

function run(command, args) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  // A missing binary or a session without a display bus must degrade to a log
  // line, not an unhandled 'error' event that takes the Host down.
  child.on('error', (error) => {
    console.warn(`[dsh-desktop-notifier] ${command} failed: ${error.message}`)
  })
  child.unref()
}

/** AppleScript string literal. */
function appleScript(text) {
  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

function playLinuxSound() {
  const sound = LINUX_SOUND_CANDIDATES.find((file) => existsSync(file))
  if (sound === undefined) return
  if (locate('paplay')) {
    run('paplay', [sound])
    return
  }
  if (locate('pw-play')) {
    run('pw-play', [sound])
  }
}

function raise(title, body, key) {
  if (process.platform === 'darwin') {
    run('osascript', [
      '-e',
      `display notification ${appleScript(body)} with title ${appleScript(title)} sound name "${MACOS_SOUND}"`,
    ])
    return
  }
  run('notify-send', [
    '--app-name=DSH',
    '--icon=dialog-information',
    `--expire-time=${EXPIRE_MS}`,
    // Same session replaces its previous notification instead of stacking.
    `--hint=string:x-canonical-private-synchronous:dsh-turn-${key}`,
    title,
    body,
  ])
  playLinuxSound()
}

function bodyOf(ctx, session) {
  const folded = ctx.sessionTitle.get(session)?.title
  if (folded) return folded
  const cwd = session.header.cwd
  if (cwd) {
    const parts = cwd.split('/').filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }
  return session.id
}

export function apply(ctx) {
  ctx.on('agent/turn-stopping', ({ agent }) => {
    const session = ctx.sessions.get(agent.id)
    if (session === undefined) return
    if (session.header.parentSession !== undefined) return
    raise(NOTIFICATION_TITLE, bodyOf(ctx, session), session.id)
  })
}
