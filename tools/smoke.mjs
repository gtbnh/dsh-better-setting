/**
 * Offline smoke harness for lib/client.js.
 *
 * There is no browser in this environment, so this script fakes the pieces the
 * bundle touches at load and apply time:
 *   - `window.__ModuleLoader__.load(spec)` to capture the module factory,
 *   - a tiny React stand-in with the hooks the hub uses,
 *   - a Cordis-like `ctx` with locale + slots services,
 *   - a `renderSlot` stand-in that records slot renders.
 *
 * It asserts the shipped registrations and the dialog behaviour that can be
 * checked without pixels. Run: `node tools/smoke.mjs`.
 */
import fs from "node:fs";
import vm from "node:vm";

/* ------------------------------------------------------------------ */
/* Fake React                                                          */
/* ------------------------------------------------------------------ */

const hookStates = [];
let hookIndex = 0;

const FakeReact = {
	createElement: function (type, props) {
		const children = Array.prototype.slice.call(arguments, 2);
		return { __el: true, type: type, props: props || {}, children: children.flat(Infinity) };
	},
	Component: class Component {
		constructor(props) {
			this.props = props || {};
			this.state = {};
		}
	},
	useState: function (initial) {
		const index = hookIndex++;
		if (!(index in hookStates)) hookStates[index] = typeof initial === "function" ? initial() : initial;
		const set = function (value) {
			hookStates[index] = typeof value === "function" ? value(hookStates[index]) : value;
		};
		return [hookStates[index], set];
	},
	useEffect: function (fn) {
		hookIndex++;
		fn();
	},
	useRef: function (initial) {
		const index = hookIndex++;
		if (!(index in hookStates)) hookStates[index] = { current: initial };
		return hookStates[index];
	},
	useSyncExternalStore: function (subscribe, getSnapshot) {
		hookIndex++;
		return getSnapshot();
	}
};

const fakeDocument = {
	body: {},
	activeElement: null,
	addEventListener: function () {},
	removeEventListener: function () {},
	createElement: function () {
		return { dataset: {}, setAttribute: function () {} };
	},
	head: { appendChild: function () {} },
	querySelector: function () {
		return null;
	}
};

const fakeStorage = {
	value: {},
	getItem: function (key) {
		return key in this.value ? this.value[key] : null;
	},
	setItem: function (key, value) {
		this.value[key] = String(value);
	},
	removeItem: function (key) {
		delete this.value[key];
	}
};

const captured = { spec: null };
const sandboxWindow = {
	__ModuleLoader__: {
		load: function (spec) {
			captured.spec = spec;
		}
	},
	localStorage: fakeStorage
};
const sandbox = {
	window: sandboxWindow,
	document: fakeDocument,
	localStorage: fakeStorage,
	navigator: { language: "zh-CN" },
	console: console,
	queueMicrotask: function (fn) {
		fn();
	},
	setTimeout: setTimeout,
	clearTimeout: clearTimeout
};

const source = fs.readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
vm.runInNewContext(source, sandbox, { filename: "lib/client.js" });

if (!captured.spec) throw new Error("client bundle did not call window.__ModuleLoader__.load");
if (captured.spec.id !== "dsh-better-setting") throw new Error("unexpected module id: " + captured.spec.id);

const moduleExports = captured.spec.factory(function (name) {
	if (name === "react") return FakeReact;
	if (name === "react-dom") return { createPortal: function (node) { return node; } };
	throw new Error("unexpected require(" + name + ")");
});

if (!Array.isArray(moduleExports.inject)) throw new Error("inject must be a plain array (dynamic runner gate)");
if (moduleExports.inject.indexOf("slots") < 0) throw new Error("inject must declare the slots service");
if (moduleExports.inject.indexOf("locale") < 0) throw new Error("inject must declare the locale service");
if (typeof moduleExports.apply !== "function") throw new Error("apply must be exported");

/* ------------------------------------------------------------------ */
/* Fake Cordis context                                                 */
/* ------------------------------------------------------------------ */

