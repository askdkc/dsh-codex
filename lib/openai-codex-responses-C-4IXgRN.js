import { n as __commonJSMin, t as getProviderEnvValue } from "./provider-env-D8JiX5Py.js";
import { a as getDeclaredTools, c as resolveTranscript, d as getSystemMessageText, f as ownedSlice, g as formatThrownValue, h as createAssistantMessageDiagnostic, l as resolveTranscriptTools, m as appendAssistantMessageDiagnostic, n as clampThinkingLevel, o as getInitialSystemMessage, p as renderSystemMessageUpdate, s as normalizeContext, t as calculateCost, u as getIdentityHeaders, v as AssistantMessageEventStream } from "./models-BviEw69G.js";
//#region node_modules/.pnpm/partial-json@0.1.7/node_modules/partial-json/dist/options.js
var require_options = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Sometimes you don't allow every type to be partially parsed.
	* For example, you may not want a partial number because it may increase its size gradually before it's complete.
	* In this case, you can use the `Allow` object to control what types you allow to be partially parsed.
	* @module
	*/
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Allow = exports.ALL = exports.COLLECTION = exports.ATOM = exports.SPECIAL = exports.INF = exports._INFINITY = exports.INFINITY = exports.NAN = exports.BOOL = exports.NULL = exports.OBJ = exports.ARR = exports.NUM = exports.STR = void 0;
	/**
	* allow partial strings like `"hello \u12` to be parsed as `"hello "`
	*/
	exports.STR = 1;
	/**
	* allow partial numbers like `123.` to be parsed as `123`
	*/
	exports.NUM = 2;
	/**
	* allow partial arrays like `[1, 2,` to be parsed as `[1, 2]`
	*/
	exports.ARR = 4;
	/**
	* allow partial objects like `{"a": 1, "b":` to be parsed as `{"a": 1}`
	*/
	exports.OBJ = 8;
	/**
	* allow `nu` to be parsed as `null`
	*/
	exports.NULL = 16;
	/**
	* allow `tr` to be parsed as `true`, and `fa` to be parsed as `false`
	*/
	exports.BOOL = 32;
	/**
	* allow `Na` to be parsed as `NaN`
	*/
	exports.NAN = 64;
	/**
	* allow `Inf` to be parsed as `Infinity`
	*/
	exports.INFINITY = 128;
	/**
	* allow `-Inf` to be parsed as `-Infinity`
	*/
	exports._INFINITY = 256;
	exports.INF = exports.INFINITY | exports._INFINITY;
	exports.SPECIAL = exports.NULL | exports.BOOL | exports.INF | exports.NAN;
	exports.ATOM = exports.STR | exports.NUM | exports.SPECIAL;
	exports.COLLECTION = exports.ARR | exports.OBJ;
	exports.ALL = exports.ATOM | exports.COLLECTION;
	/**
	* Control what types you allow to be partially parsed.
	* The default is to allow all types to be partially parsed, which in most casees is the best option.
	* @example
	* If you don't want to allow partial objects, you can use the following code:
	* ```ts
	* import { Allow, parse } from "partial-json";
	* parse(`[{"a": 1, "b": 2}, {"a": 3,`, Allow.ARR); // [ { a: 1, b: 2 } ]
	* ```
	* Or you can use `~` to disallow a type:
	* ```ts
	* parse(`[{"a": 1, "b": 2}, {"a": 3,`, ~Allow.OBJ); // [ { a: 1, b: 2 } ]
	* ```
	* @example
	* If you don't want to allow partial strings, you can use the following code:
	* ```ts
	* import { Allow, parse } from "partial-json";
	* parse(`["complete string", "incompl`, ~Allow.STR); // [ 'complete string' ]
	* ```
	*/
	exports.Allow = {
		STR: exports.STR,
		NUM: exports.NUM,
		ARR: exports.ARR,
		OBJ: exports.OBJ,
		NULL: exports.NULL,
		BOOL: exports.BOOL,
		NAN: exports.NAN,
		INFINITY: exports.INFINITY,
		_INFINITY: exports._INFINITY,
		INF: exports.INF,
		SPECIAL: exports.SPECIAL,
		ATOM: exports.ATOM,
		COLLECTION: exports.COLLECTION,
		ALL: exports.ALL
	};
	exports.default = exports.Allow;
}));
(/* @__PURE__ */ __commonJSMin(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __exportStar = exports && exports.__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Allow = exports.MalformedJSON = exports.PartialJSON = exports.parseJSON = exports.parse = void 0;
	const options_1 = require_options();
	Object.defineProperty(exports, "Allow", {
		enumerable: true,
		get: function() {
			return options_1.Allow;
		}
	});
	__exportStar(require_options(), exports);
	var PartialJSON = class extends Error {};
	exports.PartialJSON = PartialJSON;
	var MalformedJSON = class extends Error {};
	exports.MalformedJSON = MalformedJSON;
	/**
	* Parse incomplete JSON
	* @param {string} jsonString Partial JSON to be parsed
	* @param {number} allowPartial Specify what types are allowed to be partial, see {@link Allow} for details
	* @returns The parsed JSON
	* @throws {PartialJSON} If the JSON is incomplete (related to the `allow` parameter)
	* @throws {MalformedJSON} If the JSON is malformed
	*/
	function parseJSON(jsonString, allowPartial = options_1.Allow.ALL) {
		if (typeof jsonString !== "string") throw new TypeError(`expecting str, got ${typeof jsonString}`);
		if (!jsonString.trim()) throw new Error(`${jsonString} is empty`);
		return _parseJSON(jsonString.trim(), allowPartial);
	}
	exports.parseJSON = parseJSON;
	const _parseJSON = (jsonString, allow) => {
		const length = jsonString.length;
		let index = 0;
		const markPartialJSON = (msg) => {
			throw new PartialJSON(`${msg} at position ${index}`);
		};
		const throwMalformedError = (msg) => {
			throw new MalformedJSON(`${msg} at position ${index}`);
		};
		const parseAny = () => {
			skipBlank();
			if (index >= length) markPartialJSON("Unexpected end of input");
			if (jsonString[index] === "\"") return parseStr();
			if (jsonString[index] === "{") return parseObj();
			if (jsonString[index] === "[") return parseArr();
			if (jsonString.substring(index, index + 4) === "null" || options_1.Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
				index += 4;
				return null;
			}
			if (jsonString.substring(index, index + 4) === "true" || options_1.Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
				index += 4;
				return true;
			}
			if (jsonString.substring(index, index + 5) === "false" || options_1.Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
				index += 5;
				return false;
			}
			if (jsonString.substring(index, index + 8) === "Infinity" || options_1.Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
				index += 8;
				return Infinity;
			}
			if (jsonString.substring(index, index + 9) === "-Infinity" || options_1.Allow._INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
				index += 9;
				return -Infinity;
			}
			if (jsonString.substring(index, index + 3) === "NaN" || options_1.Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
				index += 3;
				return NaN;
			}
			return parseNum();
		};
		const parseStr = () => {
			const start = index;
			let escape = false;
			index++;
			while (index < length && (jsonString[index] !== "\"" || escape && jsonString[index - 1] === "\\")) {
				escape = jsonString[index] === "\\" ? !escape : false;
				index++;
			}
			if (jsonString.charAt(index) == "\"") try {
				return JSON.parse(jsonString.substring(start, ++index - Number(escape)));
			} catch (e) {
				throwMalformedError(String(e));
			}
			else if (options_1.Allow.STR & allow) try {
				return JSON.parse(jsonString.substring(start, index - Number(escape)) + "\"");
			} catch (e) {
				return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + "\"");
			}
			markPartialJSON("Unterminated string literal");
		};
		const parseObj = () => {
			index++;
			skipBlank();
			const obj = {};
			try {
				while (jsonString[index] !== "}") {
					skipBlank();
					if (index >= length && options_1.Allow.OBJ & allow) return obj;
					const key = parseStr();
					skipBlank();
					index++;
					try {
						obj[key] = parseAny();
					} catch (e) {
						if (options_1.Allow.OBJ & allow) return obj;
						else throw e;
					}
					skipBlank();
					if (jsonString[index] === ",") index++;
				}
			} catch (e) {
				if (options_1.Allow.OBJ & allow) return obj;
				else markPartialJSON("Expected '}' at end of object");
			}
			index++;
			return obj;
		};
		const parseArr = () => {
			index++;
			const arr = [];
			try {
				while (jsonString[index] !== "]") {
					arr.push(parseAny());
					skipBlank();
					if (jsonString[index] === ",") index++;
				}
			} catch (e) {
				if (options_1.Allow.ARR & allow) return arr;
				markPartialJSON("Expected ']' at end of array");
			}
			index++;
			return arr;
		};
		const parseNum = () => {
			if (index === 0) {
				if (jsonString === "-") throwMalformedError("Not sure what '-' is");
				try {
					return JSON.parse(jsonString);
				} catch (e) {
					if (options_1.Allow.NUM & allow) try {
						return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
					} catch (e) {}
					throwMalformedError(String(e));
				}
			}
			const start = index;
			if (jsonString[index] === "-") index++;
			while (jsonString[index] && ",]}".indexOf(jsonString[index]) === -1) index++;
			if (index == length && !(options_1.Allow.NUM & allow)) markPartialJSON("Unterminated number literal");
			try {
				return JSON.parse(jsonString.substring(start, index));
			} catch (e) {
				if (jsonString.substring(start, index) === "-") markPartialJSON("Not sure what '-' is");
				try {
					return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
				} catch (e) {
					throwMalformedError(String(e));
				}
			}
		};
		const skipBlank = () => {
			while (index < length && " \n\r	".includes(jsonString[index])) index++;
		};
		return parseAny();
	};
	exports.parse = parseJSON;
})))();
const VALID_JSON_ESCAPES = /* @__PURE__ */ new Set([
	"\"",
	"\\",
	"/",
	"b",
	"f",
	"n",
	"r",
	"t"
]);
function isControlCharacter(char) {
	const codePoint = char.codePointAt(0);
	return codePoint !== void 0 && codePoint >= 0 && codePoint <= 31;
}
function escapeControlCharacter(char) {
	switch (char) {
		case "\b": return "\\b";
		case "\f": return "\\f";
		case "\n": return "\\n";
		case "\r": return "\\r";
		case "	": return "\\t";
		default: return `\\u${char.codePointAt(0)?.toString(16).padStart(4, "0") ?? "0000"}`;
	}
}
/**
* Repairs malformed JSON string literals by:
* - escaping raw control characters inside strings
* - doubling backslashes before invalid escape characters
*/
function repairJson(json) {
	let repaired = "";
	let inString = false;
	for (let index = 0; index < json.length; index++) {
		const char = json[index];
		if (!inString) {
			repaired += char;
			if (char === "\"") inString = true;
			continue;
		}
		if (char === "\"") {
			repaired += char;
			inString = false;
			continue;
		}
		if (char === "\\") {
			const nextChar = json[index + 1];
			if (nextChar === void 0) {
				repaired += "\\\\";
				continue;
			}
			if (nextChar === "u") {
				const unicodeDigits = json.slice(index + 2, index + 6);
				if (/^[0-9a-fA-F]{4}$/.test(unicodeDigits)) {
					repaired += `\\u${unicodeDigits}`;
					index += 5;
					continue;
				}
			}
			if (VALID_JSON_ESCAPES.has(nextChar)) {
				repaired += `\\${nextChar}`;
				index += 1;
				continue;
			}
			repaired += "\\\\";
			continue;
		}
		repaired += isControlCharacter(char) ? escapeControlCharacter(char) : char;
	}
	return repaired;
}
function parseJsonWithRepair(json) {
	try {
		return JSON.parse(json);
	} catch (error) {
		const repairedJson = repairJson(json);
		if (repairedJson !== json) return JSON.parse(repairedJson);
		throw error;
	}
}
/**
* Parses the model's complete arguments text of a finished tool call.
*
* Unlike {@link parseStreamingJson}, this never keeps a partially parsed prefix: once the call is
* finished, text that is not a valid JSON object means the model sent malformed arguments. In that
* case `arguments` is `{}` and `argumentsError` describes the problem, including the text the
* model sent, so tool validation can report it back to the model.
*/
function parseToolCallArguments(json) {
	if (!json?.trim()) return { arguments: {} };
	try {
		const parsed = parseJsonWithRepair(json);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Tool arguments must be a JSON object");
		return { arguments: parsed };
	} catch (error) {
		return {
			arguments: {},
			argumentsError: `${error instanceof Error ? error.message : String(error)}\n\nReceived arguments:\n${json}`
		};
	}
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/streaming-json.js
/**
* Incremental, tolerant parsing of JSON text that arrives in pieces, such as streamed tool-call arguments.
*
* `StreamingJsonParser.append()` reads each piece once, so a stream costs time and memory linear in its length, and
* `snapshot()` returns the value of the text read so far. Snapshots are plain JSON values and never change once
* returned: the parser copies the containers that are still open (the "open path") into every new snapshot and shares
* completed containers and strings. The rules for incomplete text follow `parseStreamingJson()`:
*
* - An unterminated string shows the characters read so far; an unterminated escape is held back until complete.
* - An unterminated container shows the members and elements read so far.
* - A member whose key or value has not started is omitted.
* - An unterminated literal shows its value once it is a prefix of `true`, `false` or `null`; an unterminated number
*   shows its value when the digits read so far form a number (an exponent without digits is ignored).
*
* Malformed text is read leniently, the way `repairJson()` and `parseStreamingJson()` treat it: raw control characters
* in strings are kept, an invalid escape such as `\d` stays literal text, missing commas and colons are tolerated,
* values in invalid positions and unknown words are dropped, and text after the root value is ignored. The parser never
* throws. Callers that need the exact value of the finished text parse it once, e.g. with `parseToolCallArguments()`.
*
* Differences from `parseStreamingJson()` on incomplete text: trailing whitespace inside an unterminated string is
* kept (it was trimmed), a string that contains a raw control character or an invalid escape stays visible while it
* streams (it was dropped until the document was complete), and `NaN` and `Infinity` words are dropped.
*
* `append()` also returns the changes the piece made, for a writer that keeps its own copy of the value and applies
* them instead of re-assigning snapshots: `set` when a key, an array item or a finished value appears (a new string is
* set once with its first text, a container empty), `append` when the piece extended an open string. Unterminated
* numbers and literals are not reported until they end. A container nested more than 32 levels deep is reported as one
* `set` of its whole value when it closes, so paths stay short.
*
* Cost: copying the open path costs its member and element count. Each `append()` earns copy credit proportional to its
* length plus a constant; `snapshot()` spends it and returns the previous snapshot while the open path costs more than
* the credit. So a document that keeps a very large container open (thousands of elements) shows a preview that lags
* a little behind the text, and no input makes the total work grow faster than the text.
*/
const MAX_REPORTED_DEPTH = 32;
const ROOT_SLOT = { kind: "root" };
const CREDIT_PER_APPEND = 256;
const CREDIT_PER_CHARACTER = 8;
const MAX_PENDING_SCALAR_LENGTH = 64;
const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const NUMBER_WITHOUT_EXPONENT_DIGITS = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE][+-]?$/;
const LITERALS = [
	["true", true],
	["false", false],
	["null", null]
];
const QUOTE = 34;
const BACKSLASH = 92;
/** Incremental, tolerant JSON parser; see the module comment for its rules and costs. */
var StreamingJsonParser = class {
	#root = void 0;
	#done = false;
	#stack = [];
	#string = void 0;
	#scalar = "";
	#scalarSlot = void 0;
	/** Sum of `size + 1` over the open path: what a fresh snapshot copies. */
	#pathCost = 0;
	#credit = 0;
	#dirty = false;
	#snapshot = void 0;
	/** Changes of the piece being read. */
	#changes = [];
	/**
	* Read the next piece of text; returns the changes it made, in order. Costs time linear in `text.length`.
	*/
	append(text) {
		this.#credit += CREDIT_PER_APPEND + CREDIT_PER_CHARACTER * text.length;
		this.#changes = [];
		if (this.#string !== void 0) this.#string.change = void 0;
		let index = 0;
		while (index < text.length && !this.#done) {
			const open = this.#string;
			if (open !== void 0) index = this.#readString(open, text, index);
			else if (this.#scalar !== "") index = this.#readScalar(text, index);
			else this.#structural(text[index++]);
		}
		return this.#changes;
	}
	/**
	* The value of the text read so far: `undefined` before a value starts, otherwise a plain JSON value that never
	* changes afterwards. Returns the previous snapshot while the text read since did not change the value, or while a
	* fresh copy of the open path is not yet paid for (see the module comment).
	*/
	snapshot() {
		if (!this.#dirty) return this.#snapshot;
		const pending = this.#pendingScalar();
		const cost = this.#pathCost + (pending === void 0 ? 0 : 1);
		if (cost > this.#credit) return this.#snapshot;
		this.#credit -= cost;
		this.#dirty = false;
		this.#snapshot = this.#copyOpenPath(pending);
		return this.#snapshot;
	}
	/** Read string characters from `start` until the string ends or the text does; returns the next index. */
	#readString(open, text, start) {
		let runStart = start;
		for (let index = start; index < text.length; index++) {
			const code = text.charCodeAt(index);
			if (open.escape !== "") {
				if (this.#continueEscape(open, text[index])) {
					runStart = index + 1;
					continue;
				}
				runStart = index;
			}
			if (code === QUOTE) {
				if (index > runStart) this.#appendString(open, text.slice(runStart, index));
				this.#endString(open);
				return index + 1;
			}
			if (code === BACKSLASH) {
				if (index > runStart) this.#appendString(open, text.slice(runStart, index));
				open.escape = "\\";
				runStart = index + 1;
			}
		}
		if (text.length > runStart) this.#appendString(open, text.slice(runStart));
		return text.length;
	}
	/** Read number or literal characters from `start` up to the next delimiter; returns the delimiter's index. */
	#readScalar(text, start) {
		let end = start;
		while (end < text.length && !isDelimiter(text[end])) end++;
		if (end > start) {
			this.#scalar += text.slice(start, end);
			if (this.#scalarSlot !== void 0) this.#dirty = true;
		}
		if (end < text.length) this.#endScalar();
		return end;
	}
	/** Handle one character outside strings. */
	#structural(char) {
		switch (char) {
			case " ":
			case "	":
			case "\n":
			case "\r": return;
			case "\"":
				this.#startString();
				return;
			case "{":
			case "[":
				this.#openContainer(char === "{" ? {} : []);
				return;
			case "}":
			case "]":
				this.#closeContainer();
				return;
			case ":": {
				const frame = this.#stack.at(-1);
				if (frame !== void 0 && !Array.isArray(frame.container) && frame.phase === "colon") frame.phase = "value";
				return;
			}
			case ",": {
				const frame = this.#stack.at(-1);
				if (frame !== void 0) frame.phase = Array.isArray(frame.container) ? "value" : "key";
				return;
			}
			default:
				this.#scalar = char;
				this.#scalarSlot = this.#valueSlot();
				if (this.#scalarSlot !== void 0) this.#dirty = true;
		}
	}
	/** Where a value starting now goes, or `undefined` when this position takes no value. */
	#valueSlot() {
		const frame = this.#stack.at(-1);
		if (frame === void 0) return this.#root === void 0 ? ROOT_SLOT : void 0;
		if (Array.isArray(frame.container)) return {
			kind: "element",
			index: frame.container.length
		};
		if ((frame.phase === "value" || frame.phase === "colon") && frame.key !== void 0) return {
			kind: "member",
			key: frame.key
		};
	}
	#startString() {
		const frame = this.#stack.at(-1);
		if (frame !== void 0 && !Array.isArray(frame.container) && (frame.phase === "key" || frame.phase === "comma")) {
			this.#string = {
				target: "key",
				slot: void 0,
				text: "",
				escape: "",
				path: void 0,
				change: void 0
			};
			return;
		}
		const slot = this.#valueSlot();
		const path = this.#reportedPath(slot);
		this.#string = {
			target: "value",
			slot,
			text: "",
			escape: "",
			path,
			change: void 0
		};
		this.#place(slot, "");
		if (path !== void 0) this.#string.change = this.#report({
			kind: "set",
			path,
			value: ""
		});
	}
	/** The path of a value at `slot` in the innermost open container, when its changes are reported. */
	#reportedPath(slot) {
		if (slot === void 0) return void 0;
		if (slot.kind === "root") return [];
		const frame = this.#stack.at(-1);
		if (!frame.reportsInside) return void 0;
		return [...frame.path, slot.kind === "member" ? slot.key : slot.index];
	}
	#report(change) {
		this.#changes.push(change);
		return change;
	}
	/** Continue an escape with `char`; returns false when `char` is not part of it and must be read normally. */
	#continueEscape(open, char) {
		if (open.escape === "\\") {
			const decoded = SIMPLE_ESCAPES[char];
			if (decoded !== void 0) {
				open.escape = "";
				this.#appendString(open, decoded);
				return true;
			}
			if (char === "u") {
				open.escape = "\\u";
				return true;
			}
			open.escape = "";
			this.#appendString(open, "\\");
			return false;
		}
		if (isHexDigit(char)) {
			open.escape += char;
			if (open.escape.length < 6) return true;
			const decoded = String.fromCharCode(Number.parseInt(open.escape.slice(2), 16));
			open.escape = "";
			this.#appendString(open, decoded);
			return true;
		}
		const literal = open.escape;
		open.escape = "";
		this.#appendString(open, literal);
		return false;
	}
	#appendString(open, text) {
		open.text += text;
		if (open.target !== "value") return;
		this.#place(open.slot, open.text);
		if (open.path === void 0) return;
		const change = open.change;
		if (change !== void 0 && this.#changes.at(-1) === change) {
			if (change.kind === "set") change.value = change.value + text;
			else change.text += text;
			return;
		}
		open.change = this.#report({
			kind: "append",
			path: open.path,
			text
		});
	}
	#endString(open) {
		this.#string = void 0;
		const frame = this.#stack.at(-1);
		if (open.target === "key") {
			if (frame === void 0) return;
			frame.key = open.text;
			frame.phase = "colon";
			return;
		}
		this.#valueEnded(frame);
	}
	#endScalar() {
		const token = this.#scalar;
		const slot = this.#scalarSlot;
		this.#scalar = "";
		this.#scalarSlot = void 0;
		const value = scalarValue(token);
		if (value !== void 0) {
			this.#place(slot, value);
			const path = this.#reportedPath(slot);
			if (path !== void 0) this.#report({
				kind: "set",
				path,
				value
			});
		}
		this.#valueEnded(this.#stack.at(-1));
	}
	/** The value of the unterminated scalar at the end of the text, if it shows. */
	#pendingScalar() {
		const slot = this.#scalarSlot;
		const token = this.#scalar;
		if (slot === void 0 || token === "" || token.length > MAX_PENDING_SCALAR_LENGTH) return void 0;
		const value = pendingScalarValue(token);
		return value === void 0 ? void 0 : {
			slot,
			value
		};
	}
	#openContainer(container) {
		const slot = this.#valueSlot();
		const path = this.#reportedPath(slot);
		this.#place(slot, container);
		this.#stack.push({
			container,
			slot,
			path,
			reportsInside: path !== void 0 && path.length < MAX_REPORTED_DEPTH,
			size: 0,
			key: void 0,
			phase: Array.isArray(container) ? "value" : "key"
		});
		this.#pathCost += 1;
		this.#dirty = true;
		if (path !== void 0) this.#report({
			kind: "set",
			path,
			value: Array.isArray(container) ? [] : {}
		});
	}
	#closeContainer() {
		const frame = this.#stack.pop();
		if (frame === void 0) return;
		this.#pathCost -= frame.size + 1;
		this.#dirty = true;
		if (frame.path !== void 0 && !frame.reportsInside) this.#report({
			kind: "set",
			path: frame.path,
			value: frame.container
		});
		this.#valueEnded(this.#stack.at(-1));
	}
	/** A value in `frame`, or the root value when there is no frame, has ended. */
	#valueEnded(frame) {
		if (frame === void 0) {
			if (this.#root !== void 0) this.#done = true;
			return;
		}
		frame.phase = "comma";
	}
	/** Set the value at `slot` in the open path; nothing for a value in an invalid position. */
	#place(slot, value) {
		if (slot === void 0) return;
		this.#dirty = true;
		if (slot.kind === "root") {
			this.#root = value;
			return;
		}
		const frame = this.#stack.at(-1);
		if (slot.kind === "element") {
			const elements = frame.container;
			if (slot.index === elements.length) {
				frame.size++;
				this.#pathCost++;
			}
			elements[slot.index] = value;
			return;
		}
		const members = frame.container;
		if (!Object.hasOwn(members, slot.key)) {
			frame.size++;
			this.#pathCost++;
		}
		setMember(members, slot.key, value);
	}
	/** A fresh snapshot: copies of the open containers, innermost first, each holding the copy of its open child. */
	#copyOpenPath(pending) {
		if (this.#stack.length === 0) return pending?.slot.kind === "root" ? pending.value : this.#root;
		let child;
		let childSlot;
		for (let depth = this.#stack.length - 1; depth >= 0; depth--) {
			const frame = this.#stack[depth];
			const copy = Array.isArray(frame.container) ? frame.container.slice() : { ...frame.container };
			if (depth === this.#stack.length - 1 && pending !== void 0) setSlot(copy, pending.slot, pending.value);
			if (child !== void 0 && childSlot !== void 0) setSlot(copy, childSlot, child);
			child = copy;
			childSlot = frame.slot;
		}
		return childSlot?.kind === "root" ? child : this.#root;
	}
};
/**
* The arguments of one streaming tool call: the raw text, for the one full parse when the call ends, and a
* `StreamingJsonParser` for the partial arguments in between. Providers keep one per call in their own stream state,
* never on the content block, so the raw text never reaches partial messages or transcripts.
*/
var ToolCallArgumentsStream = class {
	#text = "";
	#parser = new StreamingJsonParser();
	#snapshot = void 0;
	#arguments = {};
	/** The raw argument text received so far. */
	get text() {
		return this.#text;
	}
	/** Append a piece of argument text; returns the partial arguments, a new object whenever they changed. */
	append(delta) {
		this.#text += delta;
		this.#parser.append(delta);
		return this.#partial();
	}
	/**
	* Take the provider's complete argument text. When it continues the text so far, returns the missing piece as
	* `delta`; otherwise starts over with `text`. Either way returns the partial arguments of `text`.
	*/
	replace(text) {
		if (text.startsWith(this.#text)) {
			const delta = text.slice(this.#text.length);
			return {
				delta,
				arguments: delta === "" ? this.#partial() : this.append(delta)
			};
		}
		this.#text = "";
		this.#parser = new StreamingJsonParser();
		return {
			delta: void 0,
			arguments: this.append(text)
		};
	}
	/** The final arguments: one full parse of the complete text, which reports malformed arguments. */
	finish() {
		return parseToolCallArguments(this.#text);
	}
	#partial() {
		const snapshot = this.#parser.snapshot();
		if (snapshot === this.#snapshot) return this.#arguments;
		this.#snapshot = snapshot;
		this.#arguments = typeof snapshot === "object" && snapshot !== null && !Array.isArray(snapshot) ? snapshot : {};
		return this.#arguments;
	}
};
const SIMPLE_ESCAPES = {
	"\"": "\"",
	"\\": "\\",
	"/": "/",
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	"
};
function isDelimiter(char) {
	return char === " " || char === "	" || char === "\n" || char === "\r" || char === "," || char === ":" || char === "{" || char === "}" || char === "[" || char === "]" || char === "\"";
}
function isHexDigit(char) {
	return char >= "0" && char <= "9" || char >= "a" && char <= "f" || char >= "A" && char <= "F";
}
/** The value of a complete number or literal token; `undefined` for anything else, which is dropped. */
function scalarValue(token) {
	for (const [literal, value] of LITERALS) if (token === literal) return value;
	return NUMBER.test(token) ? Number(token) : void 0;
}
/** The value an unterminated number or literal token shows. */
function pendingScalarValue(token) {
	for (const [literal, value] of LITERALS) if (literal.startsWith(token)) return value;
	if (NUMBER.test(token)) return Number(token);
	const mantissa = NUMBER_WITHOUT_EXPONENT_DIGITS.exec(token);
	return mantissa === null ? void 0 : Number(mantissa[1]);
}
function setSlot(container, slot, value) {
	if (slot.kind === "element") container[slot.index] = value;
	else if (slot.kind === "member") setMember(container, slot.key, value);
}
function setMember(members, key, value) {
	if (key === "__proto__") Object.defineProperty(members, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
	else members[key] = value;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/session-resources.js
const sessionResourceCleanups = /* @__PURE__ */ new Set();
function registerSessionResourceCleanup(cleanup) {
	sessionResourceCleanups.add(cleanup);
	return () => {
		sessionResourceCleanups.delete(cleanup);
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/uuid.js
const MAX_UUID_V7_TIMESTAMP = 0xffffffffffff;
const MAX_SEQUENCE = (1n << 41n) - 1n;
let lastOrdinaryTimestamp = -1;
let sequence;
/** Generate a time-ordered UUIDv7. A supplied timestamp is preserved for follower ids. */
function uuidv7(timestampMs) {
	const requestedTimestamp = timestampMs ?? Date.now();
	if (!Number.isInteger(requestedTimestamp) || requestedTimestamp < 0 || requestedTimestamp > MAX_UUID_V7_TIMESTAMP) throw new RangeError(`UUIDv7 timestamp must be an integer between 0 and ${MAX_UUID_V7_TIMESTAMP}`);
	const effectiveTimestamp = timestampMs === void 0 ? Math.max(requestedTimestamp, lastOrdinaryTimestamp) : timestampMs;
	if (timestampMs === void 0) lastOrdinaryTimestamp = effectiveTimestamp;
	const bytes = /* @__PURE__ */ new Uint8Array(16);
	globalThis.crypto.getRandomValues(bytes);
	if (sequence === void 0) sequence = BigInt(bytes[1]) << 32n | BigInt(bytes[2]) << 24n | BigInt(bytes[3]) << 16n | BigInt(bytes[4]) << 8n | BigInt(bytes[5]);
	else {
		if (sequence === MAX_SEQUENCE) throw new RangeError("UUIDv7 generator sequence exhausted");
		sequence++;
	}
	const timestamp = BigInt(effectiveTimestamp);
	for (let index = 5; index >= 0; index--) bytes[index] = Number(timestamp >> BigInt((5 - index) * 8)) & 255;
	bytes[6] = 112 | Number(sequence >> 37n & 15n);
	bytes[7] = Number(sequence >> 29n & 255n);
	bytes[8] = 128 | Number(sequence >> 23n & 63n);
	bytes[9] = Number(sequence >> 15n & 255n);
	bytes[10] = Number(sequence >> 7n & 255n);
	bytes[11] = Number((sequence & 127n) << 1n) | bytes[11] & 1;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
	return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/abort-signals.js
function combineAbortSignals(signals) {
	const activeSignals = signals.filter((signal) => signal !== void 0);
	if (activeSignals.length === 0) return { cleanup: () => {} };
	if (activeSignals.length === 1) return {
		signal: activeSignals[0],
		cleanup: () => {}
	};
	const controller = new AbortController();
	const listeners = [];
	const abort = (signal) => {
		if (!controller.signal.aborted) controller.abort(signal.reason);
	};
	for (const signal of activeSignals) {
		if (signal.aborted) {
			abort(signal);
			break;
		}
		const listener = () => abort(signal);
		signal.addEventListener("abort", listener, { once: true });
		listeners.push({
			signal,
			listener
		});
	}
	return {
		signal: controller.signal,
		cleanup: () => {
			for (const { signal, listener } of listeners) signal.removeEventListener("abort", listener);
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/error-body.js
const MAX_PROVIDER_ERROR_BODY_CHARS = 4e3;
function normalizeProviderError(error) {
	if (!(error instanceof Error)) return {
		message: safeJsonStringify$1(error),
		messageCarriesBody: false
	};
	const sdkError = error;
	const status = extractStatus(sdkError);
	const body = extractBody(sdkError);
	const messageCarriesBody = body === void 0 || error.message.includes(body);
	return {
		status,
		body,
		message: error.message,
		messageCarriesBody
	};
}
/**
* Probe the HTTP status, first numeric hit wins, in SDK-field order:
* `statusCode` (Mistral) → `status` (`openai`, `@google/genai`) →
* `$metadata.httpStatusCode` (Bedrock) → `$response.statusCode` (Bedrock).
*/
function extractStatus(error) {
	if (typeof error.statusCode === "number") return error.statusCode;
	if (typeof error.status === "number") return error.status;
	if (typeof error.$metadata?.httpStatusCode === "number") return error.$metadata.httpStatusCode;
	if (typeof error.$response?.statusCode === "number") return error.$response.statusCode;
}
/**
* Probe the raw body reason, first usable hit wins, in SDK-field order:
* `body` string (Mistral) → `error` parsed JSON body object (`openai` SDK's
* `this.error`) → `$response.body` (Bedrock). Empty objects and unread response
* streams are treated as no body so they do not surface as `"{}"` or serialized
* stream internals. The chosen body is truncated to the cap.
*/
function extractBody(error) {
	const bodyText = pickBodyText(error);
	if (bodyText === void 0) return void 0;
	const trimmed = bodyText.trim();
	if (trimmed.length === 0) return void 0;
	return truncateErrorText(trimmed, MAX_PROVIDER_ERROR_BODY_CHARS);
}
function pickBodyText(error) {
	if (typeof error.body === "string") return error.body;
	if (isPlainNonEmptyObject(error.error)) return safeJsonStringify$1(error.error);
	const responseBody = error.$response?.body;
	if (typeof responseBody === "string") return responseBody;
	if (isReadableStreamLike(responseBody)) return void 0;
	if (isPlainNonEmptyObject(responseBody)) return safeJsonStringify$1(responseBody);
}
function isReadableStreamLike(value) {
	return typeof value === "object" && value !== null && "pipe" in value && typeof value.pipe === "function";
}
/**
* Only a PLAIN object counts as an HTTP body. SDK error fields can hold class
* instances instead of parsed bodies — AWS SDK v3's `$response.body` is an
* HTTP stream/response wrapper object, and stringifying one produced garbage
* like `{"_events":...}` as the "body", which then REPLACED `error.message`
* in the composed display string. `error.message` is where the SDK puts the
* real deserialized exception text ("Input is too long...", schema validation
* details, ...), so the one useful string was discarded for noise. A class
* instance yields no body, `messageCarriesBody` stays true, and the real
* message survives. Complements the `pipe` sniffing above: web
* ReadableStreams (pipeTo/pipeThrough, no `pipe`) and non-stream SDK wrapper
* classes fail the prototype check, while parsed JSON bodies (plain objects
* by construction) still pass.
*/
function isPlainNonEmptyObject(value) {
	if (typeof value !== "object" || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) return false;
	return Object.keys(value).length > 0;
}
/**
* Compose a display string from a normalized error. When the message already
* carries the body (Anthropic / `@google/genai` happy path) or no body/status
* was extracted, the message is returned unchanged. Otherwise the status and
* body are surfaced, with an optional provider prefix.
*
* - no prefix: `"<status>: <body>"`
* - prefix:    `"<prefix> (<status>): <body>"`
*/
function formatProviderError(norm, prefix) {
	if (norm.messageCarriesBody || norm.status === void 0 || norm.body === void 0) return prefix !== void 0 && norm.status !== void 0 ? `${prefix} (${norm.status}): ${norm.message}` : norm.message;
	return prefix !== void 0 ? `${prefix} (${norm.status}): ${norm.body}` : `${norm.status}: ${norm.body}`;
}
function truncateErrorText(text, maxChars) {
	if (text.length <= maxChars) return text;
	return `${ownedSlice(text, 0, maxChars)}... [truncated ${text.length - maxChars} chars]`;
}
function safeJsonStringify$1(value) {
	try {
		const serialized = JSON.stringify(value);
		return serialized === void 0 ? String(value) : serialized;
	} catch {
		return String(value);
	}
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/headers.js
function headersToRecord(headers) {
	const result = {};
	for (const [key, value] of headers.entries()) result[key] = value;
	return result;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/node-http-proxy.js
const DEFAULT_PROXY_PORTS = {
	ftp: 21,
	gopher: 70,
	http: 80,
	https: 443,
	ws: 80,
	wss: 443
};
function getProxyEnv(key, env) {
	const lowercaseKey = key.toLowerCase();
	const uppercaseKey = key.toUpperCase();
	return env?.[lowercaseKey] || env?.[uppercaseKey] || getProviderEnvValue(lowercaseKey) || getProviderEnvValue(uppercaseKey) || "";
}
function parseProxyTargetUrl(targetUrl) {
	if (targetUrl instanceof URL) return targetUrl;
	try {
		return new URL(targetUrl);
	} catch {
		return;
	}
}
function stripBrackets(host) {
	return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}
function parseNoProxyEntry(entry) {
	const trimmed = entry.trim().toLowerCase();
	if (!trimmed) return void 0;
	if (trimmed.startsWith("[")) {
		const closingBracket = trimmed.indexOf("]");
		if (closingBracket !== -1) {
			const host = trimmed.slice(1, closingBracket);
			const rest = trimmed.slice(closingBracket + 1);
			if (rest.startsWith(":")) {
				const port = Number.parseInt(rest.slice(1), 10);
				return {
					host,
					port: Number.isNaN(port) ? 0 : port
				};
			}
			return {
				host,
				port: 0
			};
		}
	}
	if (trimmed.includes(":") && trimmed.split(":").length > 2) return {
		host: trimmed,
		port: 0
	};
	const colonIndex = trimmed.lastIndexOf(":");
	if (colonIndex !== -1 && colonIndex === trimmed.indexOf(":")) {
		const host = trimmed.slice(0, colonIndex);
		const port = Number.parseInt(trimmed.slice(colonIndex + 1), 10);
		if (!Number.isNaN(port)) return {
			host,
			port
		};
	}
	return {
		host: trimmed,
		port: 0
	};
}
function shouldProxyHostname(hostname, port, env) {
	const noProxy = getProxyEnv("no_proxy", env).toLowerCase();
	if (!noProxy) return true;
	if (noProxy === "*") return false;
	const normalizedTargetHost = stripBrackets(hostname.toLowerCase());
	return noProxy.split(/[,\s]/).every((entry) => {
		const parsed = parseNoProxyEntry(entry);
		if (!parsed) return true;
		if (parsed.port && parsed.port !== port) return true;
		let domain = stripBrackets(parsed.host);
		if (domain.startsWith("*.")) domain = domain.slice(2);
		else if (domain.startsWith(".") || domain.startsWith("*")) domain = domain.slice(1);
		if (!domain) return true;
		if (normalizedTargetHost === domain) return false;
		if (normalizedTargetHost.endsWith(`.${domain}`)) return false;
		return true;
	});
}
function getProxyForUrl(targetUrl, env) {
	const parsedUrl = parseProxyTargetUrl(targetUrl);
	if (!parsedUrl?.protocol || !parsedUrl.host) return "";
	const protocol = parsedUrl.protocol.split(":", 1)[0];
	if (!shouldProxyHostname(stripBrackets(parsedUrl.hostname || parsedUrl.host.replace(/:\d*$/, "")), Number.parseInt(parsedUrl.port, 10) || DEFAULT_PROXY_PORTS[protocol] || 0, env)) return "";
	let proxy = getProxyEnv(`${protocol}_proxy`, env) || getProxyEnv("all_proxy", env);
	if (proxy && !proxy.includes("://")) proxy = `${protocol}://${proxy}`;
	return proxy;
}
const UNSUPPORTED_PROXY_PROTOCOL_MESSAGE = "Unsupported proxy protocol. SOCKS and PAC proxy URLs are not supported; use an HTTP or HTTPS proxy URL.";
function resolveHttpProxyUrlForTarget(targetUrl, env) {
	const proxy = getProxyForUrl(targetUrl, env);
	if (!proxy) return;
	let proxyUrl;
	try {
		proxyUrl = new URL(proxy);
	} catch (error) {
		throw new Error(`Invalid proxy URL ${JSON.stringify(proxy)}: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (proxyUrl.protocol !== "http:" && proxyUrl.protocol !== "https:") throw new Error(`${UNSUPPORTED_PROXY_PROTOCOL_MESSAGE} Got ${proxyUrl.protocol}`);
	return proxyUrl;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/api/constrained-sampling.js
var UnsupportedStrictJsonSchemaError = class extends Error {};
const UNSUPPORTED_STRICT_SCHEMA_KEYS = [
	"$ref",
	"$defs",
	"definitions",
	"allOf",
	"oneOf",
	"patternProperties",
	"dependentSchemas",
	"dependencies",
	"unevaluatedProperties",
	"propertyNames",
	"contains",
	"prefixItems",
	"not",
	"if",
	"then",
	"else"
];
function isJsonSchemaObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStructuredSchema(schema) {
	if (!isJsonSchemaObject(schema)) return false;
	const types = typeof schema.type === "string" ? [schema.type] : Array.isArray(schema.type) ? schema.type : [];
	return types.includes("object") || types.includes("array") || schema.properties !== void 0 || schema.items !== void 0;
}
function schemaAllowsNull(schema) {
	if (!isJsonSchemaObject(schema)) return false;
	if (schema.type === "null" || Array.isArray(schema.type) && schema.type.includes("null")) return true;
	if (schema.const === null || Array.isArray(schema.enum) && schema.enum.includes(null)) return true;
	return Array.isArray(schema.anyOf) && schema.anyOf.some((variant) => schemaAllowsNull(variant));
}
function makeJsonSchemaNodeStrict(schema, isUnsupportedKeyword) {
	if (!isJsonSchemaObject(schema)) throw new UnsupportedStrictJsonSchemaError("boolean schemas are unsupported");
	for (const key of UNSUPPORTED_STRICT_SCHEMA_KEYS) if (schema[key] !== void 0) throw new UnsupportedStrictJsonSchemaError(`${key} schemas are unsupported`);
	if (isUnsupportedKeyword) {
		for (const [key, value] of Object.entries(schema)) if (isUnsupportedKeyword(key, value)) throw new UnsupportedStrictJsonSchemaError(`${key}: ${JSON.stringify(value)} is unsupported`);
	}
	if (schema.anyOf !== void 0) {
		if (!Array.isArray(schema.anyOf) || schema.anyOf.length === 0) throw new UnsupportedStrictJsonSchemaError("anyOf must contain at least one schema");
		for (const variant of schema.anyOf) {
			if (isStructuredSchema(variant)) throw new UnsupportedStrictJsonSchemaError("object and array unions are unsupported");
			makeJsonSchemaNodeStrict(variant, isUnsupportedKeyword);
		}
	}
	if (schema.items !== void 0) {
		if (Array.isArray(schema.items)) throw new UnsupportedStrictJsonSchemaError("tuple schemas are unsupported");
		makeJsonSchemaNodeStrict(schema.items, isUnsupportedKeyword);
	}
	const isObjectSchema = schema.type === "object";
	if (schema.properties !== void 0 && !isObjectSchema) throw new UnsupportedStrictJsonSchemaError("properties require type object");
	if (!isObjectSchema) return;
	if (schema.additionalProperties !== void 0 && schema.additionalProperties !== false) throw new UnsupportedStrictJsonSchemaError("schema-valued or true additionalProperties is unsupported");
	if (schema.properties !== void 0 && !isJsonSchemaObject(schema.properties)) throw new UnsupportedStrictJsonSchemaError("object properties must be a schema map");
	if (schema.required !== void 0 && (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== "string"))) throw new UnsupportedStrictJsonSchemaError("object required must be a string array");
	const properties = schema.properties ?? {};
	const propertyNames = Object.keys(properties);
	const required = new Set(Array.isArray(schema.required) ? schema.required : []);
	if ([...required].some((key) => !propertyNames.includes(key))) throw new UnsupportedStrictJsonSchemaError("required contains an unknown property");
	for (const [key, property] of Object.entries(properties)) {
		makeJsonSchemaNodeStrict(property, isUnsupportedKeyword);
		if (!required.has(key) && !schemaAllowsNull(property)) properties[key] = { anyOf: [property, { type: "null" }] };
	}
	schema.required = propertyNames;
	schema.additionalProperties = false;
}
/** Convert a tool schema to the strict subset expected by provider constrained sampling. */
function makeStrictJsonSchema(schema, isUnsupportedKeyword) {
	const cloned = structuredClone(schema);
	if (!isJsonSchemaObject(cloned)) throw new UnsupportedStrictJsonSchemaError("root schema must have type object");
	makeJsonSchemaNodeStrict(cloned, isUnsupportedKeyword);
	if (cloned.type !== "object") throw new UnsupportedStrictJsonSchemaError("root schema must have type object");
	return cloned;
}
function getJsonSchemaToolParameters(tool, strict) {
	return strict === true ? makeStrictJsonSchema(tool.parameters) : tool.parameters;
}
function getGrammarToolInput(toolName, arguments_, inputProperty) {
	const input = arguments_[inputProperty];
	if (typeof input !== "string") throw new Error(`Grammar tool call "${toolName}" requires argument "${inputProperty}" to be a string.`);
	return input;
}
/**
* Append `inputDelta` to a streaming grammar tool input and return the matching piece of its JSON arguments text, or
* `undefined` for an empty delta. Costs time linear in the delta, never in the input so far.
*/
function appendGrammarToolInputJsonDelta(buffer, inputProperty, inputDelta) {
	if (buffer.closed) throw new Error(`grammar tool input for property "${inputProperty}" changed after it was closed`);
	if (inputDelta.length === 0) return void 0;
	buffer.input += inputDelta;
	return grammarToolInputJsonStart(buffer, inputProperty) + JSON.stringify(inputDelta).slice(1, -1);
}
/**
* Close a streaming grammar tool input and return the rest of its JSON arguments text. `finalInput` is the complete
* input when the provider sends one; it must continue the input streamed so far. Closing again with the same input
* returns `undefined`.
*/
function closeGrammarToolInputJson(buffer, inputProperty, finalInput) {
	if (buffer.closed) {
		if (finalInput === void 0 || finalInput === buffer.input) return void 0;
		throw new Error(`grammar tool input for property "${inputProperty}" changed after it was closed`);
	}
	if (finalInput !== void 0 && !finalInput.startsWith(buffer.input)) throw new Error(`grammar tool input for property "${inputProperty}" changed non-monotonically`);
	const rest = finalInput === void 0 ? "" : finalInput.slice(buffer.input.length);
	if (finalInput !== void 0) buffer.input = finalInput;
	buffer.closed = true;
	return `${grammarToolInputJsonStart(buffer, inputProperty)}${JSON.stringify(rest).slice(1, -1)}"}`;
}
/** The opening of the JSON arguments text, once. */
function grammarToolInputJsonStart(buffer, inputProperty) {
	if (buffer.started) return "";
	buffer.started = true;
	return `{${JSON.stringify(inputProperty)}:"`;
}
function inferGrammarInputProperty(tool) {
	const schema = tool.parameters;
	if (schema.type !== "object") throw new Error("grammar constrained sampling requires an object parameter schema");
	if (!Array.isArray(schema.required) || schema.required.length !== 1 || typeof schema.required[0] !== "string") throw new Error("grammar constrained sampling requires exactly one required string property");
	const inputProperty = schema.required[0];
	if (!schema.properties?.[inputProperty]) throw new Error(`grammar constrained sampling requires a properties entry for ${inputProperty}`);
	if (schema.properties[inputProperty]?.type !== "string") throw new Error(`grammar constrained sampling property ${inputProperty} must have type string`);
	return inputProperty;
}
/**
* Decide whether a JSON-schema tool is sent in strict mode. `isUnsupportedKeyword` lets a provider
* reject extra keywords its strict mode does not accept, so "prefer" tools fall back to non-strict.
*/
function resolveJsonSchemaStrictSampling(tool, supportsStrictMode, isUnsupportedKeyword) {
	const config = tool.constrainedSampling;
	if (!config || config.type !== "json_schema") return void 0;
	if (supportsStrictMode) try {
		makeStrictJsonSchema(tool.parameters, isUnsupportedKeyword);
		return true;
	} catch (error) {
		if (!(error instanceof UnsupportedStrictJsonSchemaError)) throw error;
		if (config.strict !== "require") return void 0;
		throw new Error(`Tool "${tool.name}" requires JSON-schema constrained sampling, but ${error.message}.`);
	}
	if (config.strict === "require") throw new Error(`Tool "${tool.name}" requires JSON-schema constrained sampling, but strict tools are unsupported.`);
}
function resolveGrammarConstrainedSampling(tool, supportsOpenAIGrammarTools) {
	const config = tool.constrainedSampling;
	if (!config || config.type !== "grammar") return;
	if (!supportsOpenAIGrammarTools) return;
	const larkDefinition = config.variants.openai_lark;
	const regexDefinition = config.variants.openai_regex;
	const hasLarkDefinition = typeof larkDefinition === "string" && larkDefinition.trim().length > 0;
	const hasRegexDefinition = typeof regexDefinition === "string" && regexDefinition.trim().length > 0;
	if (!hasLarkDefinition && !hasRegexDefinition) throw new Error(`Tool "${tool.name}" cannot use grammar constrained sampling: no supported grammar variant was provided.`);
	try {
		return {
			format: hasLarkDefinition ? "lark" : "regex",
			definition: hasLarkDefinition ? larkDefinition : regexDefinition,
			inputProperty: inferGrammarInputProperty(tool)
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Tool "${tool.name}" cannot use grammar constrained sampling: ${message}.`);
	}
}
function createGrammarToolInputProperties(tools, supportsOpenAIGrammarTools) {
	const properties = /* @__PURE__ */ new Map();
	for (const tool of tools ?? []) {
		const grammar = resolveGrammarConstrainedSampling(tool, supportsOpenAIGrammarTools);
		if (grammar) properties.set(tool.name, grammar.inputProperty);
	}
	return properties;
}
function clampOpenAIPromptCacheKey(key) {
	if (key === void 0) return void 0;
	const chars = Array.from(key);
	if (chars.length <= 64) return key;
	return chars.slice(0, 64).join("");
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/hash.js
/** Fast deterministic hash to shorten long strings */
function shortHash(str) {
	let h1 = 3735928559;
	let h2 = 1103547991;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
	h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
	return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/sanitize-unicode.js
/**
* Removes unpaired Unicode surrogate characters from a string.
*
* Unpaired surrogates (high surrogates 0xD800-0xDBFF without matching low surrogates 0xDC00-0xDFFF,
* or vice versa) cause JSON serialization errors in many API providers.
*
* Valid emoji and other characters outside the Basic Multilingual Plane use properly paired
* surrogates and will NOT be affected by this function.
*
* @param text - The text to sanitize
* @returns The sanitized text with unpaired surrogates removed
*
* @example
* // Valid emoji (properly paired surrogates) are preserved
* sanitizeSurrogates("Hello 🙈 World") // => "Hello 🙈 World"
*
* // Unpaired high surrogate is removed
* const unpaired = String.fromCharCode(0xD83D); // high surrogate without low
* sanitizeSurrogates(`Text ${unpaired} here`) // => "Text  here"
*/
function sanitizeSurrogates(text) {
	return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/api/transform-messages.js
const NON_VISION_USER_IMAGE_PLACEHOLDER = "(image omitted: model does not support images)";
const NON_VISION_TOOL_IMAGE_PLACEHOLDER = "(tool image omitted: model does not support images)";
function replaceImagesWithPlaceholder(content, placeholder) {
	const result = [];
	let previousWasPlaceholder = false;
	for (const block of content) {
		if (block.type === "image") {
			if (!previousWasPlaceholder) result.push({
				type: "text",
				text: placeholder
			});
			previousWasPlaceholder = true;
			continue;
		}
		result.push(block);
		previousWasPlaceholder = block.text === placeholder;
	}
	return result;
}
function downgradeUnsupportedImages(messages, model) {
	if (model.input.includes("image")) return messages;
	return messages.map((msg) => {
		if (msg.role === "user" && Array.isArray(msg.content)) return {
			...msg,
			content: replaceImagesWithPlaceholder(msg.content, NON_VISION_USER_IMAGE_PLACEHOLDER)
		};
		if (msg.role === "toolResult") return {
			...msg,
			content: replaceImagesWithPlaceholder(msg.content, NON_VISION_TOOL_IMAGE_PLACEHOLDER)
		};
		return msg;
	});
}
/**
* Normalize tool call ID for cross-provider compatibility.
* OpenAI Responses API generates IDs that are 450+ chars with special characters like `|`.
* Anthropic APIs require IDs matching ^[a-zA-Z0-9_-]+$ (max 64 chars).
*/
function transformMessages(messages, model, normalizeToolCallId) {
	const toolCallIdMap = /* @__PURE__ */ new Map();
	const transformed = downgradeUnsupportedImages(messages.map((msg) => msg.content == null ? {
		...msg,
		content: []
	} : msg), model).map((msg) => {
		if (msg.role === "system" || msg.role === "user") return msg;
		if (msg.role === "toolResult") {
			const normalizedId = toolCallIdMap.get(msg.toolCallId);
			if (normalizedId && normalizedId !== msg.toolCallId) return {
				...msg,
				toolCallId: normalizedId
			};
			return msg;
		}
		if (msg.role === "assistant") {
			const assistantMsg = msg;
			const isSameModel = assistantMsg.provider === model.provider && assistantMsg.api === model.api && assistantMsg.model === model.id;
			const transformedContent = assistantMsg.content.flatMap((block) => {
				if (block.type === "thinking") {
					if (!isSameModel) return [];
					if (block.redacted || block.thinkingSignature) return block;
					if (!block.thinking || block.thinking.trim() === "") return [];
					return block;
				}
				if (block.type === "text") {
					if (isSameModel) return block;
					return {
						type: "text",
						text: block.text
					};
				}
				if (block.type === "toolCall") {
					const toolCall = block;
					let normalizedToolCall = toolCall;
					if (!isSameModel && toolCall.thoughtSignature) {
						normalizedToolCall = { ...toolCall };
						delete normalizedToolCall.thoughtSignature;
					}
					if (!isSameModel && normalizeToolCallId) {
						const normalizedId = normalizeToolCallId(toolCall.id, model, assistantMsg);
						if (normalizedId !== toolCall.id) {
							toolCallIdMap.set(toolCall.id, normalizedId);
							normalizedToolCall = {
								...normalizedToolCall,
								id: normalizedId
							};
						}
					}
					return normalizedToolCall;
				}
				return block;
			});
			return {
				...assistantMsg,
				content: transformedContent
			};
		}
		return msg;
	});
	const result = [];
	let pendingToolCalls = [];
	let existingToolResultIds = /* @__PURE__ */ new Set();
	const heldSystemMessages = [];
	const closePendingToolCalls = () => {
		if (pendingToolCalls.length > 0) {
			for (const tc of pendingToolCalls) if (!existingToolResultIds.has(tc.id)) result.push({
				role: "toolResult",
				toolCallId: tc.id,
				toolName: tc.name,
				content: [{
					type: "text",
					text: "No result provided"
				}],
				isError: true,
				timestamp: Date.now()
			});
			pendingToolCalls = [];
			existingToolResultIds = /* @__PURE__ */ new Set();
		}
		result.push(...heldSystemMessages);
		heldSystemMessages.length = 0;
	};
	for (let i = 0; i < transformed.length; i++) {
		const msg = transformed[i];
		if (msg.role === "assistant") {
			closePendingToolCalls();
			const assistantMsg = msg;
			if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") continue;
			const toolCalls = assistantMsg.content.filter((b) => b.type === "toolCall");
			if (toolCalls.length > 0) {
				pendingToolCalls = toolCalls;
				existingToolResultIds = /* @__PURE__ */ new Set();
			}
			result.push(msg);
		} else if (msg.role === "toolResult") {
			existingToolResultIds.add(msg.toolCallId);
			result.push(msg);
		} else if (msg.role === "system") if (pendingToolCalls.length > 0) heldSystemMessages.push(msg);
		else result.push(msg);
		else if (msg.role === "user") {
			closePendingToolCalls();
			result.push(msg);
		} else result.push(msg);
	}
	closePendingToolCalls();
	return result;
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/api/openai-responses-shared.js
function encodeTextSignatureV1(id, phase) {
	const payload = {
		v: 1,
		id
	};
	if (phase) payload.phase = phase;
	return JSON.stringify(payload);
}
function parseTextSignature(signature) {
	if (!signature) return void 0;
	if (signature.startsWith("{")) try {
		const parsed = JSON.parse(signature);
		if (parsed.v === 1 && typeof parsed.id === "string") {
			if (parsed.phase === "commentary" || parsed.phase === "final_answer") return {
				id: parsed.id,
				phase: parsed.phase
			};
			return { id: parsed.id };
		}
	} catch {}
	return { id: signature };
}
function convertToolResultOutput(model, content) {
	const textResult = content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
	const images = content.filter((c) => c.type === "image");
	const hasText = textResult.trim().length > 0;
	if (images.length === 0 || !model.input.includes("image")) return sanitizeSurrogates(hasText ? textResult : images.length > 0 ? "(see attached image)" : "(no tool output)");
	const output = [];
	if (hasText) output.push({
		type: "input_text",
		text: sanitizeSurrogates(textResult)
	});
	for (const image of images) output.push({
		type: "input_image",
		detail: "auto",
		image_url: `data:${image.mimeType};base64,${image.data}`
	});
	return output;
}
/**
* How a Responses transport expresses tool changes.
*
* `additional_tools` items accumulate: a later item adds tools and replaces same-name
* definitions from earlier items, but it cannot replace a top-level tool and cannot remove any
* tool (verified with strict schemas on the OpenAI, Codex, and Copilot backends, October 2026).
* Like Codex, every tool is therefore declared in `additional_tools` items, starting with one
* at the head of the input, and removals are announced as text. Synthetic tool search can
* only add tools. Without mid-conversation system messages there is nothing to anchor.
*/
function getResponsesToolSupport(options) {
	if (options.supportsMidConvoSystemMessages && options.supportsAdditionalTools) return "changes";
	return options.supportsToolSearch ? "additions" : "none";
}
/**
* Precedes every additional_tools item after the first. Without it, models read the latest item as
* the complete tool set once a removal was announced; Codex precedes its incremental tool batches
* with the same guidance. Restating the tools that are still unavailable keeps smaller models
* (gpt-5.6-luna, gpt-6-luna) from calling them again after later loads (verified October 2026).
*/
function renderIncrementalToolsNotice(unavailable) {
	const notice = "This is an incremental tools update. Previously declared tools remain available unless explicitly marked unavailable. A tool declared again here is available again, and its latest definition replaces the earlier one.";
	return unavailable.size > 0 ? `${notice}\nStill unavailable: ${[...unavailable].join(", ")}.` : notice;
}
function renderToolRemovalNotice(names) {
	return `The following tools are no longer available. Do not call them:\n${names.map((name) => `- ${name}`).join("\n")}`;
}
function convertResponsesMessages(model, context, allowedToolCallProviders, options) {
	const normalizedContext = resolveTranscript(context, options?.supportsMidConvoSystemMessages);
	const messages = [];
	const normalizeIdPart = (part) => {
		const sanitized = part.replace(/[^a-zA-Z0-9_-]/g, "_");
		return (sanitized.length > 64 ? sanitized.slice(0, 64) : sanitized).replace(/_+$/, "");
	};
	const buildForeignResponsesItemId = (itemId) => {
		const normalized = `fc_${shortHash(itemId)}`;
		return normalized.length > 64 ? normalized.slice(0, 64) : normalized;
	};
	const normalizeToolCallId = (id, _targetModel, source) => {
		if (!allowedToolCallProviders.has(model.provider)) return normalizeIdPart(id);
		if (!id.includes("|")) return normalizeIdPart(id);
		const [callId, itemId] = id.split("|");
		const normalizedCallId = normalizeIdPart(callId);
		let normalizedItemId = source.provider !== model.provider || source.api !== model.api ? buildForeignResponsesItemId(itemId) : normalizeIdPart(itemId);
		if (!normalizedItemId.startsWith("fc_")) normalizedItemId = normalizeIdPart(`fc_${normalizedItemId}`);
		return `${normalizedCallId}|${normalizedItemId}`;
	};
	const transformedMessages = transformMessages(normalizedContext.messages, model, normalizeToolCallId);
	const toolSupport = getResponsesToolSupport(options ?? {});
	const transcriptTools = resolveTranscriptTools(normalizedContext.messages, toolSupport);
	let declaredAdditionalTools = false;
	/** Tools announced as removed and not declared again since. */
	const unavailableTools = /* @__PURE__ */ new Set();
	const appendSystemToolAdditions = (message, seed) => {
		const tools = message.toolsAdded ?? [];
		for (const tool of tools) unavailableTools.delete(tool.name);
		if (tools.length === 0) return;
		if (toolSupport === "changes") {
			if (declaredAdditionalTools) messages.push({
				role: instructionRole,
				content: renderIncrementalToolsNotice(unavailableTools)
			});
			declaredAdditionalTools = true;
			messages.push({
				type: "additional_tools",
				role: "developer",
				tools: convertResponsesTools(tools, options?.toolOptions)
			});
			return;
		}
		if (toolSupport !== "additions") return;
		const names = tools.map((tool) => tool.name);
		const callId = `pi_tool_load_${shortHash(`${seed}:${names.join(",")}`)}`;
		messages.push({
			type: "tool_search_call",
			call_id: callId,
			execution: "client",
			status: "completed",
			arguments: {
				query: names.join(" "),
				limit: names.length
			}
		});
		messages.push({
			type: "tool_search_output",
			call_id: callId,
			execution: "client",
			status: "completed",
			tools: convertResponsesTools(tools, {
				...options?.toolOptions,
				toolSearchResult: true
			})
		});
	};
	const includeInitialSystemMessage = options?.includeSystemPrompt ?? true;
	const pushConfigurationUpdate = (effort) => {
		messages.push({
			type: "configuration_update",
			reasoning: { effort }
		});
	};
	const compat = model.compat;
	const instructionRole = model.reasoning && compat?.supportsDeveloperRole !== false ? "developer" : "system";
	let msgIndex = 0;
	let sourceIndex = 0;
	let systemIndex = 0;
	for (const msg of transformedMessages) {
		const isLeadingSystemMessage = sourceIndex++ === 0 && msg.role === "system";
		if (msg.role === "system") {
			const anchorsToolChanges = systemIndex++ >= transcriptTools.foldedSystemMessages;
			if (anchorsToolChanges) appendSystemToolAdditions(msg, `system:${msgIndex}`);
			if (!isLeadingSystemMessage || includeInitialSystemMessage) {
				const parts = [isLeadingSystemMessage ? getSystemMessageText(msg) : renderSystemMessageUpdate(msg)];
				if (anchorsToolChanges) {
					const added = new Set((msg.toolsAdded ?? []).map((tool) => tool.name));
					const removed = (msg.toolsRemoved ?? []).map((tool) => tool.name).filter((name) => !added.has(name));
					if (removed.length > 0) parts.push(renderToolRemovalNotice(removed));
					for (const name of removed) unavailableTools.add(name);
				}
				const text = parts.filter((part) => part.length > 0).join("\n\n");
				if (text.length > 0) messages.push({
					role: instructionRole,
					content: sanitizeSurrogates(text)
				});
			}
		} else if (msg.role === "user") if (typeof msg.content === "string") messages.push({
			role: "user",
			content: [{
				type: "input_text",
				text: sanitizeSurrogates(msg.content)
			}]
		});
		else {
			const content = msg.content.map((item) => {
				if (item.type === "text") return {
					type: "input_text",
					text: sanitizeSurrogates(item.text)
				};
				return {
					type: "input_image",
					detail: "auto",
					image_url: `data:${item.mimeType};base64,${item.data}`
				};
			});
			if (content.length === 0) continue;
			messages.push({
				role: "user",
				content
			});
		}
		else if (msg.role === "assistant") {
			const output = [];
			const assistantMsg = msg;
			const isSameProviderAndApi = assistantMsg.provider === model.provider && assistantMsg.api === model.api;
			const isSameModel = isSameProviderAndApi && assistantMsg.model === model.id;
			const isDifferentModel = isSameProviderAndApi && assistantMsg.model !== model.id;
			let textBlockIndex = 0;
			for (const block of msg.content) if (block.type === "thinking") {
				if (block.thinkingSignature) {
					const reasoningItem = JSON.parse(block.thinkingSignature);
					output.push(reasoningItem);
				}
			} else if (block.type === "text") {
				const textBlock = block;
				const parsedSignature = parseTextSignature(textBlock.textSignature);
				const fallbackMessageId = textBlockIndex === 0 ? `msg_pi_${msgIndex}` : `msg_pi_${msgIndex}_${textBlockIndex}`;
				textBlockIndex++;
				let msgId = parsedSignature?.id;
				if (!msgId) msgId = fallbackMessageId;
				else if (msgId.length > 64) msgId = `msg_${shortHash(msgId)}`;
				output.push({
					type: "message",
					role: "assistant",
					content: [{
						type: "output_text",
						text: sanitizeSurrogates(textBlock.text),
						annotations: []
					}],
					status: "completed",
					id: msgId,
					phase: parsedSignature?.phase
				});
			} else if (block.type === "toolCall") {
				const toolCall = block;
				const [callId, itemIdRaw] = toolCall.id.split("|");
				const customInputProperty = options?.grammarToolInputProperties?.get(toolCall.name);
				let itemId = itemIdRaw;
				const itemIdPrefix = customInputProperty === void 0 ? "fc_" : "ctc_";
				if (isDifferentModel || !itemId?.startsWith(itemIdPrefix)) itemId = void 0;
				if (customInputProperty !== void 0) output.push({
					type: "custom_tool_call",
					id: itemId,
					call_id: callId,
					name: toolCall.name,
					input: sanitizeSurrogates(getGrammarToolInput(toolCall.name, toolCall.arguments, customInputProperty)),
					...isSameModel && toolCall.namespace !== void 0 ? { namespace: toolCall.namespace } : {}
				});
				else output.push({
					type: "function_call",
					id: itemId,
					call_id: callId,
					name: toolCall.name,
					arguments: JSON.stringify(toolCall.arguments),
					...isSameModel && toolCall.namespace !== void 0 ? { namespace: toolCall.namespace } : {}
				});
			}
			if (output.length === 0) continue;
			if (options?.configurationUpdateEffort !== void 0 && isSameModel && msg.providerThinkingLevel !== void 0) pushConfigurationUpdate(msg.providerThinkingLevel);
			messages.push(...output);
		} else if (msg.role === "toolResult") {
			const [callId] = msg.toolCallId.split("|");
			const output = convertToolResultOutput(model, msg.content);
			if (options?.grammarToolInputProperties?.has(msg.toolName)) messages.push({
				type: "custom_tool_call_output",
				call_id: callId,
				output
			});
			else messages.push({
				type: "function_call_output",
				call_id: callId,
				output
			});
		}
		if (!isLeadingSystemMessage) msgIndex++;
	}
	if (options?.configurationUpdateEffort !== void 0) pushConfigurationUpdate(options.configurationUpdateEffort);
	return messages;
}
function convertResponsesTools(tools, options) {
	const defaultStrict = options?.strict === void 0 ? false : options.strict;
	const supportsStrictMode = options?.supportsStrictMode ?? true;
	const supportsOpenAIGrammarTools = options?.supportsOpenAIGrammarTools ?? false;
	return tools.map((tool) => {
		const grammar = resolveGrammarConstrainedSampling(tool, supportsOpenAIGrammarTools);
		if (grammar) return {
			type: "custom",
			name: tool.name,
			description: tool.description,
			format: {
				type: "grammar",
				syntax: grammar.format,
				definition: grammar.definition
			},
			...options?.toolSearchResult ? { defer_loading: true } : {}
		};
		const strict = resolveJsonSchemaStrictSampling(tool, supportsStrictMode) ?? defaultStrict;
		const functionTool = {
			type: "function",
			name: tool.name,
			description: tool.description,
			parameters: getJsonSchemaToolParameters(tool, strict === true),
			...options?.toolSearchResult ? { defer_loading: true } : {}
		};
		if (supportsStrictMode) functionTool.strict = strict;
		return functionTool;
	});
}
async function processResponsesStream(openaiStream, output, stream, model, options) {
	let sawTerminalResponseEvent = false;
	const outputSlots = /* @__PURE__ */ new Map();
	const unfinishedToolCalls = /* @__PURE__ */ new Set();
	const reasoningBlocksById = /* @__PURE__ */ new Map();
	const applyMessagePhaseStopReason = (item) => {
		if (item.type === "message" && item.phase === "final_answer") output.stopReason = "stop";
	};
	const getSlot = (outputIndex, type) => {
		const slot = outputSlots.get(outputIndex);
		return slot?.type === type ? slot : void 0;
	};
	const pushToolCallDelta = (slot, delta) => {
		if (delta === void 0) return;
		stream.push({
			type: "toolcall_delta",
			contentIndex: slot.contentIndex,
			delta,
			partial: output
		});
	};
	const createSlot = (outputIndex, item) => {
		if (item.type === "reasoning") {
			const block = {
				type: "thinking",
				thinking: ""
			};
			output.content.push(block);
			const slot = {
				type: "thinking",
				block,
				contentIndex: output.content.length - 1
			};
			outputSlots.set(outputIndex, slot);
			stream.push({
				type: "thinking_start",
				contentIndex: slot.contentIndex,
				partial: output
			});
			return slot;
		}
		if (item.type === "message") {
			applyMessagePhaseStopReason(item);
			const block = {
				type: "text",
				text: ""
			};
			output.content.push(block);
			const slot = {
				type: "text",
				block,
				contentIndex: output.content.length - 1
			};
			outputSlots.set(outputIndex, slot);
			stream.push({
				type: "text_start",
				contentIndex: slot.contentIndex,
				partial: output
			});
			return slot;
		}
		if (item.type === "function_call") {
			const args = new ToolCallArgumentsStream();
			const block = {
				type: "toolCall",
				id: `${item.call_id}|${item.id}`,
				name: item.name,
				arguments: item.arguments ? args.append(item.arguments) : {},
				...item.namespace !== void 0 ? { namespace: item.namespace } : {}
			};
			output.content.push(block);
			unfinishedToolCalls.add(block);
			const slot = {
				type: "toolCall",
				block,
				contentIndex: output.content.length - 1,
				input: {
					kind: "json",
					arguments: args
				}
			};
			outputSlots.set(outputIndex, slot);
			stream.push({
				type: "toolcall_start",
				contentIndex: slot.contentIndex,
				partial: output
			});
			return slot;
		}
		if (item.type === "custom_tool_call") {
			const inputProperty = options?.grammarToolInputProperties?.get(item.name) ?? "input";
			const input = item.input || "";
			const block = {
				type: "toolCall",
				id: `${item.call_id}|${item.id}`,
				name: item.name,
				arguments: { [inputProperty]: input },
				...item.namespace !== void 0 ? { namespace: item.namespace } : {}
			};
			output.content.push(block);
			unfinishedToolCalls.add(block);
			const slot = {
				type: "toolCall",
				block,
				contentIndex: output.content.length - 1,
				input: customInput(inputProperty, input)
			};
			outputSlots.set(outputIndex, slot);
			stream.push({
				type: "toolcall_start",
				contentIndex: slot.contentIndex,
				partial: output
			});
			return slot;
		}
	};
	const getOrCreateSlot = (outputIndex, item) => {
		return outputSlots.get(outputIndex) ?? createSlot(outputIndex, item);
	};
	const backfillReasoningSignatures = (responseOutput) => {
		for (const item of responseOutput) {
			if (item.type !== "reasoning" || !item.encrypted_content) continue;
			const block = reasoningBlocksById.get(item.id);
			if (!block?.thinkingSignature) continue;
			const storedItem = JSON.parse(block.thinkingSignature);
			if (storedItem.encrypted_content) continue;
			block.thinkingSignature = JSON.stringify({
				...storedItem,
				encrypted_content: item.encrypted_content
			});
		}
	};
	const finalizeResponse = (response) => {
		sawTerminalResponseEvent = true;
		backfillReasoningSignatures(response.output ?? []);
		if (response?.id) output.responseId = response.id;
		if (response?.usage) {
			const inputDetails = response.usage.input_tokens_details;
			const cachedTokens = inputDetails?.cached_tokens || 0;
			const cacheWriteTokens = inputDetails?.cache_write_tokens || 0;
			output.usage = {
				input: Math.max(0, (response.usage.input_tokens || 0) - cachedTokens - cacheWriteTokens),
				output: response.usage.output_tokens || 0,
				cacheRead: cachedTokens,
				cacheWrite: cacheWriteTokens,
				reasoning: response.usage.output_tokens_details?.reasoning_tokens || 0,
				totalTokens: response.usage.total_tokens || 0,
				cost: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					total: 0
				}
			};
		}
		calculateCost(model, output.usage);
		if (options?.applyServiceTierPricing) {
			const serviceTier = options.resolveServiceTier ? options.resolveServiceTier(response?.service_tier, options.serviceTier) : response?.service_tier ?? options.serviceTier;
			options.applyServiceTierPricing(output.usage, serviceTier);
		}
		const status = response?.status;
		const incompleteDetails = response?.incomplete_details;
		const incompleteReason = typeof incompleteDetails?.reason === "string" ? incompleteDetails.reason : void 0;
		output.rawStopReason = incompleteReason ? `${status}.${incompleteReason}` : status;
		const mappedStop = mapStopReason(status, incompleteReason);
		output.stopReason = mappedStop.stopReason;
		if (mappedStop.errorMessage === void 0) delete output.errorMessage;
		else output.errorMessage = mappedStop.errorMessage;
		if (output.content.some((b) => b.type === "toolCall") && output.stopReason === "stop") output.stopReason = "toolUse";
	};
	for await (const event of openaiStream) {
		await options?.onProviderStreamEvent?.(event, model);
		if (event.type === "response.created") output.responseId = event.response.id;
		else if (event.type === "response.output_item.added") createSlot(event.output_index, event.item);
		else if (event.type === "response.reasoning_summary_text.delta") {
			const slot = getSlot(event.output_index, "thinking");
			if (!slot) continue;
			slot.block.thinking += event.delta;
			stream.push({
				type: "thinking_delta",
				contentIndex: slot.contentIndex,
				delta: event.delta,
				partial: output
			});
		} else if (event.type === "response.reasoning_summary_part.done") {
			const slot = getSlot(event.output_index, "thinking");
			if (!slot) continue;
			slot.block.thinking += "\n\n";
			stream.push({
				type: "thinking_delta",
				contentIndex: slot.contentIndex,
				delta: "\n\n",
				partial: output
			});
		} else if (event.type === "response.reasoning_text.delta") {
			const slot = getSlot(event.output_index, "thinking");
			if (!slot) continue;
			slot.block.thinking += event.delta;
			stream.push({
				type: "thinking_delta",
				contentIndex: slot.contentIndex,
				delta: event.delta,
				partial: output
			});
		} else if (event.type === "response.output_text.delta") {
			const slot = getSlot(event.output_index, "text");
			if (!slot) continue;
			slot.block.text += event.delta;
			stream.push({
				type: "text_delta",
				contentIndex: slot.contentIndex,
				delta: event.delta,
				partial: output
			});
		} else if (event.type === "response.refusal.delta") {
			const slot = getSlot(event.output_index, "text");
			if (!slot) continue;
			slot.block.text += event.delta;
			stream.push({
				type: "text_delta",
				contentIndex: slot.contentIndex,
				delta: event.delta,
				partial: output
			});
		} else if (event.type === "response.function_call_arguments.delta") {
			const slot = getSlot(event.output_index, "toolCall");
			if (slot?.input.kind !== "json") continue;
			slot.block.arguments = slot.input.arguments.append(event.delta);
			pushToolCallDelta(slot, event.delta);
		} else if (event.type === "response.function_call_arguments.done") {
			const slot = getSlot(event.output_index, "toolCall");
			if (slot?.input.kind !== "json") continue;
			const replaced = slot.input.arguments.replace(event.arguments);
			slot.block.arguments = replaced.arguments;
			if (replaced.delta) pushToolCallDelta(slot, replaced.delta);
		} else if (event.type === "response.custom_tool_call_input.delta") {
			const slot = getSlot(event.output_index, "toolCall");
			if (slot?.input.kind !== "custom") continue;
			pushToolCallDelta(slot, appendCustomInput(slot.block, slot.input, event.delta));
		} else if (event.type === "response.custom_tool_call_input.done") {
			const slot = getSlot(event.output_index, "toolCall");
			if (slot?.input.kind !== "custom") continue;
			pushToolCallDelta(slot, closeCustomInput(slot.block, slot.input, event.input));
		} else if (event.type === "response.output_item.done") {
			const item = event.item;
			applyMessagePhaseStopReason(item);
			const slot = getOrCreateSlot(event.output_index, item);
			if (item.type === "reasoning" && slot?.type === "thinking") {
				const summaryText = item.summary?.map((s) => s.text).join("\n\n") || "";
				const contentText = item.content?.map((c) => c.text).join("\n\n") || "";
				slot.block.thinking = summaryText || contentText || slot.block.thinking;
				slot.block.thinkingSignature = JSON.stringify(item);
				reasoningBlocksById.set(item.id, slot.block);
				stream.push({
					type: "thinking_end",
					contentIndex: slot.contentIndex,
					content: slot.block.thinking,
					partial: output
				});
				outputSlots.delete(event.output_index);
			} else if (item.type === "message" && slot?.type === "text") {
				slot.block.text = item.content?.map((c) => c.type === "output_text" ? c.text : c.refusal).join("") || "";
				slot.block.textSignature = encodeTextSignatureV1(item.id, item.phase ?? void 0);
				stream.push({
					type: "text_end",
					contentIndex: slot.contentIndex,
					content: slot.block.text,
					partial: output
				});
				outputSlots.delete(event.output_index);
			} else if (item.type === "function_call" && slot?.type === "toolCall" && slot.input.kind === "json") {
				if (item.arguments) slot.input.arguments.replace(item.arguments);
				Object.assign(slot.block, slot.input.arguments.finish());
				if (item.namespace !== void 0) slot.block.namespace = item.namespace;
				unfinishedToolCalls.delete(slot.block);
				stream.push({
					type: "toolcall_end",
					contentIndex: slot.contentIndex,
					toolCall: slot.block,
					partial: output
				});
				outputSlots.delete(event.output_index);
			} else if (item.type === "custom_tool_call" && slot?.type === "toolCall" && slot.input.kind === "custom") {
				pushToolCallDelta(slot, closeCustomInput(slot.block, slot.input, item.input));
				if (item.namespace !== void 0) slot.block.namespace = item.namespace;
				unfinishedToolCalls.delete(slot.block);
				stream.push({
					type: "toolcall_end",
					contentIndex: slot.contentIndex,
					toolCall: slot.block,
					partial: output
				});
				outputSlots.delete(event.output_index);
			}
		} else if (event.type === "response.completed" || event.type === "response.incomplete") finalizeResponse(event.response);
		else if (event.type === "error") throw new Error(`Error Code ${event.code}: ${event.message}` || "Unknown error");
		else if (event.type === "response.failed") {
			sawTerminalResponseEvent = true;
			output.rawStopReason = event.response?.status;
			const error = event.response?.error;
			const details = event.response?.incomplete_details;
			const msg = error ? `${error.code || "unknown"}: ${error.message || "no message"}` : details?.reason ? `incomplete: ${details.reason}` : "Unknown error (no error details in response)";
			throw new Error(msg);
		}
	}
	if (!sawTerminalResponseEvent) throw new Error("OpenAI Responses stream ended before a terminal response event");
	if (output.stopReason === "toolUse") for (const toolCall of unfinishedToolCalls) throw new Error(`OpenAI Responses stream completed with an unfinished tool call: ${toolCall.name} (${toolCall.id})`);
}
/** Stream state of a custom tool call that starts with `initialInput`. */
function customInput(property, initialInput) {
	const buffer = {
		input: "",
		started: false,
		closed: false
	};
	return {
		kind: "custom",
		property,
		buffer,
		unsent: appendGrammarToolInputJsonDelta(buffer, property, initialInput) ?? ""
	};
}
/** Append to a streaming custom tool input; returns the matching piece of its JSON arguments text. */
function appendCustomInput(block, input, delta) {
	return sendCustomInput(block, input, appendGrammarToolInputJsonDelta(input.buffer, input.property, delta));
}
/** Close a custom tool input with the provider's complete input, if it sent one. */
function closeCustomInput(block, input, finalInput) {
	return sendCustomInput(block, input, closeGrammarToolInputJson(input.buffer, input.property, finalInput));
}
function sendCustomInput(block, input, jsonDelta) {
	block.arguments = { [input.property]: input.buffer.input };
	if (input.unsent === "") return jsonDelta;
	const sent = input.unsent + (jsonDelta ?? "");
	input.unsent = "";
	return sent;
}
function mapStopReason(status, incompleteReason) {
	if (!status) return { stopReason: "stop" };
	switch (status) {
		case "completed": return { stopReason: "stop" };
		case "incomplete":
			if (incompleteReason === "max_output_tokens") return { stopReason: "length" };
			return {
				stopReason: "error",
				errorMessage: incompleteReason ? `Response incomplete: ${incompleteReason}` : "Response incomplete without a provider reason"
			};
		case "failed":
		case "cancelled": return { stopReason: "error" };
		case "in_progress":
		case "queued": return { stopReason: "stop" };
		default: throw new Error(`Unhandled stop reason: ${status}`);
	}
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/utils/estimate.js
const CHARS_PER_TOKEN = 3.5;
const ESTIMATED_IMAGE_CHARS = 4800;
function calculateContextTokens(usage) {
	return usage.totalTokens || usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}
function safeJsonStringify(value) {
	try {
		return JSON.stringify(value) ?? "undefined";
	} catch {
		return "[unserializable]";
	}
}
function estimateTextAndImageContentChars(content) {
	if (typeof content === "string") return content.length;
	let chars = 0;
	for (const block of content) chars += block.type === "text" ? block.text.length : ESTIMATED_IMAGE_CHARS;
	return chars;
}
function estimateTextTokens(text) {
	return Math.ceil(text.length / CHARS_PER_TOKEN);
}
function estimateTextAndImageContentTokens(content) {
	return Math.ceil(estimateTextAndImageContentChars(content) / CHARS_PER_TOKEN);
}
function estimateMessageTokens(message) {
	let chars = 0;
	if (message.role === "system") return estimateTextTokens(getSystemMessageText(message)) + estimateToolsTokens(message.toolsAdded) + estimateToolsTokens(message.toolsRemoved);
	if (message.role === "user") return estimateTextAndImageContentTokens(message.content);
	if (message.role === "toolResult") return estimateTextAndImageContentTokens(message.content);
	for (const block of message.content) if (block.type === "text") chars += block.text.length;
	else if (block.type === "thinking") chars += block.thinking.length;
	else chars += block.name.length + safeJsonStringify(block.arguments).length;
	return Math.ceil(chars / CHARS_PER_TOKEN);
}
function getLastAssistantUsageInfo(messages) {
	let latestPrefixTimestamp = Number.NEGATIVE_INFINITY;
	let usageInfo;
	for (let i = 0; i < messages.length; i++) {
		const message = messages[i];
		if (message.role === "assistant") {
			const assistant = message;
			if (assistant.timestamp >= latestPrefixTimestamp && assistant.stopReason !== "aborted" && assistant.stopReason !== "error" && calculateContextTokens(assistant.usage) > 0) usageInfo = {
				usage: assistant.usage,
				index: i
			};
		}
		latestPrefixTimestamp = Math.max(latestPrefixTimestamp, message.timestamp);
	}
	return usageInfo;
}
function estimateContextTokens(context) {
	const messages = "messages" in context ? context.messages : context;
	const usageInfo = getLastAssistantUsageInfo(messages);
	if (usageInfo) {
		const usageTokens = calculateContextTokens(usageInfo.usage);
		let trailingTokens = 0;
		for (let i = usageInfo.index + 1; i < messages.length; i++) trailingTokens += estimateMessageTokens(messages[i]);
		return {
			tokens: usageTokens + trailingTokens,
			usageTokens,
			trailingTokens,
			lastUsageIndex: usageInfo.index
		};
	}
	let tokens = 0;
	for (const message of messages) tokens += estimateMessageTokens(message);
	return {
		tokens,
		usageTokens: 0,
		trailingTokens: tokens,
		lastUsageIndex: null
	};
}
function estimateToolsTokens(tools) {
	if (!tools || tools.length === 0) return 0;
	return estimateTextTokens(safeJsonStringify(tools));
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/api/simple-options.js
const CONTEXT_SAFETY_TOKENS = 4096;
const MIN_MAX_TOKENS = 1;
function clampMaxTokensToContext(model, context, maxTokens) {
	if (model.contextWindow <= 0) return Math.max(MIN_MAX_TOKENS, maxTokens);
	const available = model.contextWindow - estimateContextTokens(context).tokens - CONTEXT_SAFETY_TOKENS;
	return Math.min(maxTokens, Math.max(MIN_MAX_TOKENS, available));
}
function resolveSamplingParams(model, thinkingLevel, requestParams) {
	const effectiveThinkingLevel = clampThinkingLevel(model, thinkingLevel);
	const thinkingLevelParams = model.samplingParamsByThinkingLevel?.[effectiveThinkingLevel];
	return model.samplingParams || thinkingLevelParams || requestParams ? {
		...model.samplingParams,
		...thinkingLevelParams,
		...requestParams
	} : void 0;
}
function buildBaseOptions(model, context, options, apiKey) {
	const samplingParams = resolveSamplingParams(model, options?.reasoning ?? "off", options?.samplingParams);
	return {
		temperature: options?.temperature,
		samplingParams,
		maxTokens: clampMaxTokensToContext(model, context, options?.maxTokens ?? model.maxTokens),
		signal: options?.signal,
		telemetry: options?.telemetry,
		apiKey: apiKey || options?.apiKey,
		fetch: options?.fetch,
		transport: options?.transport,
		cacheRetention: options?.cacheRetention,
		sessionId: options?.sessionId,
		headers: options?.headers,
		identity: options?.identity,
		onPayload: options?.onPayload,
		onResponse: options?.onResponse,
		onProviderStreamEvent: options?.onProviderStreamEvent,
		timeoutMs: options?.timeoutMs,
		websocketConnectTimeoutMs: options?.websocketConnectTimeoutMs,
		maxRetries: options?.maxRetries,
		maxRetryDelayMs: options?.maxRetryDelayMs,
		metadata: options?.metadata,
		env: options?.env
	};
}
//#endregion
//#region node_modules/.pnpm/@earendil-works+pi-ai@1.5.0_@aws-sdk+credential-provider-node@3.972.93_@smithy+signatur_a007c193334694da950bfeb5dc46a094/node_modules/@earendil-works/pi-ai/dist/api/openai-codex-responses.js
const DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";
const DEFAULT_MAX_RETRIES = 0;
const BASE_DELAY_MS = 1e3;
const DEFAULT_MAX_RETRY_DELAY_MS = 6e4;
const DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS = 15e3;
const REQUEST_COMPRESSION_ZSTD_LEVEL = 3;
const CODEX_TOOL_CALL_PROVIDERS = /* @__PURE__ */ new Set([
	"openai",
	"openai-codex",
	"opencode"
]);
const WEBSOCKET_MESSAGE_TOO_BIG_CLOSE_CODE = 1009;
const WEBSOCKET_CONNECTION_LIMIT_REACHED_CODE = "websocket_connection_limit_reached";
const PREVIOUS_RESPONSE_NOT_FOUND_CODE = "previous_response_not_found";
const CODEX_RESPONSE_STATUSES = /* @__PURE__ */ new Set([
	"completed",
	"incomplete",
	"failed",
	"cancelled",
	"queued",
	"in_progress"
]);
function assertSuccessfulOutput(output) {
	if (output.stopReason === "pending") throw new Error("Codex stream ended without a stop reason");
	if (output.stopReason === "error" || output.stopReason === "aborted") throw new Error(output.errorMessage || "An unknown error occurred");
}
function isTerminalRateLimitError(errorText) {
	return /GoUsageLimitError|FreeUsageLimitError|Monthly usage limit reached|available balance|insufficient_quota|out of budget|quota exceeded|billing/i.test(errorText);
}
function isRetryableError(status, errorText) {
	if (status === 429 && isTerminalRateLimitError(errorText)) return false;
	if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
	return /rate.?limit|overloaded|service.?unavailable|upstream.?connect|connection.?refused/i.test(errorText);
}
function getRetryAfterDelayMs(headers) {
	const retryAfterMs = headers.get("retry-after-ms");
	if (retryAfterMs !== null) {
		const millis = Number(retryAfterMs);
		if (Number.isFinite(millis)) return Math.max(0, millis);
	}
	const retryAfter = headers.get("retry-after");
	if (!retryAfter) return;
	const seconds = Number(retryAfter);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
	const date = Date.parse(retryAfter);
	if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
}
var RetryDelayExceededError = class extends Error {};
function validateRetryDelayMs(delayMs, options) {
	const maxRetryDelayMs = options?.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
	if (maxRetryDelayMs > 0 && delayMs > maxRetryDelayMs) throw new RetryDelayExceededError(`Server requested ${Math.ceil(delayMs / 1e3)}s retry delay (max: ${Math.ceil(maxRetryDelayMs / 1e3)}s)`);
	return delayMs;
}
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(/* @__PURE__ */ new Error("Request was aborted"));
			return;
		}
		const timeout = setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => {
			clearTimeout(timeout);
			reject(/* @__PURE__ */ new Error("Request was aborted"));
		});
	});
}
function normalizeTimeoutMs(value) {
	if (value === void 0) return void 0;
	if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid timeoutMs: ${String(value)}`);
	return Math.floor(value);
}
function loadNodeZlib() {
	if (typeof process === "undefined" || !(process.versions?.node || process.versions?.bun)) return null;
	return process.getBuiltinModule?.("node:zlib") ?? null;
}
function compressRequestBodyZstd(bodyJson) {
	const zlib = loadNodeZlib();
	if (!zlib || typeof zlib.zstdCompressSync !== "function") return null;
	try {
		const compressed = zlib.zstdCompressSync(bodyJson, { params: { [zlib.constants.ZSTD_c_compressionLevel]: REQUEST_COMPRESSION_ZSTD_LEVEL } });
		return new Uint8Array(compressed);
	} catch {
		return null;
	}
}
const stream = (model, context, options) => {
	const stream = new AssistantMessageEventStream();
	const normalizedContext = resolveTranscript(context, model.compat?.supportsMidConvoSystemMessages);
	(async () => {
		const output = {
			role: "assistant",
			content: [],
			api: "openai-codex-responses",
			provider: model.provider,
			model: model.id,
			usage: {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					total: 0
				}
			},
			stopReason: "pending",
			timestamp: Date.now()
		};
		try {
			const apiKey = options?.apiKey;
			if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
			const accountId = extractAccountId(apiKey);
			const grammarToolInputProperties = createGrammarToolInputProperties(getDeclaredTools(normalizedContext.messages), model.compat?.supportsOpenAIGrammarTools ?? false);
			const cacheSessionId = options?.cacheRetention === "none" ? void 0 : options?.sessionId;
			const codexSessionId = clampOpenAIPromptCacheKey(cacheSessionId);
			let body = buildRequestBody(model, normalizedContext, options, codexSessionId, grammarToolInputProperties);
			const nextBody = await options?.onPayload?.(body, model);
			if (nextBody !== void 0) body = nextBody;
			const websocketRequestId = codexSessionId || uuidv7();
			const identityHeaders = {
				originator: "pi",
				...getIdentityHeaders(model, options?.identity)
			};
			const sseHeaders = buildSSEHeaders(identityHeaders, model.headers, options?.headers, accountId, apiKey, codexSessionId);
			const websocketHeaders = buildWebSocketHeaders(identityHeaders, model.headers, options?.headers, accountId, apiKey, websocketRequestId);
			const bodyJson = JSON.stringify(body);
			const httpTimeoutMs = normalizeTimeoutMs(options?.timeoutMs);
			const websocketConnectTimeoutMs = normalizeTimeoutMs(options?.websocketConnectTimeoutMs);
			const transport = options?.transport || "auto";
			let startEmitted = false;
			const websocketDisabledForSession = transport !== "sse" && isWebSocketSseFallbackActive(cacheSessionId);
			if (websocketDisabledForSession) recordWebSocketSseFallback(cacheSessionId);
			if (transport !== "sse" && !websocketDisabledForSession) {
				let websocketStarted = false;
				let retriedWebSocketConnectionLimit = false;
				let retriedMissingWebSocketContinuation = false;
				while (true) {
					websocketStarted = false;
					try {
						await processWebSocketStream(resolveCodexWebSocketUrl(model.baseUrl), body, websocketHeaders, output, stream, model, () => {
							websocketStarted = true;
							if (!startEmitted) {
								startEmitted = true;
								stream.push({
									type: "start",
									partial: output
								});
							}
						}, httpTimeoutMs, websocketConnectTimeoutMs, cacheSessionId, accountId, grammarToolInputProperties, options);
						if (options?.signal?.aborted) throw new Error("Request was aborted");
						assertSuccessfulOutput(output);
						stream.push({
							type: "done",
							reason: output.stopReason,
							message: output
						});
						stream.end();
						return;
					} catch (error) {
						const aborted = options?.signal?.aborted;
						const connectionLimitBeforeStart = !websocketStarted && isWebSocketConnectionLimitReachedError(error);
						const previousResponseNotFound = isPreviousResponseNotFoundError(error);
						if (!aborted && previousResponseNotFound && !retriedMissingWebSocketContinuation) {
							retriedMissingWebSocketContinuation = true;
							continue;
						}
						if (!aborted && connectionLimitBeforeStart && !retriedWebSocketConnectionLimit) {
							retriedWebSocketConnectionLimit = true;
							continue;
						}
						if (aborted || isCodexNonTransportError(error) && !connectionLimitBeforeStart) throw error;
						appendAssistantMessageDiagnostic(output, createAssistantMessageDiagnostic("provider_transport_failure", error, {
							configuredTransport: transport,
							...websocketStarted ? {} : { fallbackTransport: "sse" },
							eventsEmitted: websocketStarted,
							phase: websocketStarted ? "after_message_stream_start" : "before_message_stream_start",
							requestBytes: new TextEncoder().encode(bodyJson).byteLength
						}));
						recordWebSocketFailure(cacheSessionId, error);
						if (websocketStarted) throw error;
						recordWebSocketSseFallback(cacheSessionId);
						break;
					}
				}
			}
			const compressedBody = compressRequestBodyZstd(bodyJson);
			if (compressedBody) sseHeaders.set("content-encoding", "zstd");
			const sseBody = compressedBody ?? bodyJson;
			let response;
			let lastError;
			const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
			for (let attempt = 0; attempt <= maxRetries; attempt++) {
				if (options?.signal?.aborted) throw new Error("Request was aborted");
				try {
					const headerTimeoutSignal = httpTimeoutMs !== void 0 && httpTimeoutMs > 0 ? AbortSignal.timeout(httpTimeoutMs) : void 0;
					const combinedSignal = combineAbortSignals([options?.signal, headerTimeoutSignal]);
					try {
						response = await (options?.fetch ?? globalThis.fetch)(resolveCodexUrl(model.baseUrl), {
							method: "POST",
							headers: sseHeaders,
							body: sseBody,
							signal: combinedSignal.signal
						});
					} catch (error) {
						if (headerTimeoutSignal?.aborted && !options?.signal?.aborted) throw new Error(`Codex SSE response headers timed out after ${httpTimeoutMs}ms`);
						throw error;
					} finally {
						combinedSignal.cleanup();
					}
					await options?.onResponse?.({
						status: response.status,
						headers: headersToRecord(response.headers)
					}, model);
					if (response.ok) break;
					const errorText = await response.text();
					if (attempt < maxRetries && isRetryableError(response.status, errorText)) {
						const retryAfterDelayMs = getRetryAfterDelayMs(response.headers);
						await sleep(retryAfterDelayMs === void 0 ? BASE_DELAY_MS * 2 ** attempt : validateRetryDelayMs(retryAfterDelayMs, options), options?.signal);
						continue;
					}
					const info = await parseErrorResponse(new Response(errorText, {
						status: response.status,
						statusText: response.statusText
					}));
					throw new Error(info.friendlyMessage || info.message);
				} catch (error) {
					if (error instanceof Error) {
						if (error.name === "AbortError" || error.message === "Request was aborted") throw new Error("Request was aborted");
					}
					lastError = error instanceof Error ? error : new Error(String(error));
					if (attempt < maxRetries && !(lastError instanceof RetryDelayExceededError) && !lastError.message.includes("usage limit")) {
						await sleep(BASE_DELAY_MS * 2 ** attempt, options?.signal);
						continue;
					}
					throw lastError;
				}
			}
			if (!response?.ok) throw lastError ?? /* @__PURE__ */ new Error("Failed after retries");
			if (!response.body) throw new Error("No response body");
			if (!startEmitted) {
				startEmitted = true;
				stream.push({
					type: "start",
					partial: output
				});
			}
			await processStream(response, output, stream, model, grammarToolInputProperties, options);
			if (options?.signal?.aborted) throw new Error("Request was aborted");
			assertSuccessfulOutput(output);
			stream.push({
				type: "done",
				reason: output.stopReason,
				message: output
			});
			stream.end();
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = formatProviderError(normalizeProviderError(error));
			stream.push({
				type: "error",
				reason: output.stopReason,
				error: output
			});
			stream.end();
		}
	})();
	return stream;
};
const streamSimple = (model, context, options) => {
	const apiKey = options?.apiKey;
	if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
	const base = {
		...buildBaseOptions(model, context, options, apiKey),
		toolChoice: options?.toolChoice
	};
	const clampedReasoning = options?.reasoning ? clampThinkingLevel(model, options.reasoning) : void 0;
	const reasoningEffort = clampedReasoning === "off" ? void 0 : clampedReasoning;
	return stream(model, context, {
		...base,
		reasoningEffort
	});
};
function buildRequestBody(model, context, options, cacheSessionId, grammarToolInputProperties = createGrammarToolInputProperties(getDeclaredTools(context.messages), model.compat?.supportsOpenAIGrammarTools ?? false)) {
	const supportsStrictMode = model.compat?.supportsStrictMode ?? true;
	const supportsOpenAIGrammarTools = model.compat?.supportsOpenAIGrammarTools ?? false;
	const supportsAdditionalTools = model.compat?.supportsAdditionalTools ?? false;
	const supportsToolSearch = model.compat?.supportsToolSearch ?? false;
	const transcriptTools = resolveTranscriptTools(context.messages, getResponsesToolSupport({
		supportsMidConvoSystemMessages: model.compat?.supportsMidConvoSystemMessages ?? false,
		supportsAdditionalTools,
		supportsToolSearch
	}));
	const messages = convertResponsesMessages(model, context, CODEX_TOOL_CALL_PROVIDERS, {
		includeSystemPrompt: false,
		grammarToolInputProperties,
		supportsMidConvoSystemMessages: model.compat?.supportsMidConvoSystemMessages ?? false,
		supportsAdditionalTools,
		supportsToolSearch,
		toolOptions: {
			strict: null,
			supportsStrictMode,
			supportsOpenAIGrammarTools
		}
	});
	const initialSystemMessage = getInitialSystemMessage(context.messages);
	const instructions = initialSystemMessage ? getSystemMessageText(initialSystemMessage) : "";
	const body = {
		model: model.id,
		store: false,
		stream: true,
		instructions: instructions || "You are a helpful assistant.",
		input: messages,
		text: { verbosity: options?.textVerbosity || "low" },
		include: ["reasoning.encrypted_content"],
		prompt_cache_key: cacheSessionId,
		tool_choice: options?.toolChoice ?? "auto",
		parallel_tool_calls: true
	};
	if (options?.temperature !== void 0) body.temperature = options.temperature;
	if (options?.serviceTier !== void 0) body.service_tier = options.serviceTier;
	if (transcriptTools.requestTools.length > 0) body.tools = convertResponsesTools(transcriptTools.requestTools, {
		strict: null,
		supportsStrictMode,
		supportsOpenAIGrammarTools
	});
	if (options?.reasoningEffort !== void 0) {
		const effort = options.reasoningEffort === "none" ? model.thinkingLevelMap?.off === void 0 ? "none" : model.thinkingLevelMap.off : model.thinkingLevelMap?.[options.reasoningEffort] ?? options.reasoningEffort;
		if (effort !== null) body.reasoning = {
			effort,
			summary: options.reasoningSummary ?? "auto"
		};
	} else if (model.reasoning && model.thinkingLevelMap?.off !== null) body.reasoning = { effort: model.thinkingLevelMap?.off ?? "none" };
	return body;
}
function getServiceTierCostMultiplier(model, serviceTier) {
	switch (serviceTier) {
		case "flex": return .5;
		case "priority": return model.id === "gpt-5.5" ? 2.5 : 2;
		default: return 1;
	}
}
function applyServiceTierPricing(usage, serviceTier, model) {
	const multiplier = getServiceTierCostMultiplier(model, serviceTier);
	if (multiplier === 1) return;
	usage.cost.input *= multiplier;
	usage.cost.output *= multiplier;
	usage.cost.cacheRead *= multiplier;
	usage.cost.cacheWrite *= multiplier;
	usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
}
function resolveCodexServiceTier(responseServiceTier, requestServiceTier) {
	if (responseServiceTier === "default" && (requestServiceTier === "flex" || requestServiceTier === "priority")) return requestServiceTier;
	return responseServiceTier ?? requestServiceTier;
}
function resolveCodexUrl(baseUrl) {
	const normalized = (baseUrl && baseUrl.trim().length > 0 ? baseUrl : DEFAULT_CODEX_BASE_URL).replace(/\/+$/, "");
	if (normalized.endsWith("/codex/responses")) return normalized;
	if (normalized.endsWith("/codex")) return `${normalized}/responses`;
	return `${normalized}/codex/responses`;
}
function resolveCodexWebSocketUrl(baseUrl) {
	const url = new URL(resolveCodexUrl(baseUrl));
	if (url.protocol === "https:") url.protocol = "wss:";
	if (url.protocol === "http:") url.protocol = "ws:";
	return url.toString();
}
async function processStream(response, output, stream, model, grammarToolInputProperties, options) {
	await processResponsesStream(mapCodexEvents(parseSSE(response, options?.signal), output, model, options?.onProviderStreamEvent), output, stream, model, {
		serviceTier: options?.serviceTier,
		grammarToolInputProperties,
		resolveServiceTier: resolveCodexServiceTier,
		applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model)
	});
}
var CodexApiError = class extends Error {
	code;
	payload;
	constructor(message, options) {
		super(message);
		this.name = "CodexApiError";
		this.code = options?.code;
		this.payload = options?.payload;
		this.cause = options?.cause;
	}
};
var CodexProtocolError = class extends Error {
	payload;
	constructor(message, options) {
		super(message);
		this.name = "CodexProtocolError";
		this.payload = options?.payload;
		this.cause = options?.cause;
	}
};
var ProviderStreamEventCallbackError = class extends Error {
	constructor(cause) {
		super(formatThrownValue(cause));
		this.name = "ProviderStreamEventCallbackError";
		this.cause = cause;
	}
};
function isCodexNonTransportError(error) {
	return error instanceof CodexApiError || error instanceof CodexProtocolError || error instanceof ProviderStreamEventCallbackError;
}
function isWebSocketConnectionLimitReachedError(error) {
	return error instanceof CodexApiError && error.code === WEBSOCKET_CONNECTION_LIMIT_REACHED_CODE;
}
function isPreviousResponseNotFoundError(error) {
	return error instanceof CodexApiError && error.code === PREVIOUS_RESPONSE_NOT_FOUND_CODE;
}
function extractCodexEventError(event) {
	const nested = event.error && typeof event.error === "object" ? event.error : void 0;
	return {
		code: typeof event.code === "string" ? event.code : typeof nested?.code === "string" ? nested.code : void 0,
		message: typeof event.message === "string" ? event.message : typeof nested?.message === "string" ? nested.message : void 0
	};
}
async function* mapCodexEvents(events, output, model, onProviderStreamEvent) {
	for await (const event of events) {
		try {
			await onProviderStreamEvent?.(event, model);
		} catch (error) {
			throw new ProviderStreamEventCallbackError(error);
		}
		const type = typeof event.type === "string" ? event.type : void 0;
		if (!type) continue;
		if (type === "error") {
			const { code, message } = extractCodexEventError(event);
			throw new CodexApiError(`Codex error: ${message || code || JSON.stringify(event)}`, {
				code,
				payload: event
			});
		}
		if (type === "response.failed") {
			const response = event.response;
			const code = response?.error?.code;
			const message = response?.error?.message;
			throw new CodexApiError(message || "Codex response failed", {
				code,
				payload: event
			});
		}
		if (type === "response.done" || type === "response.completed" || type === "response.incomplete") {
			const response = event.response;
			if (typeof response?.end_turn === "boolean") output.endTurn = response.end_turn;
			const normalizedResponse = response ? {
				...response,
				status: normalizeCodexStatus(response.status)
			} : response;
			yield {
				...event,
				type: "response.completed",
				response: normalizedResponse
			};
			return;
		}
		yield event;
	}
}
function normalizeCodexStatus(status) {
	if (typeof status !== "string") return void 0;
	return CODEX_RESPONSE_STATUSES.has(status) ? status : void 0;
}
async function* parseSSE(response, signal) {
	if (!response.body) return;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const onAbort = () => {
		reader.cancel().catch(() => {});
	};
	signal?.addEventListener("abort", onAbort, { once: true });
	try {
		while (true) {
			if (signal?.aborted) throw new Error("Request was aborted");
			const { done, value } = await reader.read();
			if (signal?.aborted) throw new Error("Request was aborted");
			buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
			if (done && buffer.trim()) buffer += "\n\n";
			let idx = buffer.indexOf("\n\n");
			while (idx !== -1) {
				const chunk = buffer.slice(0, idx);
				buffer = buffer.slice(idx + 2);
				const dataLines = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
				if (dataLines.length > 0) {
					const data = dataLines.join("\n").trim();
					if (data && data !== "[DONE]") try {
						yield JSON.parse(data);
					} catch (cause) {
						throw new CodexProtocolError(`Invalid Codex SSE JSON: ${formatThrownValue(cause)}`, {
							cause,
							payload: data
						});
					}
				}
				idx = buffer.indexOf("\n\n");
			}
			if (done) break;
		}
	} finally {
		signal?.removeEventListener("abort", onAbort);
		try {
			await reader.cancel();
		} catch {}
		try {
			reader.releaseLock();
		} catch {}
	}
}
const OPENAI_BETA_RESPONSES_WEBSOCKETS = "responses_websockets=2026-02-06";
const SESSION_WEBSOCKET_CACHE_TTL_MS = 300 * 1e3;
const SESSION_WEBSOCKET_MAX_AGE_MS = 3300 * 1e3;
const websocketSessionCache = /* @__PURE__ */ new Map();
const websocketDebugStats = /* @__PURE__ */ new Map();
const websocketSseFallbackSessions = /* @__PURE__ */ new Set();
function getOrCreateWebSocketDebugStats(sessionId) {
	let stats = websocketDebugStats.get(sessionId);
	if (!stats) {
		stats = {
			requests: 0,
			connectionsCreated: 0,
			connectionsReused: 0,
			cachedContextRequests: 0,
			storeTrueRequests: 0,
			fullContextRequests: 0,
			deltaRequests: 0,
			lastInputItems: 0,
			websocketFailures: 0,
			sseFallbacks: 0
		};
		websocketDebugStats.set(sessionId, stats);
	}
	return stats;
}
function getOpenAICodexWebSocketDebugStats(sessionId) {
	const stats = websocketDebugStats.get(sessionId);
	return stats ? { ...stats } : void 0;
}
function resetOpenAICodexWebSocketDebugStats(sessionId) {
	if (sessionId) {
		websocketDebugStats.delete(sessionId);
		websocketSseFallbackSessions.delete(sessionId);
		return;
	}
	websocketDebugStats.clear();
	websocketSseFallbackSessions.clear();
}
function closeOpenAICodexWebSocketSessions(sessionId) {
	const closeEntry = (entry) => {
		if (entry.idleTimer) clearTimeout(entry.idleTimer);
		closeWebSocketSilently(entry.socket, 1e3, "debug_close");
	};
	if (sessionId) {
		for (const entry of websocketSessionCache.get(sessionId)?.values() ?? []) closeEntry(entry);
		websocketSessionCache.delete(sessionId);
		return;
	}
	for (const accountEntries of websocketSessionCache.values()) for (const entry of accountEntries.values()) closeEntry(entry);
	websocketSessionCache.clear();
}
registerSessionResourceCleanup(closeOpenAICodexWebSocketSessions);
function isWebSocketSseFallbackActive(sessionId) {
	return sessionId ? websocketSseFallbackSessions.has(sessionId) : false;
}
function recordWebSocketSseFallback(sessionId) {
	if (!sessionId) return;
	const stats = getOrCreateWebSocketDebugStats(sessionId);
	stats.sseFallbacks++;
	stats.websocketFallbackActive = isWebSocketSseFallbackActive(sessionId);
}
function recordWebSocketFailure(sessionId, error) {
	if (!sessionId) return;
	websocketSseFallbackSessions.add(sessionId);
	const stats = getOrCreateWebSocketDebugStats(sessionId);
	stats.websocketFailures++;
	stats.lastWebSocketError = formatThrownValue(error);
	stats.websocketFallbackActive = true;
}
let _cachedWebsocket = null;
async function getWebSocketConstructor(env) {
	if (!env && _cachedWebsocket) return _cachedWebsocket;
	if (typeof process !== "undefined" && process.versions?.bun) {
		const WebSocketWithProxy = class extends WebSocket {
			constructor(url, options) {
				let _opts = {};
				if (Array.isArray(options) || typeof options === "string") _opts = { protocols: options };
				else _opts = { ...options };
				const proxyUrl = resolveHttpProxyUrlForTarget(url.toString().replace(/^wss:/, "https:").replace(/^ws:/, "http:"), env);
				super(url, {
					..._opts,
					...proxyUrl ? { proxy: proxyUrl.toString() } : {}
				});
			}
		};
		if (!env) _cachedWebsocket = WebSocketWithProxy;
		return WebSocketWithProxy;
	}
	const ctor = globalThis.WebSocket;
	if (typeof ctor !== "function") return null;
	return ctor;
}
var WebSocketCloseError = class extends Error {
	code;
	reason;
	wasClean;
	constructor(message, options) {
		super(message);
		this.name = "WebSocketCloseError";
		this.code = options?.code;
		this.reason = options?.reason;
		this.wasClean = options?.wasClean;
	}
};
function getWebSocketReadyState(socket) {
	const readyState = socket.readyState;
	return typeof readyState === "number" ? readyState : void 0;
}
function isWebSocketReusable(socket) {
	const readyState = getWebSocketReadyState(socket);
	return readyState === void 0 || readyState === 1;
}
function isWebSocketSessionExpired(entry) {
	return Date.now() - entry.createdAt >= SESSION_WEBSOCKET_MAX_AGE_MS;
}
function closeWebSocketSilently(socket, code = 1e3, reason = "done") {
	try {
		socket.close(code, reason);
	} catch {}
}
function scheduleSessionWebSocketExpiry(sessionId, accountId, entry) {
	if (entry.idleTimer) clearTimeout(entry.idleTimer);
	entry.idleTimer = setTimeout(() => {
		if (entry.busy) return;
		closeWebSocketSilently(entry.socket, 1e3, "idle_timeout");
		const accountEntries = websocketSessionCache.get(sessionId);
		if (accountEntries?.get(accountId) === entry) accountEntries.delete(accountId);
		if (accountEntries?.size === 0) websocketSessionCache.delete(sessionId);
	}, SESSION_WEBSOCKET_CACHE_TTL_MS);
}
async function connectWebSocket(url, headers, signal, connectTimeoutMs = DEFAULT_WEBSOCKET_CONNECT_TIMEOUT_MS, env) {
	const WebSocketCtor = await getWebSocketConstructor(env);
	if (!WebSocketCtor) throw new Error("WebSocket transport is not available in this runtime");
	const wsHeaders = headersToRecord(headers);
	delete wsHeaders["OpenAI-Beta"];
	return new Promise((resolve, reject) => {
		let settled = false;
		let timeout;
		let socket;
		try {
			socket = new WebSocketCtor(url, { headers: wsHeaders });
		} catch (error) {
			reject(error instanceof Error ? error : new Error(String(error)));
			return;
		}
		const cleanup = () => {
			if (timeout) {
				clearTimeout(timeout);
				timeout = void 0;
			}
			socket.removeEventListener("open", onOpen);
			socket.removeEventListener("error", onError);
			socket.removeEventListener("close", onClose);
			signal?.removeEventListener("abort", onAbort);
		};
		const fail = (error, closeReason) => {
			if (settled) return;
			settled = true;
			cleanup();
			if (closeReason) closeWebSocketSilently(socket, 1e3, closeReason);
			reject(error);
		};
		const onOpen = () => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(socket);
		};
		const onError = (event) => {
			fail(extractWebSocketError(event));
		};
		const onClose = (event) => {
			fail(extractWebSocketCloseError(event));
		};
		const onAbort = () => {
			fail(/* @__PURE__ */ new Error("Request was aborted"), "aborted");
		};
		socket.addEventListener("open", onOpen);
		socket.addEventListener("error", onError);
		socket.addEventListener("close", onClose);
		signal?.addEventListener("abort", onAbort);
		if (connectTimeoutMs > 0) timeout = setTimeout(() => {
			fail(/* @__PURE__ */ new Error(`WebSocket connect timeout after ${connectTimeoutMs}ms`), "connect_timeout");
		}, connectTimeoutMs);
		if (signal?.aborted) onAbort();
	});
}
async function acquireWebSocket(url, headers, sessionId, accountId, signal, connectTimeoutMs, env) {
	if (!sessionId) {
		const socket = await connectWebSocket(url, headers, signal, connectTimeoutMs, env);
		return {
			socket,
			reused: false,
			release: () => closeWebSocketSilently(socket)
		};
	}
	let accountEntries = websocketSessionCache.get(sessionId);
	const cached = accountEntries?.get(accountId);
	if (cached) {
		if (cached.idleTimer) {
			clearTimeout(cached.idleTimer);
			cached.idleTimer = void 0;
		}
		if (!cached.busy && isWebSocketSessionExpired(cached)) {
			closeWebSocketSilently(cached.socket, 1e3, "connection_age_limit");
			accountEntries?.delete(accountId);
			if (accountEntries?.size === 0) websocketSessionCache.delete(sessionId);
		} else if (!cached.busy && isWebSocketReusable(cached.socket)) {
			cached.busy = true;
			return {
				socket: cached.socket,
				entry: cached,
				reused: true,
				release: ({ keep } = {}) => {
					if (!keep || !isWebSocketReusable(cached.socket)) {
						closeWebSocketSilently(cached.socket);
						const currentEntries = websocketSessionCache.get(sessionId);
						if (currentEntries?.get(accountId) === cached) currentEntries.delete(accountId);
						if (currentEntries?.size === 0) websocketSessionCache.delete(sessionId);
						return;
					}
					cached.busy = false;
					scheduleSessionWebSocketExpiry(sessionId, accountId, cached);
				}
			};
		}
		if (cached.busy) {
			const socket = await connectWebSocket(url, headers, signal, connectTimeoutMs, env);
			return {
				socket,
				reused: false,
				release: () => {
					closeWebSocketSilently(socket);
				}
			};
		}
		if (!isWebSocketReusable(cached.socket)) {
			closeWebSocketSilently(cached.socket);
			accountEntries?.delete(accountId);
			if (accountEntries?.size === 0) websocketSessionCache.delete(sessionId);
		}
	}
	const socket = await connectWebSocket(url, headers, signal, connectTimeoutMs, env);
	const entry = {
		socket,
		busy: true,
		createdAt: Date.now()
	};
	accountEntries = websocketSessionCache.get(sessionId);
	if (!accountEntries) {
		accountEntries = /* @__PURE__ */ new Map();
		websocketSessionCache.set(sessionId, accountEntries);
	}
	accountEntries.set(accountId, entry);
	return {
		socket,
		entry,
		reused: false,
		release: ({ keep } = {}) => {
			if (!keep || !isWebSocketReusable(entry.socket)) {
				closeWebSocketSilently(entry.socket);
				if (entry.idleTimer) clearTimeout(entry.idleTimer);
				const currentEntries = websocketSessionCache.get(sessionId);
				if (currentEntries?.get(accountId) === entry) currentEntries.delete(accountId);
				if (currentEntries?.size === 0) websocketSessionCache.delete(sessionId);
				return;
			}
			entry.busy = false;
			scheduleSessionWebSocketExpiry(sessionId, accountId, entry);
		}
	};
}
function extractWebSocketError(event) {
	if (event && typeof event === "object") {
		const message = "message" in event ? event.message : void 0;
		if (typeof message === "string" && message.length > 0) return new Error(message);
		const nestedError = "error" in event ? event.error : void 0;
		if (nestedError instanceof Error && nestedError.message.length > 0) return nestedError;
		if (nestedError && typeof nestedError === "object" && "message" in nestedError) {
			const nestedMessage = nestedError.message;
			if (typeof nestedMessage === "string" && nestedMessage.length > 0) return new Error(nestedMessage);
		}
	}
	return /* @__PURE__ */ new Error("WebSocket error");
}
function extractWebSocketCloseError(event) {
	if (event && typeof event === "object") {
		const code = "code" in event ? event.code : void 0;
		const reason = "reason" in event ? event.reason : void 0;
		const wasClean = "wasClean" in event ? event.wasClean : void 0;
		const codeText = typeof code === "number" ? ` ${code}` : "";
		let reasonText = typeof reason === "string" && reason.length > 0 ? ` ${reason}` : "";
		if (!reasonText && code === WEBSOCKET_MESSAGE_TOO_BIG_CLOSE_CODE) reasonText = " message too big";
		return new WebSocketCloseError(`WebSocket closed${codeText}${reasonText}`.trim(), {
			code: typeof code === "number" ? code : void 0,
			reason: typeof reason === "string" && reason.length > 0 ? reason : void 0,
			wasClean: typeof wasClean === "boolean" ? wasClean : void 0
		});
	}
	return /* @__PURE__ */ new Error("WebSocket closed");
}
async function decodeWebSocketData(data) {
	if (typeof data === "string") return data;
	if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data));
	if (ArrayBuffer.isView(data)) {
		const view = data;
		return new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
	}
	if (data && typeof data === "object" && "arrayBuffer" in data) {
		const arrayBuffer = await data.arrayBuffer();
		return new TextDecoder().decode(new Uint8Array(arrayBuffer));
	}
	return null;
}
async function* parseWebSocket(socket, signal, idleTimeoutMs) {
	const queue = [];
	let pending = null;
	let done = false;
	let failed = null;
	let sawCompletion = false;
	const wake = () => {
		if (!pending) return;
		const resolve = pending;
		pending = null;
		resolve();
	};
	const onMessage = (event) => {
		(async () => {
			let text = null;
			try {
				if (!event || typeof event !== "object" || !("data" in event)) return;
				text = await decodeWebSocketData(event.data);
				if (!text) return;
				const parsed = JSON.parse(text);
				const type = typeof parsed.type === "string" ? parsed.type : "";
				if (type === "response.completed" || type === "response.done" || type === "response.incomplete") {
					sawCompletion = true;
					done = true;
				}
				queue.push(parsed);
				wake();
			} catch (cause) {
				failed = new CodexProtocolError(`Invalid Codex WebSocket JSON: ${formatThrownValue(cause)}`, {
					cause,
					payload: text
				});
				done = true;
				wake();
			}
		})();
	};
	const onError = (event) => {
		failed = extractWebSocketError(event);
		done = true;
		wake();
	};
	const onClose = (event) => {
		if (sawCompletion) {
			done = true;
			wake();
			return;
		}
		if (!failed) failed = extractWebSocketCloseError(event);
		done = true;
		wake();
	};
	const onAbort = () => {
		failed = /* @__PURE__ */ new Error("Request was aborted");
		done = true;
		wake();
	};
	socket.addEventListener("message", onMessage);
	socket.addEventListener("error", onError);
	socket.addEventListener("close", onClose);
	signal?.addEventListener("abort", onAbort);
	try {
		while (true) {
			if (signal?.aborted) throw new Error("Request was aborted");
			if (queue.length > 0) {
				yield queue.shift();
				continue;
			}
			if (done) break;
			let timeout;
			await new Promise((resolve, reject) => {
				pending = resolve;
				if (idleTimeoutMs !== void 0 && idleTimeoutMs > 0) timeout = setTimeout(() => {
					const error = /* @__PURE__ */ new Error(`WebSocket idle timeout after ${idleTimeoutMs}ms`);
					failed = error;
					done = true;
					pending = null;
					closeWebSocketSilently(socket, 1e3, "idle_timeout");
					reject(error);
				}, idleTimeoutMs);
			}).finally(() => {
				if (timeout) clearTimeout(timeout);
			});
		}
		if (failed) throw failed;
		if (!sawCompletion) throw new Error("WebSocket stream closed before response.completed");
	} finally {
		socket.removeEventListener("message", onMessage);
		socket.removeEventListener("error", onError);
		socket.removeEventListener("close", onClose);
		signal?.removeEventListener("abort", onAbort);
	}
}
function requestBodyWithoutInput(body) {
	const { input: _input, previous_response_id: _previousResponseId, ...rest } = body;
	return rest;
}
function responseInputsEqual(a, b) {
	return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}
function requestBodiesMatchExceptInput(a, b) {
	return JSON.stringify(requestBodyWithoutInput(a)) === JSON.stringify(requestBodyWithoutInput(b));
}
function getCachedWebSocketInputDelta(body, continuation) {
	if (!requestBodiesMatchExceptInput(body, continuation.lastRequestBody)) return;
	const currentInput = body.input ?? [];
	const baseline = [...continuation.lastRequestBody.input ?? [], ...continuation.lastResponseItems];
	if (currentInput.length < baseline.length) return;
	if (!responseInputsEqual(currentInput.slice(0, baseline.length), baseline)) return;
	return currentInput.slice(baseline.length);
}
function buildCachedWebSocketRequestBody(entry, body) {
	const continuation = entry.continuation;
	if (!continuation) return body;
	const delta = getCachedWebSocketInputDelta(body, continuation);
	if (!delta || !continuation.lastResponseId) {
		entry.continuation = void 0;
		return body;
	}
	return {
		...body,
		previous_response_id: continuation.lastResponseId,
		input: delta
	};
}
async function* startWebSocketOutputOnFirstEvent(events, onStart) {
	let started = false;
	for await (const event of events) {
		if (!started) {
			started = true;
			onStart();
		}
		yield event;
	}
}
async function processWebSocketStream(url, body, headers, output, stream, model, onStart, idleTimeoutMs, websocketConnectTimeoutMs, cacheSessionId, accountId, grammarToolInputProperties, options) {
	const { socket, entry, reused, release } = await acquireWebSocket(url, headers, cacheSessionId, accountId, options?.signal, websocketConnectTimeoutMs, options?.env);
	let keepConnection = true;
	const useCachedContext = options?.transport === "websocket-cached" || options?.transport === "auto";
	const fullBody = body;
	const requestBody = useCachedContext && entry ? buildCachedWebSocketRequestBody(entry, fullBody) : fullBody;
	const stats = cacheSessionId ? getOrCreateWebSocketDebugStats(cacheSessionId) : void 0;
	if (stats) {
		stats.requests++;
		if (reused) stats.connectionsReused++;
		else stats.connectionsCreated++;
		if (useCachedContext) stats.cachedContextRequests++;
		if (requestBody.store === true) stats.storeTrueRequests++;
		stats.lastInputItems = requestBody.input?.length ?? 0;
		if (requestBody.previous_response_id) {
			stats.deltaRequests++;
			stats.lastDeltaInputItems = requestBody.input?.length ?? 0;
			stats.lastPreviousResponseId = requestBody.previous_response_id;
		} else {
			stats.fullContextRequests++;
			stats.lastDeltaInputItems = void 0;
			stats.lastPreviousResponseId = void 0;
		}
	}
	try {
		socket.send(JSON.stringify({
			type: "response.create",
			...requestBody
		}));
		await processResponsesStream(startWebSocketOutputOnFirstEvent(mapCodexEvents(parseWebSocket(socket, options?.signal, idleTimeoutMs), output, model, options?.onProviderStreamEvent), onStart), output, stream, model, {
			serviceTier: options?.serviceTier,
			grammarToolInputProperties,
			resolveServiceTier: resolveCodexServiceTier,
			applyServiceTierPricing: (usage, serviceTier) => applyServiceTierPricing(usage, serviceTier, model)
		});
		if (options?.signal?.aborted) keepConnection = false;
		else if (useCachedContext && entry && output.responseId) {
			const responseItems = convertResponsesMessages(model, normalizeContext({ messages: [output] }), CODEX_TOOL_CALL_PROVIDERS, {
				includeSystemPrompt: false,
				grammarToolInputProperties
			}).filter((item) => item.type !== "function_call_output" && item.type !== "custom_tool_call_output");
			entry.continuation = {
				lastRequestBody: fullBody,
				lastResponseId: output.responseId,
				lastResponseItems: responseItems
			};
		}
	} catch (error) {
		if (entry) entry.continuation = void 0;
		keepConnection = false;
		throw error;
	} finally {
		release({ keep: keepConnection });
	}
}
async function parseErrorResponse(response) {
	const raw = await response.text();
	let message = raw || response.statusText || "Request failed";
	let friendlyMessage;
	try {
		const err = JSON.parse(raw)?.error;
		if (err) {
			const code = err.code || err.type || "";
			if (/usage_limit_reached|usage_not_included|rate_limit_exceeded/i.test(code) || response.status === 429) {
				const plan = err.plan_type ? ` (${err.plan_type.toLowerCase()} plan)` : "";
				const mins = err.resets_at ? Math.max(0, Math.round((err.resets_at * 1e3 - Date.now()) / 6e4)) : void 0;
				friendlyMessage = `You have hit your ChatGPT usage limit${plan}.${mins !== void 0 ? ` Try again in ~${mins} min.` : ""}`.trim();
			}
			message = err.message || friendlyMessage || message;
		}
	} catch {}
	return {
		message,
		friendlyMessage
	};
}
function extractAccountId(token) {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) throw new Error("Invalid token");
		const accountId = JSON.parse(atob(parts[1]))?.[JWT_CLAIM_PATH]?.chatgpt_account_id;
		if (!accountId) throw new Error("No account ID in token");
		return accountId;
	} catch {
		throw new Error("Failed to extract accountId from token");
	}
}
function buildBaseCodexHeaders(defaultHeaders, initHeaders, additionalHeaders, accountId, token) {
	const headers = new Headers(defaultHeaders);
	for (const [key, value] of Object.entries(initHeaders || {})) headers.set(key, value);
	for (const [key, value] of Object.entries(additionalHeaders || {})) if (value === null) headers.delete(key);
	else headers.set(key, value);
	headers.set("Authorization", `Bearer ${token}`);
	headers.set("chatgpt-account-id", accountId);
	return headers;
}
function buildSSEHeaders(defaultHeaders, initHeaders, additionalHeaders, accountId, token, sessionId) {
	const headers = buildBaseCodexHeaders(defaultHeaders, initHeaders, additionalHeaders, accountId, token);
	headers.set("OpenAI-Beta", "responses=experimental");
	headers.set("accept", "text/event-stream");
	headers.set("content-type", "application/json");
	if (sessionId) {
		headers.set("session-id", sessionId);
		headers.set("x-client-request-id", sessionId);
	}
	return headers;
}
function buildWebSocketHeaders(defaultHeaders, initHeaders, additionalHeaders, accountId, token, requestId) {
	const headers = buildBaseCodexHeaders(defaultHeaders, initHeaders, additionalHeaders, accountId, token);
	headers.delete("accept");
	headers.delete("content-type");
	headers.delete("OpenAI-Beta");
	headers.delete("openai-beta");
	headers.set("OpenAI-Beta", OPENAI_BETA_RESPONSES_WEBSOCKETS);
	headers.set("x-client-request-id", requestId);
	headers.set("session-id", requestId);
	return headers;
}
//#endregion
export { closeOpenAICodexWebSocketSessions, getOpenAICodexWebSocketDebugStats, resetOpenAICodexWebSocketDebugStats, stream, streamSimple };
