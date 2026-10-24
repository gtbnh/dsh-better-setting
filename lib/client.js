window.__ModuleLoader__.load({
	id: "dsh-better-setting",
	factory: (require) => {
		var module = { exports: {} };
		var React = require("react");
		var h = React.createElement;
		var ReactDOM = null;
		try {
			ReactDOM = require("react-dom");
		} catch (error) {
			ReactDOM = null;
		}
		var primitives = null;
		try {
			primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		} catch (error) {
			primitives = null;
		}

		var NS = "better-setting";
		var PANEL_ID = "better-setting";
		var SECTION_KEY = "settings.section";
		var STORAGE_KEY = "dsh-better-setting:preferences:v1";
		var CSS_TAG = "dsh-better-setting/SettingsHub.module.css";

		/* ---------------------------------------------------------------- */
		/* Dictionaries                                                      */
		/* ---------------------------------------------------------------- */

		var zh = {
			nav: "更好的设置",
			settings: "设置",
			openSettings: "打开更好的设置",
			openInSettings: "在设置中打开",
			detailHint: "该设置页由 DSH 内置设置面板渲染；点击下方按钮即可在“设置”中打开对应页面。",
			detailOrder: "顺序 {order}",
			openUnavailable: "未找到内置设置面板，暂时无法打开该页。",
			keyboardHint: "Enter 打开 · Alt + ↑/↓ 排序",
			hubTitle: "更好的设置",
			close: "关闭",
			searchPlaceholder: "搜索设置项…",
			searchClear: "清除搜索",
			hidden: "已隐藏",
			show: "显示此项",
			hide: "隐藏此项",
			moveUp: "上移",
			moveDown: "下移",
			reset: "恢复默认",
			count: "显示 {shown} / {total}",
			noMatch: "没有匹配的设置项",
			empty: "暂无可显示的设置项",
			sectionError: "此设置页暂时无法显示",
			sectionErrorHint: "该设置页需要 DSH 内置设置面板的环境，当前渲染失败。侧边栏选项与排序仍然可用。",
			landingHint: "设置内容通过弹窗展示：左侧可搜索、显示隐藏与排序，右侧显示与设置中一致的页面。",
			dragHint: "拖动排序，Alt + ↑/↓ 也可调整",
			sectionGeneral: "通用",
			loading: "正在读取设置项…"
		};

		var en = {
			nav: "Better Setting",
			settings: "Settings",
			openSettings: "Open Better Setting",
			openInSettings: "Open in Settings",
			detailHint: "This page is rendered by the built-in Settings panel; use the button below to open it there.",
			detailOrder: "Order {order}",
			openUnavailable: "The built-in Settings panel is unavailable.",
			keyboardHint: "Enter to open · Alt + ↑/↓ to reorder",
			hubTitle: "Better Setting",
			close: "Close",
			searchPlaceholder: "Search settings…",
			searchClear: "Clear search",
			hidden: "Hidden",
			show: "Show",
			hide: "Hide",
			moveUp: "Move up",
			moveDown: "Move down",
			reset: "Reset",
			count: "{shown} of {total} shown",
			noMatch: "No matching settings",
			empty: "No settings available",
			sectionError: "This settings page cannot be shown",
			sectionErrorHint: "This page needs the built-in settings shell environment. Sidebar options and ordering still work.",
			landingHint: "Settings open in a dialog: search, hide, reorder on the left; the right side shows the same page as Settings.",
			dragHint: "Drag to reorder, or Alt + ↑/↓",
			sectionGeneral: "General",
			loading: "Loading settings…"
		};

		function interpolate(text, params) {
			if (!params) return text;
			return String(text).replace(/\{(\w+)\}/g, function (match, key) {
				return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
			});
		}

		function isChineseLocale() {
			try {
				var lang = (typeof navigator !== "undefined" && navigator.language) || "";
				return String(lang).toLowerCase().indexOf("zh") === 0;
			} catch (error) {
				return false;
			}
		}

		var translate = function (key, params) {
			var table = isChineseLocale() ? zh : en;
			var text = table[key] !== undefined ? table[key] : key;
			return interpolate(text, params);
		};

		function bindTranslate(candidate) {
			if (typeof candidate !== "function") return null;
			return candidate;
		}

		/* ---------------------------------------------------------------- */
		/* Small utilities                                                   */
		/* ---------------------------------------------------------------- */

		function cx() {
			var out = [];
			for (var i = 0; i < arguments.length; i++) {
				var value = arguments[i];
				if (value) out.push(String(value));
			}
			return out.join(" ");
		}

		function reportFailure(stage, error) {
			if (typeof console !== "undefined" && console.error) console.error("[better-setting] " + stage + " failed", error);
		}

		function attempt(stage, run, fallback) {
			try {
				return run();
			} catch (error) {
				reportFailure(stage, error);
				return fallback;
			}
		}

		function createStore(initial) {
			var snapshot = initial;
			var listeners = [];
			return {
				getSnapshot: function () {
					return snapshot;
				},
				subscribe: function (listener) {
					listeners.push(listener);
					return function () {
						var index = listeners.indexOf(listener);
						if (index >= 0) listeners.splice(index, 1);
					};
				},
				set: function (patch) {
					var next = Object.assign({}, snapshot, patch);
					var changed = false;
					for (var key in next) {
						if (next[key] !== snapshot[key]) {
							changed = true;
							break;
						}
					}
					if (!changed) return;
					snapshot = next;
					listeners.slice().forEach(function (listener) {
						try {
							listener();
						} catch (error) {
							reportFailure("store listener", error);
						}
					});
				}
			};
		}

		function useStore(store) {
			return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
		}

		/* The dialog is rendered by the sidebar seat, so a module level store
		   lets the panel button and the landing page open the same dialog. */
		var hubUi = createStore({ open: false, activeId: undefined });

		function openHub(id) {
			hubUi.set({
				open: true,
				activeId: id === undefined ? hubUi.getSnapshot().activeId : id
			});
		}

		function closeHub() {
			hubUi.set({ open: false });
		}

		function selectSection(id) {
			hubUi.set({ activeId: id });
		}

		/* ---------------------------------------------------------------- */
		/* Icons                                                             */
		/* ---------------------------------------------------------------- */

		function svg(children, size, strokeWidth) {
			return h(
				"svg",
				{
					width: size,
					height: size,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: strokeWidth || 1.6,
					strokeLinecap: "round",
					strokeLinejoin: "round",
					"aria-hidden": "true",
					focusable: "false"
				},
				children
			);
		}

		var ICON_PATHS = {
			sliders: [
				h("line", { key: "a", x1: 4, y1: 7, x2: 20, y2: 7 }),
				h("circle", { key: "b", cx: 9, cy: 7, r: 2 }),
				h("line", { key: "c", x1: 4, y1: 12, x2: 20, y2: 12 }),
				h("circle", { key: "d", cx: 15, cy: 12, r: 2 }),
				h("line", { key: "e", x1: 4, y1: 17, x2: 20, y2: 17 }),
				h("circle", { key: "f", cx: 7, cy: 17, r: 2 })
			],
			gear: [
				h("path", { key: "a", d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" }),
				h("circle", { key: "b", cx: 12, cy: 12, r: 3 })
			],
			search: [
				h("circle", { key: "a", cx: 11, cy: 11, r: 6 }),
				h("line", { key: "b", x1: 15.5, y1: 15.5, x2: 20, y2: 20 })
			],
			close: [h("path", { key: "a", d: "M6 6l12 12M18 6L6 18" })],
			up: [h("path", { key: "a", d: "M6 14l6-6 6 6" })],
			down: [h("path", { key: "a", d: "M6 10l6 6 6-6" })],
			eye: [
				h("path", { key: "a", d: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" }),
				h("circle", { key: "b", cx: 12, cy: 12, r: 2.4 })
			],
			eyeOff: [
				h("path", { key: "a", d: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" }),
				h("circle", { key: "b", cx: 12, cy: 12, r: 2.4 }),
				h("line", { key: "c", x1: 4, y1: 4, x2: 20, y2: 20 })
			],
			grip: [
				h("circle", { key: "a", cx: 9, cy: 7, r: 1 }),
				h("circle", { key: "b", cx: 15, cy: 7, r: 1 }),
				h("circle", { key: "c", cx: 9, cy: 12, r: 1 }),
				h("circle", { key: "d", cx: 15, cy: 12, r: 1 }),
				h("circle", { key: "e", cx: 9, cy: 17, r: 1 }),
				h("circle", { key: "f", cx: 15, cy: 17, r: 1 })
			]
		};

		function icon(name, size) {
			/* The gear outline is denser than the others, so it gets a lighter
			   stroke to stay crisp at 16px. */
			return svg(ICON_PATHS[name] || ICON_PATHS.sliders, size || 16, name === "gear" ? 1.5 : 1.6);
		}

		function primitiveIcon(name, size) {
			if (!primitives) return null;
			var candidate = primitives[name];
			if (typeof candidate !== "function") return null;
			try {
				return h(candidate, { size: size });
			} catch (error) {
				return null;
			}
		}

		var SECTION_ICONS = {
			account: "IconUserOutlineMedium",
			models: "IconDataOutlineMedium",
			"agent-presets": "IconAgentPresetOutlineMedium",
			plugins: "IconPersonalizationOutlineMedium",
			"archived-sessions": "IconArchiveOutlineMedium",
			general: "IconSettingsOutlineMedium",
			"better-sidebar": "IconLayoutOutlineMedium",
			"dsh-builtin-browser": "IconBrowserOutlineMedium",
			market: "IconShopOutlineMedium",
			bili: "IconVideoOutlineMedium",
			"cost-meter": "IconChartOutlineMedium"
		};

		function sectionGlyph(id, size, iconOpt) {
		var rendered = null;
		/* 1. Icon supplied by the section registrant (string name, component, or element). */
		if (iconOpt !== undefined && iconOpt !== null) {
			if (typeof iconOpt === "string") {
				rendered = primitiveIcon(iconOpt, size);
			} else if (typeof iconOpt === "function") {
				try { rendered = h(iconOpt, { size: size }); } catch (error) { rendered = null; }
			} else if (typeof iconOpt === "object") {
				rendered = iconOpt;
			}
		}
		/* 2. Built-in / known id → primitive icon. */
		if (!rendered) {
			var name = SECTION_ICONS[id];
			if (name) rendered = primitiveIcon(name, size);
		}
		/* 3. Fallback to the settings gear, matching the built-in shell's navIcon(). */
		if (!rendered) rendered = primitiveIcon("IconSettingsOutlineMedium", size);
		return rendered || icon("gear", size);
	}

		/* ---------------------------------------------------------------- */
		/* Preferences (localStorage)                                        */
		/* ---------------------------------------------------------------- */

		function emptyPreferences() {
			return { order: [], hidden: [] };
		}

		function normalizeIdList(value) {
			if (!Array.isArray(value)) return [];
			var out = [];
			var seen = {};
			value.forEach(function (item) {
				if (typeof item !== "string" || item.length === 0 || seen[item]) return;
				seen[item] = true;
				out.push(item);
			});
			return out;
		}

		function readPreferences() {
			try {
				var raw = window.localStorage.getItem(STORAGE_KEY);
				if (!raw) return emptyPreferences();
				var parsed = JSON.parse(raw);
				return {
					order: normalizeIdList(parsed && parsed.order),
					hidden: normalizeIdList(parsed && parsed.hidden)
				};
			} catch (error) {
				return emptyPreferences();
			}
		}

		function writePreferences(next) {
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: next.order, hidden: next.hidden }));
			} catch (error) {
				reportFailure("persist preferences", error);
			}
		}

		/* Injected store snapshots can arrive as array-like plain objects when the
		   slot runtime copies them across the entry boundary, so every consumer
		   normalizes before iterating. */
		function toRows(value) {
			if (Array.isArray(value)) return value;
			if (!value || typeof value !== "object") return [];
			var out = [];
			Object.keys(value).forEach(function (key) {
				if (!/^\d+$/.test(key)) return;
				if (value[key] && typeof value[key] === "object") out.push(value[key]);
			});
			return out;
		}

		function arrangeRows(rowsIn, prefs) {
			var rows = toRows(rowsIn);
			var byId = {};
			var out = [];
			var used = {};
			rows.forEach(function (row) {
				byId[row.id] = row;
			});
			(prefs && prefs.order ? prefs.order : []).forEach(function (id) {
				var row = byId[id];
				if (!row || used[id]) return;
				used[id] = true;
				out.push(row);
			});
			rows.forEach(function (row) {
				if (used[row.id]) return;
				used[row.id] = true;
				out.push(row);
			});
			return out;
		}

		function createPreferencesStore() {
			var store = createStore(readPreferences());
			function commit(next) {
				var value = { order: normalizeIdList(next.order), hidden: normalizeIdList(next.hidden) };
				writePreferences(value);
				store.set(value);
			}
			return {
				getSnapshot: store.getSnapshot,
				subscribe: store.subscribe,
				reorder: function (rows, fromId, toId) {
					if (!fromId || !toId || fromId === toId) return;
					var ids = rows.map(function (row) {
						return row.id;
					});
					var from = ids.indexOf(fromId);
					var to = ids.indexOf(toId);
					if (from < 0 || to < 0) return;
					ids.splice(to, 0, ids.splice(from, 1)[0]);
					commit({ order: ids, hidden: store.getSnapshot().hidden });
				},
				moveBy: function (rows, id, delta) {
					var ids = rows.map(function (row) {
						return row.id;
					});
					var from = ids.indexOf(id);
					if (from < 0) return;
					var to = from + delta;
					if (to < 0 || to >= ids.length) return;
					ids.splice(to, 0, ids.splice(from, 1)[0]);
					commit({ order: ids, hidden: store.getSnapshot().hidden });
				},
				setHidden: function (id, hidden) {
					var current = store.getSnapshot();
					var list = current.hidden.filter(function (item) {
						return item !== id;
					});
					if (hidden) list.push(id);
					commit({ order: current.order, hidden: list });
				},
				reset: function () {
					commit(emptyPreferences());
				}
			};
		}

		function memoryPreferences() {
			var store = createStore(emptyPreferences());
			function commit(next) {
				store.set({ order: normalizeIdList(next.order), hidden: normalizeIdList(next.hidden) });
			}
			return {
				getSnapshot: store.getSnapshot,
				subscribe: store.subscribe,
				reorder: function (rows, fromId, toId) {
					if (!fromId || !toId || fromId === toId) return;
					var ids = rows.map(function (row) {
						return row.id;
					});
					var from = ids.indexOf(fromId);
					var to = ids.indexOf(toId);
					if (from < 0 || to < 0) return;
					ids.splice(to, 0, ids.splice(from, 1)[0]);
					commit({ order: ids, hidden: store.getSnapshot().hidden });
				},
				moveBy: function (rows, id, delta) {
					var ids = rows.map(function (row) {
						return row.id;
					});
					var from = ids.indexOf(id);
					var to = from + delta;
					if (from < 0 || to < 0 || to >= ids.length) return;
					ids.splice(to, 0, ids.splice(from, 1)[0]);
					commit({ order: ids, hidden: store.getSnapshot().hidden });
				},
				setHidden: function (id, hidden) {
					var current = store.getSnapshot();
					var list = current.hidden.filter(function (item) {
						return item !== id;
					});
					if (hidden) list.push(id);
					commit({ order: current.order, hidden: list });
				},
				reset: function () {
					commit(emptyPreferences());
				}
			};
		}

		/* ---------------------------------------------------------------- */
		/* Section list (live from the slot ledger)                          */
		/* ---------------------------------------------------------------- */

		function activeLocaleId(ctx) {
			try {
				var snapshot = ctx.locale.getSnapshot();
				return (snapshot && (snapshot.active || snapshot.locale)) || "";
			} catch (error) {
				return "";
			}
		}

		function pickLocalized(value, locale) {
			if (!value) return "";
			if (typeof value === "string") return value;
			var normalized = String(locale || "").toLowerCase();
			if (normalized.indexOf("zh") === 0 && value.zh !== undefined) return value.zh;
			if (normalized.indexOf("en") === 0 && value.en !== undefined) return value.en;
			return value.zh !== undefined ? value.zh : value.en !== undefined ? value.en : "";
		}

		function resolveLabel(raw, ctx) {
			var locale = activeLocaleId(ctx);
			if (typeof raw === "function") {
				try {
					return resolveLabel(raw(), ctx);
				} catch (error) {
					return "";
				}
			}
			if (typeof raw === "string") return raw;
			if (raw && typeof raw === "object") return pickLocalized(raw, locale);
			return "";
		}

		function entryList(ctx) {
			try {
				if (typeof ctx.slots.entriesOfSlot === "function") return ctx.slots.entriesOfSlot(SECTION_KEY) || [];
				if (typeof ctx.slots.entries === "function") return ctx.slots.entries(SECTION_KEY) || [];
			} catch (error) {
				reportFailure("read settings sections", error);
			}
			return [];
		}

		function readSectionRows(ctx) {
		var rows = [];
		var seen = {};
		entryList(ctx).forEach(function (entry) {
			var options = (entry && entry.options) || {};
			var id = options.id !== undefined && options.id !== null ? String(options.id) : "";
			if (!id || seen[id]) return;
			seen[id] = true;
			var order = typeof options.order === "number" ? options.order : 0;
			var label = resolveLabel(options.label, ctx) || id;
			rows.push({ id: id, label: label, order: order, icon: options.icon });
		});
		rows.sort(function (a, b) {
			if (a.order !== b.order) return a.order - b.order;
			return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		});
		return rows;
	}

		function createSectionsStore(ctx) {
			var rows = readSectionRows(ctx);
			var store = createStore(rows);
			function refresh() {
				var next = readSectionRows(ctx);
				var current = store.getSnapshot();
				var same =
					next.length === current.length &&
					next.every(function (row, index) {
						var other = current[index];
						return other && other.id === row.id && other.label === row.label && other.order === row.order;
					});
				if (!same) store.set(next);
			}
			function schedule() {
				Promise.resolve().then(refresh).catch(function (error) {
					reportFailure("refresh sections", error);
				});
			}
			ctx.effect(function () {
				var disposers = [];
				if (typeof ctx.slots.subscribe === "function") disposers.push(ctx.slots.subscribe(SECTION_KEY, schedule));
				if (typeof ctx.locale.subscribe === "function") disposers.push(ctx.locale.subscribe(schedule));
				return function () {
					disposers.forEach(function (dispose) {
						try {
							dispose();
						} catch (error) {
							reportFailure("dispose sections listener", error);
						}
					});
				};
			}, "dsh-better-setting: sections store");
			return { getSnapshot: store.getSnapshot, subscribe: store.subscribe, refresh: refresh };
		}

		function emptySections() {
			var store = createStore([]);
			return { getSnapshot: store.getSnapshot, subscribe: store.subscribe };
		}

		/* ---------------------------------------------------------------- */
		/* CSS                                                               */
		/* ---------------------------------------------------------------- */

		var CSS = [
			".dshsh_seat{display:flex;flex-direction:column}",
			".dshsh_seatRow{flex:none;align-items:center;gap:8px;width:calc(100% + 4px);margin:4px -2px;display:flex;position:relative}",
			".dshsh_seatRowRail{width:36px;margin:8px 0 10px}",
			".dshsh_seatBtn{box-sizing:border-box;border-radius:var(--dsw-radius-md);cursor:pointer;width:auto;min-width:0;height:42px;color:var(--dsw-alias-label-primary);background:0 0;border:none;flex:1;align-items:center;gap:8px;margin:0;padding:0 10px 0 8px;font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}",
			".dshsh_seatBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshsh_seatBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}",
			".dshsh_seatBtnRail{flex:none;justify-content:center;gap:0;width:36px;height:36px;margin:0;padding:0}",
			".dshsh_seatLabel{white-space:nowrap;overflow:hidden}",
			".dshsh_seatGlyph{flex:none;display:flex;align-items:center;justify-content:center}",
			".dshsh_sectionError{margin:8px 0;padding:16px 18px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:8px}",
			".dshsh_sectionErrorTitle{margin:0;font-size:14px;font-weight:500;line-height:22px;color:var(--dsw-alias-state-error-primary)}",
			".dshsh_sectionErrorText{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}",
			".dshsh_sectionErrorStack{max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-word;margin:0;font:12px/18px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--dsw-alias-label-tertiary)}",
			".dshsh_overlay{z-index:1000;justify-content:center;align-items:center;display:flex;position:fixed;inset:0;pointer-events:auto}",
			".dshsh_mask{inset:var(--dsh-frame-chrome-top,0px) 0 0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute}",
			".dshsh_panel{z-index:1;width:860px;height:min(800px, calc(100vh - 2 * max(24px, var(--dsh-frame-overlay-top, 24px))));border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);max-width:calc(100vw - 48px);box-shadow:var(--dsw-elevation-prominent);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);display:flex;position:relative;overflow:hidden}",
			".dshsh_panel:focus{outline:none}",
			".dshsh_nav{box-sizing:border-box;flex-direction:column;flex:none;gap:10px;width:232px;padding:22px 12px 12px;display:flex}",
			".dshsh_navHead{flex-direction:column;gap:10px;display:flex}",
			".dshsh_navTitle{color:var(--dsw-alias-label-primary);margin:0;padding:0 8px;font-size:16px;font-weight:500;line-height:24px}",
			".dshsh_search{box-sizing:border-box;height:32px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-base);align-items:center;gap:6px;padding:0 8px;display:flex}",
			".dshsh_search:focus-within{border-color:var(--dsw-alias-state-business-primary)}",
			".dshsh_searchIcon{color:var(--dsw-alias-label-tertiary);display:inline-flex;flex:none}",
			".dshsh_searchInput{width:100%;min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;font-family:inherit;font-size:13px;line-height:20px;padding:0}",
			".dshsh_searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".dshsh_clear{border-radius:var(--dsw-radius-sm);cursor:pointer;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:2px;display:inline-flex}",
			".dshsh_clear:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dshsh_navScroll{flex-direction:column;gap:2px;flex:1;min-height:0;display:flex;overflow-y:auto;padding:0 2px}",
			".dshsh_navList{flex-direction:column;gap:2px;display:flex}",
			".dshsh_row{border-radius:var(--dsw-radius-md);align-items:center;gap:2px;display:flex;position:relative}",
			".dshsh_row:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}",
			".dshsh_rowActive,.dshsh_rowActive:hover{background:var(--dsw-specific-sidebar-nav-item-active)}",
			".dshsh_rowDragging{opacity:.6}",
			".dshsh_rowDrop{box-shadow:inset 0 2px 0 var(--dsw-alias-state-business-primary)}",
			".dshsh_drag{color:var(--dsw-alias-label-caption);cursor:grab;flex:none;justify-content:center;align-items:center;width:14px;display:inline-flex;opacity:0}",
			".dshsh_row:hover .dshsh_drag,.dshsh_row:focus-within .dshsh_drag{opacity:1}",
			".dshsh_cell{box-sizing:border-box;cursor:pointer;height:38px;color:var(--dsw-alias-label-primary);text-align:left;background:0 0;border:none;flex:1;align-items:center;gap:8px;min-width:0;padding:8px 4px 8px 6px;font-family:inherit;font-size:14px;font-weight:400;line-height:22px;display:flex}",
			".dshsh_cellIcon{color:var(--dsw-alias-label-secondary);flex:none;justify-content:center;align-items:center;display:inline-flex}",
			".dshsh_label{white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;overflow:hidden}",
			".dshsh_tools{flex:none;align-items:center;gap:0;display:flex;padding-right:2px;opacity:0}",
			".dshsh_row:hover .dshsh_tools,.dshsh_row:focus-within .dshsh_tools{opacity:1}",
			".dshsh_tool{border-radius:var(--dsw-radius-sm);cursor:pointer;width:20px;height:22px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;justify-content:center;align-items:center;padding:0;display:inline-flex}",
			".dshsh_tool:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dshsh_tool:disabled{opacity:.35;cursor:default}",
			".dshsh_group{flex-direction:column;gap:2px;margin-top:8px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2);display:flex}",
			".dshsh_groupTitle{color:var(--dsw-alias-label-tertiary);align-items:center;gap:6px;padding:2px 8px;font-size:12px;line-height:18px;display:flex}",
			".dshsh_badge{border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);padding:0 6px;font-size:11px;line-height:16px}",
			".dshsh_rowHidden .dshsh_label{color:var(--dsw-alias-label-tertiary)}",
			".dshsh_rowHidden .dshsh_tools{opacity:1}",
			".dshsh_noMatch{color:var(--dsw-alias-label-tertiary);margin:0;padding:8px;font-size:13px;line-height:20px}",
			".dshsh_navFoot{flex:none;color:var(--dsw-alias-label-tertiary);border-top:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:10px 8px 0;font-size:12px;line-height:18px;display:flex}",
			".dshsh_count{margin-right:auto}",
			".dshsh_reset{border-radius:var(--dsw-radius-sm);cursor:pointer;color:var(--dsw-alias-state-business-primary);background:0 0;border:none;font-family:inherit;font-size:12px;line-height:18px;padding:2px 6px}",
			".dshsh_reset:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshsh_content{flex-direction:column;flex:1;min-width:0;display:flex}",
			".dshsh_contentHead{box-sizing:border-box;flex:none;justify-content:space-between;align-items:center;gap:8px;height:54px;padding:20px 14px 8px 6px;display:flex}",
			".dshsh_contentTitle{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;min-width:0;font-size:15px;font-weight:500;line-height:22px;overflow:hidden}",
			".dshsh_close{border-radius:var(--dsw-radius-sm);cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-primary);background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}",
			".dshsh_close:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshsh_options{flex:1;min-height:0;padding:0 24px 24px;overflow-y:auto}",
			".dshsh_section{min-height:100%}",
			".dshsh_general{width:100%;display:flex;flex-direction:column}",
			'.dshsh_general>[data-slot="settings.general.item"]>:last-child{border-bottom:none}',
			".dshsh_empty{color:var(--dsw-alias-label-tertiary);justify-content:center;align-items:center;height:100%;min-height:180px;font-size:14px;display:flex}",
			".dshsh_fallback{box-sizing:border-box;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);flex-direction:column;gap:6px;max-width:520px;margin:32px auto;padding:16px 18px;font-size:13px;line-height:20px;display:flex}",
			".dshsh_fallbackTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500}",
			".dshsh_topbtn{box-sizing:border-box;border-radius:var(--dsw-radius-md);cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-primary);background:0 0;border:none;align-items:center;justify-content:center;padding:0;display:inline-flex}",
			".dshsh_topbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshsh_topbtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}",
			".dshsh_primary{box-sizing:border-box;border-radius:var(--dsw-radius-md);cursor:pointer;height:34px;color:#fff;background:var(--dsw-alias-state-business-primary);border:none;margin-top:6px;padding:0 16px;font-family:inherit;font-size:14px;line-height:22px}",
			".dshsh_primary:hover{opacity:.9}",
			".dshsh_primary:disabled{opacity:.5;cursor:default}",
			".dshsh_card{box-sizing:border-box;flex-direction:column;align-items:stretch;gap:10px;max-width:520px;margin:28px auto;padding:20px 22px;display:flex;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md)}",
			".dshsh_cardHead{align-items:center;gap:10px;display:flex}",
			".dshsh_cardGlyph{color:var(--dsw-alias-label-secondary);display:inline-flex}",
			".dshsh_cardTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:500;line-height:22px}",
			".dshsh_cardMeta{color:var(--dsw-alias-label-tertiary);gap:8px;align-items:center;font-size:12px;line-height:18px;display:flex;flex-wrap:wrap}",
			".dshsh_code{background:var(--dsw-alias-bg-layer-2);border-radius:6px;padding:1px 6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}",
			".dshsh_cardText{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:21px}",
			".dshsh_cardActions{align-items:center;gap:10px;display:flex;flex-wrap:wrap}",
			".dshsh_warn{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}",
			".dshsh_kbd{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			"@media (max-width: 760px){.dshsh_panel{width:calc(100vw - 24px);max-width:calc(100vw - 24px)}.dshsh_nav{width:200px}}"
		].join("\n");

		function injectStyles() {
			try {
				if (typeof document === "undefined") return;
				if (document.querySelector('style[data-plugin-css="' + CSS_TAG + '"]') !== null) return;
				var tag = document.createElement("style");
				tag.dataset.plugin = "dsh-better-setting";
				tag.dataset.pluginCss = CSS_TAG;
				tag.textContent = CSS;
				document.head.appendChild(tag);
			} catch (error) {
				reportFailure("inject styles", error);
			}
		}

		/* ---------------------------------------------------------------- */
		/* Components                                                        */
		/* ---------------------------------------------------------------- */

		function NavRow(props) {
			var row = props.row;
			return h(
				"div",
				{
					className: cx("dshsh_row", props.active && "dshsh_rowActive", props.dragging && "dshsh_rowDragging"),
					role: "listitem",
					draggable: true,
					onDragStart: function (event) {
						if (event.dataTransfer) {
							try {
								event.dataTransfer.setData("text/plain", row.id);
								event.dataTransfer.effectAllowed = "move";
							} catch (error) {
								reportFailure("drag start", error);
							}
						}
						props.onDragStart(row.id);
					},
					onDragOver: function (event) {
						event.preventDefault();
						if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
					},
					onDrop: function (event) {
						event.preventDefault();
						props.onDrop(row.id);
					},
					onDragEnd: function () {
						props.onDragEnd();
					}
				},
				h("span", { className: "dshsh_drag", "aria-hidden": "true" }, icon("grip", 12)),
				h(
					"button",
					{
						type: "button",
						className: "dshsh_cell",
						title: row.label,
						"aria-current": props.active ? "true" : undefined,
						onClick: function () {
							props.onSelect(row.id);
						}
					},
					h("span", { className: "dshsh_cellIcon", "aria-hidden": "true" }, sectionGlyph(row.id, 16, row.icon)),
					h("span", { className: "dshsh_label" }, row.label)
				),
				h(
					"span",
					{ className: "dshsh_tools" },
					h(
						"button",
						{
							type: "button",
							className: "dshsh_tool",
							title: translate("moveUp"),
							"aria-label": translate("moveUp"),
							onClick: function () {
								props.onMove(row.id, -1);
							}
						},
						icon("up", 12)
					),
					h(
						"button",
						{
							type: "button",
							className: "dshsh_tool",
							title: translate("moveDown"),
							"aria-label": translate("moveDown"),
							onClick: function () {
								props.onMove(row.id, 1);
							}
						},
						icon("down", 12)
					),
					h(
						"button",
						{
							type: "button",
							className: "dshsh_tool",
							title: translate("hide"),
							"aria-label": translate("hide"),
							onClick: function () {
								props.onHide(row.id);
							}
						},
						icon("eyeOff", 13)
					)
				)
			);
		}

		function HiddenRow(props) {
			var row = props.row;
			return h(
				"div",
				{ className: cx("dshsh_row dshsh_rowHidden", props.active && "dshsh_rowActive"), role: "listitem" },
				h("span", { className: "dshsh_drag", "aria-hidden": "true" }),
				h(
					"button",
					{
						type: "button",
						className: "dshsh_cell",
						title: row.label,
						"aria-current": props.active ? "true" : undefined,
						onClick: function () {
							props.onSelect(row.id);
						}
					},
					h("span", { className: "dshsh_cellIcon", "aria-hidden": "true" }, sectionGlyph(row.id, 16, row.icon)),
					h("span", { className: "dshsh_label" }, row.label)
				),
				h(
					"span",
					{ className: "dshsh_tools" },
					h(
						"button",
						{
							type: "button",
							className: "dshsh_tool",
							title: translate("show"),
							"aria-label": translate("show"),
							onClick: function () {
								props.onShow(row.id);
							}
						},
						icon("eye", 13)
					)
				)
			);
		}

		/* Renders the real settings page of the active section. The slot render
		   runs during render, so a section failure is caught here instead of
		   reaching the slot boundary (which would abdicate that section). */
		function SectionHost(props) {
			return props.render();
		}

		class SectionBoundary extends React.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error: error };
			}
			componentDidCatch(error) {
				reportFailure("section", error);
			}
			render() {
				if (!this.state.error) return this.props.children;
				return h(
					"div",
					{ className: "dshsh_sectionError" },
					h("h3", { className: "dshsh_sectionErrorTitle" }, translate("sectionError")),
					h("p", { className: "dshsh_sectionErrorText" }, translate("sectionErrorHint")),
					h("pre", { className: "dshsh_sectionErrorStack" }, String((this.state.error && this.state.error.message) || this.state.error).slice(0, 600))
				);
			}
		}

		function HubDialog(props) {
			var queryState = React.useState("");
			var query = queryState[0];
			var setQuery = queryState[1];
			var dragState = React.useState(null);
			var dragId = dragState[0];
			var setDragId = dragState[1];
			var panelRef = React.useRef(null);

			var titleId = "dshsh-dialog-title";
			var rows = toRows(props.rows);
			var prefs = props.prefs || emptyPreferences();
			var ordered = arrangeRows(rows, prefs);
			var hiddenSet = {};
			prefs.hidden.forEach(function (id) {
				hiddenSet[id] = true;
			});
			var visible = ordered.filter(function (row) {
				return !hiddenSet[row.id];
			});
			var hiddenRows = ordered.filter(function (row) {
				return hiddenSet[row.id];
			});
			var needle = query.trim().toLowerCase();
			function matches(row) {
				if (!needle) return true;
				return row.label.toLowerCase().indexOf(needle) >= 0 || row.id.toLowerCase().indexOf(needle) >= 0;
			}
			var filtered = visible.filter(matches);
			var hiddenFiltered = hiddenRows.filter(matches);
			var allFiltered = filtered.concat(hiddenFiltered);
			var activeId = undefined;
			for (var i = 0; i < allFiltered.length; i++) {
				if (allFiltered[i].id === props.activeId) {
					activeId = allFiltered[i].id;
					break;
				}
			}
			if (activeId === undefined) {
				if (filtered.length > 0) activeId = filtered[0].id;
				else if (hiddenFiltered.length > 0) activeId = hiddenFiltered[0].id;
			}
			var activeRow = null;
			for (var j = 0; j < rows.length; j++) {
				if (rows[j].id === activeId) {
					activeRow = rows[j];
					break;
				}
			}
			var customized = prefs.hidden.length > 0 || prefs.order.length > 0;

			/* Focus the panel once when the dialog opens, and restore focus when it
			   unmounts. This must NOT re-run on activeId changes: re-focusing the
			   panel mid-typing steals focus from the search input and kills IME
			   composition after the first letters. */
			React.useEffect(function () {
				var previous = typeof document !== "undefined" ? document.activeElement : null;
				if (panelRef.current && typeof panelRef.current.focus === "function") {
					try {
						panelRef.current.focus();
					} catch (error) {
						reportFailure("focus dialog", error);
					}
				}
				return function () {
					if (previous && typeof previous.focus === "function") {
						try {
							previous.focus();
						} catch (error) {
							reportFailure("restore focus", error);
						}
					}
				};
			}, []);

			React.useEffect(function () {
				function focusables() {
					var panel = panelRef.current;
					if (!panel || typeof panel.querySelectorAll !== "function") return [];
					var nodes = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
					return Array.prototype.filter.call(nodes, function (node) {
						return !node.disabled && node.getAttribute && node.getAttribute("aria-hidden") !== "true";
					});
				}
				function onKeyDown(event) {
					if (event.key === "Escape") {
						if (event.stopPropagation) event.stopPropagation();
						props.onClose();
						return;
					}
					if (event.key === "Tab") {
						var list = focusables();
						if (list.length === 0) return;
						var first = list[0];
						var last = list[list.length - 1];
						if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
							event.preventDefault();
							if (last.focus) last.focus();
						} else if (!event.shiftKey && document.activeElement === last) {
							event.preventDefault();
							if (first.focus) first.focus();
						}
						return;
					}
					if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
						event.preventDefault();
						if (activeId !== undefined) props.onMove(activeId, event.key === "ArrowUp" ? -1 : 1);
					}
				}
				if (typeof document !== "undefined" && document.addEventListener) {
					document.addEventListener("keydown", onKeyDown, true);
				}
				return function () {
					if (typeof document !== "undefined" && document.removeEventListener) {
						document.removeEventListener("keydown", onKeyDown, true);
					}
				};
			}, [activeId]);

			var nav = h(
				"div",
				{ className: "dshsh_nav" },
				h(
					"div",
					{ className: "dshsh_navHead" },
					h("h2", { className: "dshsh_navTitle", id: titleId }, translate("hubTitle")),
					h(
						"div",
						{ className: "dshsh_search" },
						h("span", { className: "dshsh_searchIcon" }, icon("search", 14)),
						h("input", {
							className: "dshsh_searchInput",
							type: "search",
							value: query,
							placeholder: translate("searchPlaceholder"),
							"aria-label": translate("searchPlaceholder"),
							onChange: function (event) {
								setQuery(event.target.value);
							}
						}),
						query
							? h(
									"button",
									{
										type: "button",
										className: "dshsh_clear",
										title: translate("searchClear"),
										"aria-label": translate("searchClear"),
										onClick: function () {
											setQuery("");
										}
									},
									icon("close", 12)
							  )
							: null
					)
				),
				h(
					"div",
					{ className: "dshsh_navScroll" },
					filtered.length === 0
						? h("p", { className: "dshsh_noMatch" }, translate("noMatch"))
						: h(
								"div",
								{ className: "dshsh_navList", role: "list" },
								filtered.map(function (row) {
								return h(NavRow, {
									key: row.id,
									row: row,
									active: row.id === activeId,
									dragging: row.id === dragId,
									onSelect: props.onSelect,
									onMove: props.onMove,
									onHide: function (id) {
										props.onHide(id, true);
									},
									onDragStart: setDragId,
									onDragEnd: function () {
										setDragId(null);
									},
									onDrop: function (targetId) {
										if (dragId && dragId !== targetId) props.onReorder(dragId, targetId);
										setDragId(null);
									}
								});
							})
						),
					hiddenFiltered.length > 0
						? h(
								"div",
								{ className: "dshsh_group" },
								h(
									"div",
									{ className: "dshsh_groupTitle" },
									h("span", null, translate("hidden")),
									h("span", { className: "dshsh_badge" }, hiddenFiltered.length)
								),
								hiddenFiltered.map(function (row) {
									return h(HiddenRow, {
										key: "hidden-" + row.id,
										row: row,
										active: row.id === activeId,
										onSelect: props.onSelect,
										onShow: function (id) {
											props.onHide(id, false);
										}
									});
								})
							)
						: null
				),
				h(
					"div",
					{ className: "dshsh_navFoot" },
					h("span", { className: "dshsh_count" }, translate("count", { shown: visible.length, total: rows.length })),
					customized
						? h(
								"button",
								{
									type: "button",
									className: "dshsh_reset",
									onClick: function () {
										props.onReset();
									}
								},
								translate("reset")
						  )
						: null
				)
			);

			var contentChildren;
			if (activeId === undefined) {
				contentChildren = h("div", { className: "dshsh_empty" }, needle ? translate("noMatch") : translate("empty"));
			} else {
				contentChildren = h(
					SectionBoundary,
					{ key: activeId },
					h(SectionHost, {
						render: function () {
							if (typeof props.renderSlot !== "function") return null;
							return props.renderSlot("settings.section", { close: props.onClose }, { only: activeId });
						}
					})
				);
			}

			var content = h(
				"div",
				{ className: "dshsh_content" },
				h(
					"div",
					{ className: "dshsh_contentHead" },
					h("div", { className: "dshsh_contentTitle" }, activeRow ? activeRow.label : translate("hubTitle")),
					h(
						"button",
						{
							type: "button",
							className: "dshsh_close",
							title: translate("close"),
							"aria-label": translate("close"),
							onClick: function () {
								props.onClose();
							}
						},
						icon("close", 16)
					)
				),
				h("div", { className: "dshsh_options" }, contentChildren)
			);

			var dialog = h(
				"div",
				{
					className: "dshsh_overlay",
					role: "presentation",
					onMouseDown: function (event) {
						if (event.target === event.currentTarget) props.onClose();
					}
				},
				h("div", {
					className: "dshsh_mask",
					"aria-hidden": "true",
					onMouseDown: function () {
						props.onClose();
					}
				}),
				h(
					"div",
					{
						className: "dshsh_panel",
						role: "dialog",
						"aria-modal": "true",
						"aria-labelledby": titleId,
						tabIndex: -1,
						ref: panelRef
					},
					nav,
					content
				)
			);

			if (ReactDOM && typeof ReactDOM.createPortal === "function" && typeof document !== "undefined" && document.body) {
				try {
					return ReactDOM.createPortal(dialog, document.body);
				} catch (error) {
					reportFailure("portal", error);
				}
			}
			return dialog;
		}

		/* Degraded but functional dialog: rendered only when the main dialog
		   throws, so the feature still works and the failure stays visible. */
		function HubFallback(props) {
			var queryState = React.useState("");
			var query = queryState[0];
			var setQuery = queryState[1];
			var rows = toRows(props.rows);
			var prefs = props.prefs || emptyPreferences();
			var ordered = arrangeRows(rows, prefs);
			var needle = query.trim().toLowerCase();
			var shown = ordered.filter(function (row) {
				if (prefs.hidden.indexOf(row.id) >= 0) return false;
				if (!needle) return true;
				return String(row.label).toLowerCase().indexOf(needle) >= 0 || row.id.toLowerCase().indexOf(needle) >= 0;
			});
			var details = "";
			try {
				details = String((props.error && props.error.stack) || (props.error && props.error.message) || props.error || "").slice(0, 900);
			} catch (ignored) {
				details = "unknown error";
			}
			return h(
				"div",
				{ className: "dshsh_overlay", role: "presentation" },
				h("div", { className: "dshsh_mask", "aria-hidden": "true", onMouseDown: function () { props.onClose(); } }),
				h(
					"div",
					{ className: "dshsh_panel", role: "dialog", "aria-modal": "true" },
					h(
						"div",
						{ className: "dshsh_nav" },
						h("h2", { className: "dshsh_navTitle" }, translate("hubTitle")),
						h("p", { className: "dshsh_warn" }, translate("sectionErrorHint")),
						h("div", { className: "dshsh_search" }, h("input", {
							className: "dshsh_searchInput",
							type: "search",
							value: query,
							placeholder: translate("searchPlaceholder"),
							"aria-label": translate("searchPlaceholder"),
							onChange: function (event) { setQuery(event.target.value); }
						})),
						h(
							"div",
							{ className: "dshsh_navScroll" },
							h(
								"div",
								{ className: "dshsh_navList" },
								shown.map(function (row) {
									return h(
										"div",
										{ key: row.id, className: "dshsh_row" },
										h(
											"button",
											{
												type: "button",
												className: "dshsh_cell",
												title: row.label,
												onClick: function () { props.onSelect(row.id); },
												onDoubleClick: function () { openRow(props, row.id); }
											},
											h("span", { className: "dshsh_label" }, row.label)
										),
										h(
											"span",
											{ className: "dshsh_tools", style: { opacity: 1 } },
											h("button", { type: "button", className: "dshsh_tool", title: "打开", onClick: function () { openRow(props, row.id); } }, "↗"),
											h("button", { type: "button", className: "dshsh_tool", title: translate("hide"), onClick: function () { props.onHide(row.id, true); } }, "–")
										)
									);
								})
							)
						),
						h("div", { className: "dshsh_navFoot" }, h("span", { className: "dshsh_count" }, translate("count", { shown: shown.length, total: rows.length })))
					),
					h(
						"div",
						{ className: "dshsh_content" },
						h(
							"div",
							{ className: "dshsh_contentHead" },
							h("div", { className: "dshsh_contentTitle" }, translate("hubTitle")),
							h("button", { type: "button", className: "dshsh_close", title: translate("close"), "aria-label": translate("close"), onClick: function () { props.onClose(); } }, "×")
						),
						h(
							"div",
							{ className: "dshsh_options" },
							h(
								"div",
								{ className: "dshsh_card" },
								h("div", { className: "dshsh_cardTitle" }, translate("sectionError")),
								h("p", { className: "dshsh_cardText" }, translate("sectionErrorHint")),
								h("pre", { className: "dshsh_code", style: { whiteSpace: "pre-wrap", maxHeight: "300px", overflow: "auto", display: "block" } }, details)
							)
						)
					)
				)
			);
		}

		function openRow(props, id) {
			var ok = false;
			try {
				ok = typeof props.onOpen === "function" && props.onOpen(id) === true;
			} catch (error) {
				reportFailure("open built-in settings", error);
			}
			if (ok) props.onClose();
		}

		/* A render error inside the dialog must never reach the slot boundary:
		   the shell abdicates the offending entry for the rest of the session
		   (the entry then silently stops rendering). Catching it here keeps the
		   overlay entry alive and surfaces the failure text to the operator. */
		class DialogBoundary extends React.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error: error };
			}
			componentDidCatch(error) {
				reportFailure("dialog", error);
			}
			render() {
				var error = this.state.error;
				if (!error) return this.props.children;
				var merged = {};
				var fallback = this.props.fallback || {};
				for (var key in fallback) {
					if (Object.prototype.hasOwnProperty.call(fallback, key)) merged[key] = fallback[key];
				}
				merged.error = error;
				merged.onClose = this.props.onClose;
				return h(HubFallback, merged);
			}
		}

		/* The built-in shell owns the "general" page, so taking over the seat
		   drops it. This entry restores it: every `settings.general.item`
		   contributor (language, theme, shortcuts, permission presets, …)
		   registers here exactly as it did inside the built-in shell. */
		function GeneralSectionView(props) {
			var renderSlot = props.renderSlot;
			return h(
				"div",
				{ className: "dshsh_general" },
				typeof renderSlot === "function" ? renderSlot("settings.general.item", {}) : null
			);
		}

		/* Settings seat at the sidebar foot. This entry owns the built-in seat:
		   it declares `settings.launcher` (the account menu row) and
		   `settings.section` (every settings page, including plugin-provided
		   ones), so the dialog can render the real section component inline. */
		function SettingsHubSeat(props) {
			var prefsStore = props.prefs;
			var sectionsStore = props.sections;
			var ui = useStore(hubUi);
			var rows = sectionsStore ? toRows(useStore(sectionsStore)) : [];
			var prefs = prefsStore ? useStore(prefsStore) : emptyPreferences();
			var open = ui.open;
			var wide = props.wide !== false;

			var onMove = function (id, delta) {
				if (prefsStore) prefsStore.moveBy(arrangeRows(rows, prefs), id, delta);
			};
			var onHide = function (id, hidden) {
				if (prefsStore) prefsStore.setHidden(id, hidden);
			};
			var onReorder = function (fromId, toId) {
				if (prefsStore) prefsStore.reorder(arrangeRows(rows, prefs), fromId, toId);
			};
			var onReset = function () {
				if (prefsStore) prefsStore.reset();
			};

			var launcher = null;
			if (typeof props.renderSlot === "function") {
				try {
					launcher = props.renderSlot(
						"settings.launcher",
						{
							wide: wide,
							settingsOpen: open,
							openSettings: openHub,
							openOnboarding: function (id) {
								openHub(id);
							}
						},
						{ fallback: null }
					);
				} catch (error) {
					reportFailure("launcher", error);
					launcher = null;
				}
			}
			if (!launcher) {
				launcher = h(
					"button",
					{
						type: "button",
						className: wide ? "dshsh_seatBtn" : "dshsh_seatBtn dshsh_seatBtnRail",
						title: translate("openSettings"),
						"aria-label": translate("openSettings"),
						"aria-haspopup": "dialog",
						"aria-expanded": open ? "true" : "false",
						onClick: function () {
							if (open) closeHub();
							else openHub();
						}
					},
					h("span", { className: "dshsh_seatGlyph" }, icon("gear", 18)),
					wide ? h("span", { className: "dshsh_seatLabel" }, translate("settings")) : null
				);
			}

			return h(
				"div",
				{ className: "dshsh_seat" },
				h("div", { className: wide ? "dshsh_seatRow" : "dshsh_seatRow dshsh_seatRowRail" }, launcher),
				open
					? h(
							DialogBoundary,
							{
								onClose: closeHub,
								fallback: { rows: rows, prefs: prefs, activeId: ui.activeId, onSelect: selectSection, onHide: onHide }
							},
							h(HubDialog, {
								rows: rows,
								prefs: prefs,
								activeId: ui.activeId,
								renderSlot: props.renderSlot,
								onClose: closeHub,
								onSelect: selectSection,
								onMove: onMove,
								onHide: onHide,
								onReorder: onReorder,
								onReset: onReset
							})
					  )
					: null
			);
		}

		/* Gear button in the session header's top-right utility row. The dialog
		   itself is rendered by the sidebar seat, so this button only flips the
		   module-level open flag. */
		function SettingsHubButton() {
			return h(
				"button",
				{
					type: "button",
					className: "dshsh_topbtn",
					title: translate("openSettings"),
					"aria-label": translate("openSettings"),
					"aria-haspopup": "dialog",
					onClick: function () {
						openHub();
					}
				},
				icon("gear", 16)
			);
		}

		/* ---------------------------------------------------------------- */
		/* Plugin                                                            */
		/* ---------------------------------------------------------------- */

		function apply(ctx) {
			injectStyles();
			var prefs = attempt("preferences store", createPreferencesStore, null) || memoryPreferences();
			var sections = attempt("sections store", function () {
				return createSectionsStore(ctx);
			}, null) || emptySections();

			attempt("zh dictionary", function () {
				ctx.effect(function () {
					return ctx.locale.register(NS, "zh", zh);
				}, "dsh-better-setting: zh dictionary");
			});
			attempt("en dictionary", function () {
				ctx.effect(function () {
					return ctx.locale.register(NS, "en", en);
				}, "dsh-better-setting: en dictionary");
			});
			attempt("locale binding", function () {
				var bound = bindTranslate(ctx.locale.bind(NS));
				if (bound) translate = bound;
			});

			/* Takes over the Settings seat: declaring `settings.section` is what
			   makes inline section rendering possible, and owning
			   `settings.launcher` keeps the account menu at the sidebar foot. */
			attempt("settings seat", function () {
				ctx.slots.inject("sidebar.settings", function () {
					return ctx.slots.register(
						{
							name: "sidebar.settings",
							locale: NS,
							children: {
								"settings.launcher": { kind: "single", scope: "root" },
								"settings.trigger": { kind: "single", scope: "root" },
								"settings.header": { kind: "single", scope: "root" },
								"settings.action": { kind: "list", scope: "root" },
								"settings.close": { kind: "single", scope: "root" },
								"settings.section": { kind: "list", scope: "root" },
								"settings.onboarding": { kind: "list", scope: "root" }
							},
							inject: function () {
								return { prefs: prefs, sections: sections };
							}
						},
						SettingsHubSeat
					);
				});
			});

			attempt("general section", function () {
				ctx.slots.inject("settings.section", function () {
					return ctx.slots.register(
						{
							name: "settings.section",
							id: "general",
							order: 0,
							locale: NS,
							label: function () {
								return translate("sectionGeneral");
							},
							children: { "settings.general.item": { kind: "list", scope: "root" } }
						},
						GeneralSectionView
					);
				});
			});

			attempt("header entry", function () {
				ctx.slots.inject("conversation.session.header.utilities", function () {
					return ctx.slots.register(
						{
							name: "conversation.session.header.utilities",
							id: PANEL_ID,
							order: 50,
							locale: NS,
							label: function () {
								return translate("nav");
							}
						},
						SettingsHubButton
					);
				});
			});
		}

		// The dynamic client facade reads the declaration form as its service
		// gate: a function has no declaration site and reaches no service, so
		// `inject` must stay a plain array.
		var inject = ["slots", "locale"];

		module.exports.apply = apply;
		module.exports.inject = inject;
		return module.exports;
	}
});
