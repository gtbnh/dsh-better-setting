# Better Setting（更好的设置）

[English](./README.en.md)

在 DeepSeek Harness 会话界面的**右上角**（会话头部工具区，与“打开右侧边栏”相邻）增加一个
**齿轮**入口。点开后弹出一个独立面板：左侧是 Harness“设置”的全部侧边栏选项（含已安装插件
提供的分区，例如 Market、内置浏览器、Better Sidebar、Bili、Cost Meter 等），右侧**直接渲染
该分区真实的设置页面**——和在内置“设置”里点同一项看到的内容完全一致。

- **搜索**：按名称（以及内部 id）即时过滤。
- **显示 / 隐藏**：行尾“眼睛”图标切换；隐藏项收进底部“已隐藏”分组，**点击隐藏项同样可在右侧渲染其设置页**，点眼睛图标即可恢复显示。
- **排序**：拖拽行、行尾 ↑ / ↓、或聚焦行后 `Alt + ↑` / `Alt + ↓`；左下角“恢复默认”清空。
- **图标**：优先使用插件在注册 `settings.section` 时传入的 `icon`（字符串图标名 / React 组件 / 元素），其次用内置映射，未知分区统一显示齿轮图标，与官方设置一致。
- 键盘：`Esc` 关闭，`Tab` 在弹窗内循环。
- 入口与会话头部一起渲染；切到“插件”等独立面板页时头部不显示，可从左下角账号菜单的
  “设置”打开同一个弹窗。
- 界面文字跟随 Harness 语言（中文 / English）。偏好保存在本地存储
  `dsh-better-setting:preferences:v1`（`{ order: string[], hidden: string[] }`）。

## 实现方式

槽位渲染按**声明归属**校验：`renderSlot("settings.section", …)` 只能由在自己的 `children`
里声明了该子槽位的条目调用；而同一个槽位**只能被声明一次**，重复声明会抛
`slot "settings.section" is already declared (by …)`，并且没有任何公开 API 能注销或修改
其他插件的注册。

真实分区组件只能通过 `settings.section` 渲染，所以本插件必须成为**声明方**：它接管
`sidebar.settings`（内置设置的座席），把官方模块用到的子槽位原样重新声明：

| 子槽位 | 用途 |
| --- | --- |
| `settings.launcher` | 侧栏底部的账号入口（左下角头像菜单），由账号插件注册 |
| `settings.section` | 每个设置分区一页，由各设置插件注册 |
| `settings.trigger` / `settings.header` / `settings.action` / `settings.close` / `settings.onboarding` | 官方设置外壳的其余座位，仅为保持兼容 |

因为 `settings.section` 已由官方模块
（`@deepseek-ai/dsh-client-ui-settings-general`）声明，本 bundle 的补丁会**禁用**该模块，
再由本插件自己声明这些槽位并渲染弹窗、导航与管理操作：

```yaml
- id: ui-settings-general
  name: '@deepseek-ai/dsh-client-ui-settings-general'
  disabled: true
- insert:
    - id: better-setting
      name: 'dsh-better-setting'
```

官方模块被禁用后丢失的「通用」分区由本插件重建：自己注册一个 id 为 `general`
的 `settings.section`，并声明 `settings.general.item`，因此语言、外观、字号、权限、
快捷键、性能等行会照常出现（这些行由 locale / theme / shortcuts / permission-presets
等模块自己贡献）。

## 与官方设置的差异

- 内置设置弹窗、`Ctrl/Cmd+,` 快捷键、连接状态与更新提示、官方引导流程由本插件取代：
  账号头像菜单（`settings.launcher`）仍保留在侧栏底部。
- 「通用」页中的**开发者工具开关**与**当前版本行**原本由被禁用的官方模块提供，现已缺失；
  其余各行完整。
- 隐藏 / 排序只作用于本插件的导航列表（记录在 localStorage），不会改写各分区注册的
  `order`，因此下次打开仍按你的偏好显示。

## 安装

在 Harness 中调用 `plugin_manager` 工具（或插件管理页安装本地目录）：

```
action: "install_bundle"
target: "/path/to/dsh-better-setting"
```

注意：profile 的 `package.json` 里这一项必须指向本插件目录（如
`link:/path/to/dsh-better-setting`）；若仍指向旧目录，插件会静默不加载
（`fiberPhase: null`），表现为入口缺失。

安装后需重新加载窗口（`Ctrl+R`）或完全重启 Harness。停用：
`plugin_manager` 的 `set_bundle`（`target: "dsh-better-setting"`，`enabled: false`），
再重启即可恢复官方设置弹窗。

## 开发

```bash
npm test          # 运行冒烟测试（无需 Harness 环境，模拟 loader / React / ctx）
```

冒烟测试覆盖座席注册、槽位声明、弹窗搜索/隐藏/排序与偏好持久化等核心行为。

## 结构

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | Host 半端（空实现 + 调试日志：本插件只做客户端 UI） |
| `lib/client.js` | 全部客户端逻辑：座席、右上角齿轮入口、弹窗、搜索/隐藏/排序、偏好存储、样式 |
| `locale/zh.json` / `locale/en.json` | 插件元信息（标题、描述） |
| `cordis.patch.yml` | Bundle 补丁：禁用官方设置外壳 + 插入本插件 |
| `icon.svg` | 插件图标 |
| `tools/smoke.mjs` | 无需 Harness 的冒烟测试（假 loader / React / ctx，覆盖座席与弹窗行为） |
| `tools/asar.mjs` | 读取安装目录 asar 的小工具（list / grep / extract） |
| `tools/dump-css.mjs` / `tools/dump-css.js` / `tools/peek-css.mjs` | 从 asar 里的客户端 bundle 提取注入的样式字符串 |

## 已知限制

- 内置设置外壳被替换，因此它自带的连接状态徽标 / 桌面更新提示 / onboarding 不再出现。
- 若某个分区组件自身渲染失败，本插件会在右侧显示错误卡片（含报错文本），不会拖垮整个界面。
- 偏好仅存于当前客户端（localStorage），不会同步到其他设备。
- 若运行环境缺少 `react-dom`，弹窗退化为内联覆盖层（无 portal），功能不变。
- 若注册失败（例如官方槽位结构变更），本插件会安静降级：应用照常启动，只是座席不出现；
  此时用 `set_bundle` 停用本插件并重启即可恢复官方设置。

## License

[MIT](./LICENSE)
