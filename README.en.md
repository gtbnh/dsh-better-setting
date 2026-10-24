# Better Setting

[中文](./README.md)

Adds a **gear** entry to the **top-right corner** of the DeepSeek Harness session view (in the session header utility area, next to "Open right sidebar"). Clicking it opens a standalone panel: the left side lists all sidebar options from Harness "Settings" (including sections contributed by installed plugins, e.g. Market, built-in browser, Better Sidebar, Bili, Cost Meter), and the right side **renders that section's real settings page inline** — exactly what you would see by clicking the same item in the built-in Settings.

- **Search**: filter instantly by label (and internal id).
- **Show / Hide**: toggle via the "eye" icon at the end of each row; hidden items collapse into the "Hidden" group at the bottom. **Clicking a hidden item also renders its settings page on the right**; click the eye icon to restore it.
- **Reorder**: drag rows, use the ↑ / ↓ buttons, or press `Alt + ↑` / `Alt + ↓` when a row is focused; "Reset" at the bottom-left clears all customizations.
- **Icons**: prefers the `icon` passed by the plugin when registering `settings.section` (icon name string / React component / element), then falls back to the built-in map; unknown sections show a gear icon, consistent with the official Settings.
- Keyboard: `Esc` closes, `Tab` cycles within the dialog.
- The entry renders together with the session header; when on standalone panel pages such as "Plugins" the header is hidden, so open the same dialog from the "Settings" item in the account menu at the bottom-left.
- UI text follows the Harness language (中文 / English). Preferences are stored in local storage under
  `dsh-better-setting:preferences:v1` (`{ order: string[], hidden: string[] }`).

## How it works

Slot rendering is validated by **declaration ownership**: `renderSlot("settings.section", …)` may only be called by an entry that declared that child slot in its own `children`; and the same slot **can be declared only once** — a duplicate declaration throws `slot "settings.section" is already declared (by …)`, and there is no public API to unregister or modify another plugin's registration.

Real section components can only be rendered through `settings.section`, so this plugin must become the **declaring party**: it takes over `sidebar.settings` (the built-in settings seat) and re-declares the child slots used by the official module verbatim:

| Child slot | Purpose |
| --- | --- |
| `settings.launcher` | Account entry at the bottom of the sidebar (avatar menu bottom-left), registered by the account plugin |
| `settings.section` | One page per settings section, registered by each settings plugin |
| `settings.trigger` / `settings.header` / `settings.action` / `settings.close` / `settings.onboarding` | Remaining seats of the official settings shell, kept for compatibility |

Since `settings.section` is already declared by the official module
(`@deepseek-ai/dsh-client-ui-settings-general`), this bundle's patch **disables** that module,
then this plugin declares these slots itself and renders the dialog, navigation and management actions:

```yaml
- id: ui-settings-general
  name: '@deepseek-ai/dsh-client-ui-settings-general'
  disabled: true
- insert:
    - id: better-setting
      name: 'dsh-better-setting'
```

The "General" section lost when the official module is disabled is rebuilt by this plugin: it registers a
`settings.section` with id `general` itself and declares `settings.general.item`, so language, appearance,
font size, permissions, shortcuts, performance and other rows still appear (these rows are contributed by
the locale / theme / shortcuts / permission-presets modules themselves).

## Differences from the official Settings

- The built-in settings dialog, `Ctrl/Cmd+,` shortcut, connection status & update notifications, and the
  official onboarding flow are replaced by this plugin; the account avatar menu (`settings.launcher`)
  remains at the bottom of the sidebar.
- The **developer tools toggle** and **current version row** in the "General" page were originally provided
  by the disabled official module and are now missing; all other rows are intact.
- Hiding / reordering only affects this plugin's navigation list (stored in localStorage) and does not
  rewrite the `order` registered by each section, so your preferences persist across restarts.

## Installation

Call the `plugin_manager` tool in Harness (or install from a local directory on the plugins page):

```
action: "install_bundle"
target: "/path/to/dsh-better-setting"
```

Note: the entry in your profile's `package.json` must point to this plugin's directory (e.g.
`link:/path/to/dsh-better-setting`); if it still points to an old directory, the plugin will silently
fail to load (`fiberPhase: null`), appearing as a missing entry.

After installation, reload the window (`Ctrl+R`) or fully restart Harness. To disable: use `set_bundle`
in `plugin_manager` (`target: "dsh-better-setting"`, `enabled: false`), then restart to restore the
official settings dialog.

## Development

```bash
npm test          # run smoke tests (no Harness environment needed; mocks loader / React / ctx)
```

The smoke tests cover seat registration, slot declarations, dialog search/hide/reorder, and preference
persistence.

## Structure

| File | Purpose |
| --- | --- |
| `lib/index.js` | Host half (no-op + debug logs: this plugin only does client-side UI) |
| `lib/client.js` | All client logic: seat, top-right gear entry, dialog, search/hide/reorder, preference storage, styles |
| `locale/zh.json` / `locale/en.json` | Plugin metadata (title, description) |
| `cordis.patch.yml` | Bundle patch: disable official settings shell + insert this plugin |
| `icon.svg` | Plugin icon |
| `tools/smoke.mjs` | Harness-free smoke tests (mocked loader / React / ctx, covering seat & dialog behavior) |
| `tools/asar.mjs` | Small utility to read asar from the install directory (list / grep / extract) |
| `tools/dump-css.mjs` / `tools/dump-css.js` / `tools/peek-css.mjs` | Extract injected style strings from the client bundle inside asar |

## Known limitations

- The built-in settings shell is replaced, so its connection status badge / desktop update notifications / onboarding no longer appear.
- If a section component fails to render on its own, this plugin shows an error card (with the error text) on the right side instead of breaking the whole UI.
- Preferences are stored only on the current client (localStorage) and are not synced across devices.
- If the runtime lacks `react-dom`, the dialog degrades to an inline overlay (no portal); functionality is unchanged.
- If registration fails (e.g. the official slot structure changed), this plugin degrades silently: the app starts normally, only the seat is absent; disable the plugin with `set_bundle` and restart to restore the official Settings.

## License

[MIT](./LICENSE)
