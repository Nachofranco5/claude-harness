// Lo mismo que `/codex:adversarial-review --base <ref>` del plugin codex@openai-codex, pero con el diff INCLUIDO en el
// pedido. Por qué (20/11, Jarvis L29): con más de 2 archivos el plugin le pide a Codex que lea el diff él mismo con git,
// y en Windows su modo solo-lectura se lo bloquea → «no pude inspeccionar el diff», cero revisión. Tope del diff: 256 KB.
// Uso (desde la raíz del repo): node <harness>/plugins/harness-nacho/scripts/codex_revision.mjs "$(pwd -W)" <base> "<foco>"
// Sale JSON {verdict, summary, findings[], next_steps[]}; el progreso va a stderr.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = path.join(os.homedir(), ".claude", "plugins", "cache", "openai-codex", "codex");
const version = fs.readdirSync(RAIZ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
const PLUGIN = path.join(RAIZ, version);
const imp = (p) => import(pathToFileURL(path.join(PLUGIN, "scripts", p)).href);
const { collectReviewContext, resolveReviewTarget } = await imp("lib/git.mjs");
const { runAppServerTurn, parseStructuredOutput } = await imp("lib/codex.mjs");
const { loadPromptTemplate, interpolateTemplate } = await imp("lib/prompts.mjs");

const [repo, base, foco] = process.argv.slice(2);
const target = resolveReviewTarget(repo, { base });
const context = collectReviewContext(repo, target, { includeDiff: true });
console.error(`[inline] modo=${context.inputMode} archivos=${context.fileCount} bytes=${context.diffBytes}`);
const prompt = interpolateTemplate(loadPromptTemplate(PLUGIN, "adversarial-review"), {
  REVIEW_KIND: "Adversarial Review",
  TARGET_LABEL: target.label,
  USER_FOCUS: foco || "No extra focus provided.",
  REVIEW_COLLECTION_GUIDANCE: context.collectionGuidance,
  REVIEW_INPUT: context.content,
});
const schema = JSON.parse(fs.readFileSync(path.join(PLUGIN, "schemas", "review-output.schema.json"), "utf8"));
const result = await runAppServerTurn(context.repoRoot, {
  prompt,
  sandbox: "read-only",
  outputSchema: schema,
  onProgress: (m) => console.error(`[codex] ${typeof m === "string" ? m : JSON.stringify(m).slice(0, 200)}`),
});
const parsed = parseStructuredOutput(result.finalMessage, { status: result.status, failureMessage: result.error?.message ?? result.stderr });
console.log(JSON.stringify(parsed.parsed ?? { raw: parsed.rawOutput, error: parsed.parseError }, null, 2));
