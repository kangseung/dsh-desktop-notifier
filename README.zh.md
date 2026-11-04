# dsh-desktop-notifier

每轮 AI 回复结束时，在系统桌面弹出通知并播放提示音。网页缩到后台、被别的窗口盖住、或者你正低头刷手机，都能被提醒到。

![插件图标](icon.svg)

## 它做什么

Harness 自带的浏览器通知插件需要页面处于打开状态并且授予了浏览器通知权限；这个插件不需要。它跑在 Host 侧，直接调用系统桌面能力：

| 平台 | 通知 | 提示音 |
| --- | --- | --- |
| Linux | `notify-send`（KDE / GNOME / libnotify） | `paplay`，没有则回退 `pw-play`；Freedesktop 系统音 |
| macOS | `osascript display notification` | 系统自带 `Glass` 声 |

触发点是 `agent/turn-stopping` 事件，也就是一轮真正结束、模型不再需要继续说的时候，而不是每个中间步骤。

- **只提醒根会话**。subagent 和 teammate 会话静默，Agent Team 跑任务时不会刷你一屏。
- 通知正文取会话标题；没有标题就用工作目录名。
- 通知 12 秒后自动消失；同一会话的下一轮会替换上一条，不堆叠。
- 全程 fire-and-forget，不会拖慢 turn 边界。

## 环境要求

- 带 profile 的 DeepSeek Harness（在 `web` profile 上验证）。
- Linux：`notify-send`（Debian/Ubuntu 是 `libnotify-bin`），以及 `paplay`（`pulseaudio-utils`）或 `pw-play`（PipeWire）。KDE Plasma 和 GNOME 都能用。
- macOS：无需额外依赖。
- 需要有真实的桌面会话：如果 Harness 跑在只有 SSH 的 shell 里、或作为没有 `DBUS_SESSION_BUS_ADDRESS` 的系统服务运行，通知到不了桌面。

## 安装

```sh
dsh plugin --profile web add https://github.com/kangseung/dsh-desktop-notifier/archive/refs/tags/v1.0.0.tar.gz
```

重启 Harness（`dsh --profile web ...`）让 Host 半部分加载，然后到 **设置 → 插件** 里确认 `dsh-desktop-notifier` 这一行是激活状态。

卸载：

```sh
dsh plugin --profile web remove dsh-desktop-notifier
```

## 调整

可改的都在 `index.js` 顶部的常量：

| 常量 | 含义 |
| --- | --- |
| `NOTIFICATION_TITLE` | 通知标题 |
| `EXPIRE_MS` | 通知停留时长（Linux） |
| `MACOS_SOUND` | macOS 系统音名，如 `Glass`、`Ping`、`Sosumi` |
| `LINUX_SOUND_CANDIDATES` | 按顺序尝试的声音文件 |

改 profile 里已安装的那份，然后重启 Harness。故意不做 `Config` schema：插件没有用户级数据，改一行常量更直接。

## 对 Harness 的影响

| 方面 | 效果 |
| --- | --- |
| Token 开销 | 无 —— 纯 UI，绝不进入请求。 |
| 工具调用 | 无 —— 没有新增任何工具。 |
| 会话日志 | 不变 —— 只读内存中的 session 与折叠好的标题。 |
| 提示词 | 不变 —— 不注册 system prompt 段。 |
| 轮次延迟 | 无 —— `spawn` 是 detached，监听器立即返回。 |

## 已知限制

- 桌面通知服务缺失时，只在日志里留一行 `[dsh-desktop-notifier] ... failed`，不影响 turn。
- 不支持 Windows。
- 通知是纯文本，点击只会唤起通知中心，不会跳到具体轮次。

## 开发

没有构建步骤，包内就是普通的 ESM `index.js`。

基础检查：

```sh
node --check index.js
```

## License

MIT，见 [LICENSE](LICENSE)。
