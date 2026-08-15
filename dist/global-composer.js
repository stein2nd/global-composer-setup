#!/usr/bin/env node
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_fs = require("node:fs");
node_fs = __toESM(node_fs);
let node_path = require("node:path");
node_path = __toESM(node_path);
let node_url = require("node:url");
let node_os = require("node:os");
node_os = __toESM(node_os);
let node_child_process = require("node:child_process");
//#region src/domain/constants.ts
var PHP_CONSTRAINT = ">=8.3";
var SELF_PACKAGE = "stein2nd/global-composer";
var CCU_PACKAGE = "webworkerjoshua/composer-check-updates";
var MATERIALIZED_NAME = "global-composer/user-manifest";
var MATERIALIZED_DESCRIPTION = "Effective Composer global manifest (generated)";
var SETUP_DIR_NAME = "global-composer";
//#endregion
//#region src/adapters/package-root.ts
function findPackageRoot(startDir) {
	let dir = node_path.default.resolve(startDir);
	while (true) {
		const composerPath = node_path.default.join(dir, "composer.json");
		if (node_fs.default.existsSync(composerPath)) try {
			if (JSON.parse(node_fs.default.readFileSync(composerPath, "utf8")).name === "stein2nd/global-composer") return dir;
		} catch {}
		const parent = node_path.default.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(`Could not locate ${SELF_PACKAGE} package root from ${startDir}`);
}
function fileUrlDir(url) {
	return node_path.default.dirname((0, node_url.fileURLToPath)(url));
}
function defaultStartDir() {
	const metaUrl = {}.url;
	if (typeof metaUrl === "string" && metaUrl.startsWith("file:")) return fileUrlDir(metaUrl);
	const script = process.argv[1];
	if (script) try {
		return node_path.default.dirname(node_fs.default.realpathSync(script));
	} catch {
		return node_path.default.dirname(node_path.default.resolve(script));
	}
	return process.cwd();
}
function resolvePackageRoot(fromUrl) {
	if (fromUrl && fromUrl.startsWith("file:")) return findPackageRoot(fileUrlDir(fromUrl));
	return findPackageRoot(defaultStartDir());
}
//#endregion
//#region src/adapters/paths.ts
function defaultSetupDir() {
	if (process.platform === "win32") {
		const appData = process.env.APPDATA ?? node_path.default.join(node_os.default.homedir(), "AppData", "Roaming");
		return node_path.default.join(appData, SETUP_DIR_NAME);
	}
	return node_path.default.join(node_os.default.homedir(), ".config", SETUP_DIR_NAME);
}
function resolveSetupContext(packageRoot) {
	const setupDir = node_path.default.resolve(process.env["GLOBAL_COMPOSER_SETUP_DIR"]?.trim() || defaultSetupDir());
	return {
		packageRoot,
		setupDir,
		upstreamComposerPath: node_path.default.join(packageRoot, "composer.json"),
		materializedComposerPath: node_path.default.join(setupDir, "composer.json"),
		userDepsPath: node_path.default.join(setupDir, "user-deps.json"),
		metaPath: node_path.default.join(setupDir, ".upstream-meta.json")
	};
}
//#endregion
//#region src/adapters/json-io.ts
function readJson(filePath) {
	if (!node_fs.default.existsSync(filePath)) return null;
	const raw = node_fs.default.readFileSync(filePath, "utf8");
	return JSON.parse(raw);
}
function writeJson(filePath, data) {
	node_fs.default.mkdirSync(node_path.default.dirname(filePath), { recursive: true });
	node_fs.default.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, "utf8");
}
function ensureSetupDir(ctx) {
	node_fs.default.mkdirSync(ctx.setupDir, { recursive: true });
	if (!node_fs.default.existsSync(ctx.userDepsPath)) writeJson(ctx.userDepsPath, {
		require: {},
		"require-dev": {}
	});
}
function readConstraintMap(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const result = {};
	for (const [name, constraint] of Object.entries(value)) if (typeof constraint === "string") result[name] = constraint;
	return result;
}
function readUserDeps(ctx) {
	const data = readJson(ctx.userDepsPath);
	return {
		require: readConstraintMap(data?.require),
		requireDev: readConstraintMap(data?.["require-dev"])
	};
}
function writeUserDeps(ctx, userDeps) {
	writeJson(ctx.userDepsPath, {
		require: userDeps.require,
		"require-dev": userDeps.requireDev
	});
}
function readMaterialized(filePath) {
	const data = readJson(filePath);
	if (!data) return null;
	return {
		require: readConstraintMap(data.require),
		requireDev: readConstraintMap(data["require-dev"])
	};
}
function readRequire(filePath) {
	return readMaterialized(filePath)?.require ?? {};
}
//#endregion
//#region src/domain/parse-add-spec.ts
var COMPOSER_NAME = /^[a-z0-9]([_.-]?[a-z0-9]+)*\/[a-z0-9]([_.-]?[a-z0-9]+)*$/i;
function isComposerPackageName(name) {
	return COMPOSER_NAME.test(name);
}
function parseAddSpec(arg) {
	if (!arg || typeof arg !== "string") return {
		name: "",
		constraint: void 0,
		valid: false
	};
	const colon = arg.indexOf(":");
	const name = colon === -1 ? arg : arg.slice(0, colon);
	const rawConstraint = colon === -1 ? void 0 : arg.slice(colon + 1);
	return {
		name,
		constraint: rawConstraint === "" ? void 0 : rawConstraint,
		valid: isComposerPackageName(name)
	};
}
//#endregion
//#region src/adapters/spawn.ts
function useShell() {
	return process.platform === "win32";
}
function runCommand(command, args, { spawn = node_child_process.spawnSync, inherit = true, cwd } = {}) {
	return spawn(command, args, {
		cwd,
		encoding: "utf8",
		stdio: inherit ? "inherit" : "pipe",
		shell: useShell()
	});
}
function exitStatus(result) {
	if (result.error) {
		console.error(result.error.message);
		return 1;
	}
	return result.status ?? 1;
}
//#endregion
//#region src/adapters/composer.ts
function runComposer(args, options = {}) {
	return exitStatus(runCommand("composer", args, {
		inherit: true,
		...options
	}));
}
function captureComposer(args, options = {}) {
	const result = runCommand("composer", args, {
		inherit: false,
		...options
	});
	return {
		status: result.error ? 1 : result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? ""
	};
}
function resolveComposerHome(options = {}) {
	const fromEnv = process.env.COMPOSER_HOME?.trim();
	if (fromEnv) return node_path.default.resolve(fromEnv);
	const line = captureComposer([
		"global",
		"config",
		"home"
	], options).stdout.trim().split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean).pop();
	if (!line) throw new Error("Failed to resolve COMPOSER_HOME via `composer global config home`.");
	return line;
}
function allowCcuPlugin(options = {}) {
	return runComposer([
		"global",
		"config",
		`allow-plugins.${CCU_PACKAGE}`,
		"true"
	], options);
}
//#endregion
//#region src/domain/parse-latest-stable.ts
var UNSTABLE = /(?:^dev-)|-(?:dev|alpha|a|beta|b|rc|preview)\d*/i;
function isStableVersion(version) {
	const normalized = version.trim().replace(/^v/i, "");
	if (!normalized) return false;
	return !UNSTABLE.test(normalized) && !normalized.startsWith("dev-");
}
function parseLatestStable(stdout) {
	const trimmed = stdout.trim();
	if (!trimmed) return;
	try {
		const stable = collectVersions(JSON.parse(trimmed)).find((version) => isStableVersion(version));
		if (stable) return stripVersionPrefix(stable);
	} catch {
		const match = trimmed.match(/\b(?:v)?(\d+\.\d+\.\d+(?:[.-][0-9A-Za-z]+)?)\b/);
		if (match && isStableVersion(match[1])) return stripVersionPrefix(match[1]);
	}
}
function collectVersions(parsed) {
	if (typeof parsed === "string" && parsed) return [parsed];
	if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string");
	if (!parsed || typeof parsed !== "object") return [];
	const record = parsed;
	if (typeof record.latest === "string") return [record.latest];
	if (typeof record.version === "string") return [record.version];
	if (Array.isArray(record.versions)) return record.versions.filter((item) => typeof item === "string");
	if (record.versions && typeof record.versions === "object") return Object.keys(record.versions);
	return [];
}
function stripVersionPrefix(version) {
	return version.trim().replace(/^v/i, "");
}
//#endregion
//#region src/application/resolve-default-constraint.ts
function resolveDefaultConstraint(packageName, { spawn, log = console.error } = {}) {
	const result = captureComposer([
		"show",
		packageName,
		"--available",
		"--format=json"
	], { spawn });
	if (result.status === 0) {
		const version = parseLatestStable(result.stdout);
		if (version) return `^${version}`;
	}
	log(`Warning: could not resolve latest version for ${packageName}; using "*".`);
	return "*";
}
//#endregion
//#region src/domain/materialized.ts
function buildMaterializedComposer(merged) {
	return {
		name: MATERIALIZED_NAME,
		description: MATERIALIZED_DESCRIPTION,
		require: merged.require,
		requireDev: merged.requireDev
	};
}
function toComposerJson(manifest) {
	return {
		name: manifest.name,
		description: manifest.description,
		require: manifest.require,
		"require-dev": manifest.requireDev
	};
}
//#endregion
//#region src/domain/merge-require.ts
function mergeRequire({ upstream, current, meta, userDeps }) {
	const merged = {};
	const upstreamRequire = upstream.require ?? {};
	const userOverrides = userDeps.require ?? {};
	const prevUpstream = meta?.require ?? {};
	const currentRequire = current?.require ?? {};
	for (const [name, upstreamConstraint] of Object.entries(upstreamRequire)) {
		if (name === "php") {
			merged[name] = PHP_CONSTRAINT;
			continue;
		}
		if (Object.hasOwn(userOverrides, name)) {
			merged[name] = userOverrides[name];
			continue;
		}
		const currentConstraint = currentRequire[name];
		const prevConstraint = prevUpstream[name];
		if (currentConstraint !== void 0 && prevConstraint !== void 0 && currentConstraint !== prevConstraint) merged[name] = currentConstraint;
		else merged[name] = upstreamConstraint;
	}
	for (const [name, constraint] of Object.entries(userOverrides)) if (!Object.hasOwn(upstreamRequire, name)) merged[name] = constraint;
	for (const [name, constraint] of Object.entries(currentRequire)) {
		if (Object.hasOwn(merged, name) || name === "php") continue;
		const wasUpstream = Object.hasOwn(prevUpstream, name);
		const stillUpstream = Object.hasOwn(upstreamRequire, name);
		if (wasUpstream && !stillUpstream && !Object.hasOwn(userOverrides, name)) continue;
		merged[name] = constraint;
	}
	merged["php"] = PHP_CONSTRAINT;
	return merged;
}
//#endregion
//#region src/domain/merge-require-dev.ts
function mergeRequireDev({ current, meta, userDeps }) {
	const merged = {};
	const userDev = userDeps.requireDev ?? {};
	const prevUserDev = meta?.userDeps?.requireDev ?? {};
	const currentDev = current?.requireDev ?? {};
	for (const [name, userConstraint] of Object.entries(userDev)) {
		const currentConstraint = currentDev[name];
		const prevConstraint = prevUserDev[name];
		if (currentConstraint !== void 0 && prevConstraint !== void 0 && currentConstraint !== prevConstraint) merged[name] = currentConstraint;
		else merged[name] = userConstraint;
	}
	for (const [name, constraint] of Object.entries(currentDev)) {
		if (Object.hasOwn(merged, name) || Object.hasOwn(userDev, name)) continue;
		if (Object.hasOwn(prevUserDev, name)) continue;
		merged[name] = constraint;
	}
	return merged;
}
//#endregion
//#region src/domain/official-require.ts
function officialRequireFromComposerJson(composerJson) {
	const extraRequire = composerJson.extra?.["global-composer"]?.require ?? {};
	return {
		...composerJson.require ?? {},
		...extraRequire
	};
}
//#endregion
//#region src/domain/report.ts
function diffSections(before = {}, after = {}) {
	const added = [];
	const updated = [];
	const removed = [];
	for (const [name, range] of Object.entries(after)) if (!Object.hasOwn(before, name)) added.push({
		name,
		range
	});
	else if (before[name] !== range) updated.push({
		name,
		from: before[name],
		to: range
	});
	for (const name of Object.keys(before)) if (!Object.hasOwn(after, name)) removed.push({
		name,
		range: before[name]
	});
	return {
		added,
		updated,
		removed
	};
}
function buildReport(before, after) {
	return {
		require: diffSections(before?.require, after.require),
		requireDev: diffSections(before?.requireDev, after.requireDev)
	};
}
function hasReportChanges(report) {
	for (const section of Object.values(report)) if (section.added.length > 0 || section.updated.length > 0 || section.removed.length > 0) return true;
	return false;
}
function formatReport(report) {
	const lines = [];
	const sections = [["require", report.require], ["require-dev", report.requireDev]];
	for (const [sectionName, section] of sections) {
		for (const { name, range } of section.added) lines.push(`+ ${sectionName} ${name}:${range}`);
		for (const { name, from, to } of section.updated) lines.push(`~ ${sectionName} ${name}: ${from} -> ${to}`);
		for (const { name, range } of section.removed) lines.push(`- ${sectionName} ${name}:${range}`);
	}
	return lines;
}
//#endregion
//#region src/application/sync-manifest.ts
function readUpstreamVersion(upstream) {
	const extra = upstream.extra;
	if (extra && typeof extra === "object" && !Array.isArray(extra)) {
		const block = extra["global-composer"];
		if (block && typeof block === "object" && !Array.isArray(block)) {
			const version = block["upstream-version"];
			if (typeof version === "string" && version) return version;
		}
	}
	if (typeof upstream.version === "string" && upstream.version) return upstream.version;
	return "0.0.0-dev";
}
function syncManifest(ctx, { dryRun = false } = {}) {
	const upstream = readJson(ctx.upstreamComposerPath);
	if (!upstream) throw new Error(`Failed to read upstream composer.json: ${ctx.upstreamComposerPath}`);
	const userDeps = readUserDeps(ctx);
	const current = readMaterialized(ctx.materializedComposerPath);
	const metaRaw = readJson(ctx.metaPath);
	const metaUserDeps = metaRaw?.userDeps && typeof metaRaw.userDeps === "object" ? metaRaw.userDeps : {};
	const meta = metaRaw ? {
		upstreamVersion: typeof metaRaw.upstreamVersion === "string" ? metaRaw.upstreamVersion : "",
		require: readConstraintMap(metaRaw.require),
		userDeps: {
			require: readConstraintMap(metaUserDeps.require),
			requireDev: readConstraintMap(metaUserDeps["require-dev"])
		}
	} : null;
	const extra = upstream.extra && typeof upstream.extra === "object" && !Array.isArray(upstream.extra) ? upstream.extra : {};
	const extraBlock = extra["global-composer"] && typeof extra["global-composer"] === "object" && !Array.isArray(extra["global-composer"]) ? extra["global-composer"] : {};
	const upstreamRequire = officialRequireFromComposerJson({
		require: readConstraintMap(upstream.require),
		extra: { "global-composer": { require: readConstraintMap(extraBlock.require) } }
	});
	const merged = {
		require: mergeRequire({
			upstream: { require: upstreamRequire },
			current,
			meta,
			userDeps
		}),
		requireDev: mergeRequireDev({
			current,
			meta,
			userDeps
		})
	};
	const nextPkg = toComposerJson(buildMaterializedComposer(merged));
	const report = buildReport(current, merged);
	const changed = hasReportChanges(report);
	if (!dryRun) {
		writeJson(ctx.materializedComposerPath, nextPkg);
		writeJson(ctx.metaPath, {
			upstreamVersion: readUpstreamVersion(upstream),
			require: { ...upstreamRequire },
			userDeps: {
				require: { ...userDeps.require },
				"require-dev": { ...userDeps.requireDev }
			}
		});
	}
	return {
		changed,
		report,
		nextPkg
	};
}
//#endregion
//#region src/application/handle-add.ts
function handleAdd(ctx, args) {
	const isDev = args.includes("--dev");
	const positional = args.filter((arg) => arg !== "--dev");
	if (positional.length !== 1) {
		console.error("Usage: global-composer add <vendor/pkg>[:constraint] [--dev]");
		return 1;
	}
	const spec = parseAddSpec(positional[0]);
	if (!spec.valid) {
		console.error("Package name must be in vendor/package form.");
		return 1;
	}
	const constraint = spec.constraint !== void 0 ? spec.constraint : resolveDefaultConstraint(spec.name);
	ensureSetupDir(ctx);
	const userDeps = readUserDeps(ctx);
	if (isDev) userDeps.requireDev[spec.name] = constraint;
	else userDeps.require[spec.name] = constraint;
	writeUserDeps(ctx, userDeps);
	syncManifest(ctx);
	const section = isDev ? "require-dev" : "require";
	console.error(`Added ${spec.name}:${constraint} to user-deps.json (${section}).`);
	return 0;
}
//#endregion
//#region src/adapters/ccu.ts
function ccuArgs(setupDir, extra) {
	return [
		"--working-dir",
		setupDir,
		"check-updates",
		...extra
	];
}
function runCcuCheck(setupDir, options = {}) {
	return runComposer(ccuArgs(setupDir, ["--dry-run"]), options);
}
function captureCcuJson(setupDir, options = {}) {
	return captureComposer(ccuArgs(setupDir, [
		"--dry-run",
		"--format",
		"json"
	]), options);
}
//#endregion
//#region src/application/prepare.ts
function prepare(ctx) {
	ensureSetupDir(ctx);
	return syncManifest(ctx);
}
//#endregion
//#region src/application/handle-check.ts
function handleCheck(ctx) {
	prepare(ctx);
	return runCcuCheck(ctx.setupDir);
}
//#endregion
//#region src/domain/install-spec.ts
function toGlobalInstallSpec(name, constraint) {
	const trimmed = typeof constraint === "string" ? constraint.trim() : "";
	if (!trimmed) return name;
	return `${name}:${trimmed}`;
}
//#endregion
//#region src/domain/platform-package.ts
function isPlatformPackage(name) {
	return name === "php" || name.startsWith("ext-");
}
//#endregion
//#region src/application/handle-install.ts
function handleInstall(ctx) {
	prepare(ctx);
	const requireMap = readRequire(ctx.materializedComposerPath);
	const specs = Object.entries(requireMap).filter(([name]) => !isPlatformPackage(name)).map(([name, constraint]) => toGlobalInstallSpec(name, constraint));
	if (specs.length === 0) {
		console.error("No packages to install.");
		return 1;
	}
	const allowStatus = allowCcuPlugin();
	if (allowStatus !== 0) return allowStatus;
	return runComposer([
		"global",
		"require",
		"--",
		...specs
	]);
}
//#endregion
//#region src/application/handle-list.ts
function handleList() {
	const home = resolveComposerHome();
	console.log(`COMPOSER_HOME=${home}`);
	return runComposer(["global", "show"]);
}
//#endregion
//#region src/application/handle-sync.ts
function handleSync(ctx, dryRun) {
	ensureSetupDir(ctx);
	const { changed, report } = syncManifest(ctx, { dryRun });
	if (dryRun) {
		const lines = formatReport(report);
		if (lines.length === 0) console.error("No changes.");
		else for (const line of lines) console.error(line);
		return 0;
	}
	if (changed) console.error(`Synced materialized manifest: ${ctx.materializedComposerPath}`);
	return 0;
}
//#endregion
//#region src/domain/apply-ccu-updates.ts
function applyCcuUpdates(current, updates) {
	const requireMap = { ...current.require };
	const requireDev = { ...current.requireDev };
	for (const update of updates) {
		const suggested = update.suggestedConstraint;
		if (!suggested) continue;
		if (update.dev) {
			if (Object.hasOwn(requireDev, update.package)) requireDev[update.package] = suggested;
			continue;
		}
		if (update.package === "php") continue;
		if (Object.hasOwn(requireMap, update.package)) requireMap[update.package] = suggested;
	}
	requireMap["php"] = PHP_CONSTRAINT;
	return {
		...current,
		require: requireMap,
		requireDev
	};
}
//#endregion
//#region src/domain/parse-ccu-json.ts
function extractJsonObject(text) {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) return null;
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}
function parseCcuJson(stdout) {
	const data = extractJsonObject(stdout);
	if (!data || typeof data !== "object" || Array.isArray(data)) return [];
	const updates = [];
	for (const [pkg, raw] of Object.entries(data)) {
		if (!raw || typeof raw !== "object") continue;
		updates.push({
			package: pkg,
			constraint: typeof raw.constraint === "string" ? raw.constraint : "",
			installed: typeof raw.installed === "string" ? raw.installed : void 0,
			dev: Boolean(raw.dev),
			inRange: raw.inRange ?? null,
			latest: raw.latest ?? null,
			suggestedConstraint: typeof raw.suggestedConstraint === "string" ? raw.suggestedConstraint : void 0
		});
	}
	return updates;
}
//#endregion
//#region src/application/handle-update.ts
function handleUpdate(ctx) {
	prepare(ctx);
	const captured = captureCcuJson(ctx.setupDir);
	if (captured.stderr) process.stderr.write(captured.stderr);
	if (captured.status !== 0) {
		if (captured.stdout) process.stdout.write(captured.stdout);
		return captured.status;
	}
	const current = readMaterialized(ctx.materializedComposerPath) ?? {
		require: { ["php"]: ">=8.3" },
		requireDev: {}
	};
	const next = applyCcuUpdates({
		name: MATERIALIZED_NAME,
		description: MATERIALIZED_DESCRIPTION,
		require: current.require,
		requireDev: current.requireDev
	}, parseCcuJson(captured.stdout));
	writeJson(ctx.materializedComposerPath, toComposerJson(next));
	if (captured.stdout.trim()) process.stdout.write(captured.stdout.endsWith("\n") ? captured.stdout : `${captured.stdout}\n`);
	return 0;
}
//#endregion
//#region src/cli/usage.ts
var USAGE = `Usage: global-composer <check|update|install|sync|add|list>

  check    Check for available updates (composer check-updates --dry-run)
  update   Update version constraints in composer.json (ccu)
  install  Install require into the Composer global project
  sync     Merge upstream + user-deps into materialized composer.json
  add      Add a package to user-deps.json (optional: --dev)
  list     List packages in the Composer global project (composer global show)
`;
function printUsage() {
	console.error(USAGE);
}
//#endregion
//#region src/cli/run.ts
function runMain(argv) {
	const [subcommand, ...rest] = argv;
	try {
		if (subcommand === "list") {
			if (rest.length > 0) {
				printUsage();
				return 1;
			}
			return handleList();
		}
		switch (subcommand) {
			case "check":
				if (rest.length > 0) {
					printUsage();
					return 1;
				}
				return handleCheck(resolveSetupContext(resolvePackageRoot()));
			case "update":
				if (rest.length > 0) {
					printUsage();
					return 1;
				}
				return handleUpdate(resolveSetupContext(resolvePackageRoot()));
			case "install":
				if (rest.length > 0) {
					printUsage();
					return 1;
				}
				return handleInstall(resolveSetupContext(resolvePackageRoot()));
			case "sync":
				if (rest.some((arg) => arg !== "--dry-run")) {
					printUsage();
					return 1;
				}
				return handleSync(resolveSetupContext(resolvePackageRoot()), rest.includes("--dry-run"));
			case "add": {
				const positional = rest.filter((arg) => arg !== "--dev");
				if (positional.length !== 1 || !parseAddSpec(positional[0]).valid) {
					printUsage();
					return 1;
				}
				return handleAdd(resolveSetupContext(resolvePackageRoot()), rest);
			}
			default:
				printUsage();
				return 1;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		return 1;
	}
}
//#endregion
//#region src/cli/main.ts
process.exit(runMain(process.argv.slice(2)));
//#endregion

//# sourceMappingURL=global-composer.js.map