const sectionEntries = [
	{ options: { id: "account", order: -10, label: "账户" } },
	{ options: { id: "general", order: 0, label: "通用" } },
	{ options: { id: "general", order: 0, label: "通用副本" } },
	{ options: { id: "plugins", order: 15, label: "插件" } },
	{ options: { id: "market", order: 40, label: "Market" } },
	{ options: { id: "badge", order: 0 } }
];

const registrations = [];
let currentTarget = null;

const ctx = {
	effect: function (fn) {
		fn();
		return function () {};
	},
	locale: {
		register: function () {
			return function () {};
		},
		bind: function () {
			return function (key) {
				return String(key);
			};
		},
		getSnapshot: function () {
			return { active: "zh-CN" };
		},
		subscribe: function () {
			return function () {};
		}
	},
	slots: {
		inject: function (target, callback) {
			currentTarget = target;
			return callback();
		},
		register: function (options, component) {
			registrations.push({ target: currentTarget, options: options, component: component });
			return function () {};
		},
		entriesOfSlot: function (key) {
			return key === "settings.section" ? sectionEntries : [];
		},
		entries: function (key) {
			return key === "settings.section" ? sectionEntries : [];
		},
		subscribe: function () {
			return function () {};
		}
	}
};

moduleExports.apply(ctx);

function registration(target) {
	const found = registrations.filter(function (item) {
		return item.target === target;
	});
	if (found.length !== 1) throw new Error("expected exactly one registration for " + target + ", got " + found.length);
	return found[0];
}

const seat = registration("sidebar.settings");
const headerEntry = registration("conversation.session.header.utilities");

if (!seat.options.children || !seat.options.children["settings.section"]) {
	throw new Error("the settings seat must declare settings.section as a child");
}
if (!seat.options.children["settings.launcher"]) {
	throw new Error("the settings seat must declare settings.launcher (account menu) as a child");
}
if (seat.options.children["settings.section"].kind !== "list") throw new Error("settings.section must be a list child");
if (seat.options.children["settings.section"].scope !== "root") throw new Error("settings.section must be root-scoped");
if (headerEntry.options.name !== "conversation.session.header.utilities" || headerEntry.options.id !== "better-setting") {
	throw new Error("header entry id mismatch");
}

const seatProps = seat.options.inject();
if (!seatProps.prefs || !seatProps.sections) throw new Error("seat inject() must provide prefs + sections");

/* ------------------------------------------------------------------ */
/* Render walk                                                         */
/* ------------------------------------------------------------------ */

function walk(node) {
	hookIndex = 0;
	return walkNode(node);
}

function walkNode(node) {
	if (node === null || node === undefined || node === false) return null;
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) {
		return node.map(walkNode).filter(function (item) {
			return item !== null;
		});
	}
	if (!node.__el) return null;
	const type = node.type;
	if (typeof type === "function") {
		const props = Object.assign({}, node.props, { children: node.children });
		let output;
		if (type.prototype && type.prototype.render) {
			output = new type(props).render();
		} else {
			output = type(props);
		}
		return walkNode(output);
	}
	return {
		tag: type,
		props: node.props,
		children: node.children.map(walkNode).filter(function (item) {
			return item !== null;
		})
	};
}

function text(node) {
	if (node === null || node === undefined) return "";
	if (typeof node === "string") return node;
	if (Array.isArray(node)) return node.map(text).join(" ");
	return text(node.children);
}

function findAll(node, predicate, out) {
	const result = out || [];
	if (!node || typeof node !== "object") return result;
	if (!node.tag) {
		Array.isArray(node) && node.forEach(function (child) { findAll(child, predicate, result); });
		return result;
	}
	if (predicate(node)) result.push(node);
	(node.children || []).forEach(function (child) {
		findAll(child, predicate, result);
	});
	return result;
}

function hasText(root, needle) {
	return text(root).indexOf(needle) >= 0;
}

/* renderSlot stand-in: records calls and returns markers we can inspect. */
const slotCalls = [];
function renderSlot(key, owner, options) {
	slotCalls.push({ key: key, owner: owner, options: options });
	if (key === "settings.launcher") {
		return FakeReact.createElement(
			"button",
			{
				"data-launcher": "1",
				onClick: function () {
					owner.openSettings();
				}
			},
			"launcher"
		);
	}
	if (key === "settings.section") {
		if (typeof owner.close !== "function") throw new Error("settings.section must receive close()");
		return FakeReact.createElement("div", { "data-section": options && options.only ? options.only : "none" }, "SECTION:" + (options && options.only));
	}
	return null;
}

const seatRenderProps = Object.assign({}, seatProps, {
	wide: true,
	renderSlot: renderSlot,
	t: function (key) {
		return String(key);
	}
});

/* closed seat: launcher rendered, no dialog, no section render */
slotCalls.length = 0;
let tree = walk(FakeReact.createElement(seat.component, seatRenderProps));
if (findAll(tree, function (node) { return node.props.role === "dialog"; }).length !== 0) {
	throw new Error("the dialog must stay closed until the user opens it");
}
const launchers = findAll(tree, function (node) { return node.props["data-launcher"] === "1"; });
if (launchers.length !== 1) throw new Error("the seat must render the launcher slot exactly once");
if (slotCalls.some(function (call) { return call.key === "settings.section"; })) {
	throw new Error("settings.section must not render while the dialog is closed");
}

/* open via the launcher (the account menu calls openSettings) */
launchers[0].props.onClick();
tree = walk(FakeReact.createElement(seat.component, seatRenderProps));
const dialogs = findAll(tree, function (node) { return node.props.role === "dialog"; });
if (dialogs.length !== 1) throw new Error("one dialog expected after opening, got " + dialogs.length);
if (dialogs[0].props["aria-modal"] !== "true") throw new Error("dialog must be modal");
if (!hasText(tree, "hubTitle")) throw new Error("dialog must show its title");

const sectionCalls = slotCalls.filter(function (call) { return call.key === "settings.section"; });
if (sectionCalls.length === 0) throw new Error("the open dialog must render the active settings section");
if (sectionCalls[0].options.only !== "account") {
	throw new Error("the first section must be account (lowest order), got " + sectionCalls[0].options.only);
}
const sections = findAll(tree, function (node) { return typeof node.props["data-section"] === "string"; });
if (sections.length !== 1) throw new Error("exactly one section must be rendered, got " + sections.length);
if (sections[0].props["data-section"] !== "account") throw new Error("rendered section mismatch: " + sections[0].props["data-section"]);

/* prefs drive hiding + reordering without touching the section list */
seatProps.prefs.moveBy(seatProps.sections.getSnapshot(), "market", -1);
seatProps.prefs.setHidden("plugins", true);
tree = walk(FakeReact.createElement(seat.component, seatRenderProps));
if (!hasText(tree, "hidden")) throw new Error("hidden group caption missing after hiding a section");

/* closing keeps the launcher alive */
function closeButton(root) {
	const found = findAll(root, function (node) {
		return node.props.title === "close" || node.props["aria-label"] === "close";
	});
	if (found.length !== 1) throw new Error("dialog must have exactly one close button, got " + found.length);
	return found[0];
}
closeButton(tree).props.onClick();
tree = walk(FakeReact.createElement(seat.component, seatRenderProps));
if (findAll(tree, function (node) { return node.props.role === "dialog"; }).length !== 0) {
	throw new Error("closing the dialog must unmount it");
}

/* header gear button opens the hub */
const buttonTree = walk(FakeReact.createElement(headerEntry.component, {}));
const gear = findAll(buttonTree, function (node) { return node.tag === "button"; });
if (gear.length === 0) throw new Error("header entry must render a button");
gear[0].props.onClick();
tree = walk(FakeReact.createElement(seat.component, seatRenderProps));
if (findAll(tree, function (node) { return node.props.role === "dialog"; }).length !== 1) {
	throw new Error("clicking the header gear must open the dialog");
}
closeButton(tree).props.onClick();

console.log("smoke OK");
console.log(
	"registrations:",
	registrations
		.map(function (item) {
			return item.options.name + (item.options.id ? ":" + item.options.id : item.options.key ? ":" + item.options.key : "");
		})
		.join(", ")
);
console.log("seat children:", Object.keys(seat.options.children).join(", "));
console.log(
	"sections:",
	sectionEntries
		.map(function (entry) {
			return (entry.options.id || "?") + "(" + (entry.options.order === undefined ? "?" : entry.options.order) + ")";
		})
		.join(", ")
);
