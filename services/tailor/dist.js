var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// services/tailor/handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);

// services/shared/fsStore.ts
var import_fs = require("fs");
var import_path = require("path");
var ARTIFACTS = process.env.ARTIFACTS_DIR || "./artifacts";
function putText(key, body) {
  const file = (0, import_path.join)(ARTIFACTS, key);
  (0, import_fs.mkdirSync)((0, import_path.dirname)(file), { recursive: true });
  (0, import_fs.writeFileSync)(file, body, "utf8");
  return file;
}
function getText(key) {
  return (0, import_fs.readFileSync)((0, import_path.join)(ARTIFACTS, key), "utf8");
}
function list(prefix) {
  const dir = (0, import_path.join)(ARTIFACTS, prefix);
  if (!(0, import_fs.existsSync)(dir)) return [];
  return (0, import_fs.readdirSync)(dir).map((f) => (0, import_path.join)(prefix, f));
}

// services/shared/roleClassifier.ts
var rules = [
  { cat: "mobile", re: /(react\s*native|mobile (engineer|developer)|ios|android)/i },
  { cat: "cloud", re: /(serverless|lambda|sqs|ses|s3|azure|graph api|cloud developer)/i },
  { cat: "solutions", re: /(solutions|implementation|professional services|onboarding|integration engineer)/i },
  { cat: "automation", re: /(automation|workflow|scripting|powershell|entra|azure ad|identity)/i },
  { cat: "fullstack", re: /(full[- ]?stack|react|node|mern|hono|bun)/i }
];
function classifyRole(text) {
  const t = text.toLowerCase();
  for (const r of rules) if (r.re.test(t)) return r.cat;
  return "fullstack";
}

// services/tailor/handler.ts
var import_meta = {};
var MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
var MAX_PER_RUN = Number(process.env.TAILOR_MAX_PER_RUN || 5);
var OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
async function chat(model, system, user, attempt = 1) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      messages: [{ role: "system", content: system }, { role: "user", content: user }]
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if ((res.status >= 500 || res.status === 429) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1e3 * attempt));
      return chat(model, system, user, attempt + 1);
    }
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || "";
}
function pickTemplates(cat) {
  const p = (n) => new URL(`./prompts/${n}`, import_meta.url);
  switch (cat) {
    case "mobile":
      return { r: p("resume_base_mobile.md"), c: p("cover_base_mobile.md") };
    case "cloud":
      return { r: p("resume_base_cloud.md"), c: p("cover_base_cloud.md") };
    case "solutions":
      return { r: p("resume_base_solutions.md"), c: p("cover_base_solutions.md") };
    case "automation":
      return { r: p("resume_base_automation.md"), c: p("cover_base_automation.md") };
    default:
      return { r: p("resume_base_fullstack.md"), c: p("cover_base_fullstack.md") };
  }
}
async function read(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to read template: ${url} (${res.status})`);
  return await res.text();
}
var handler = async () => {
  const latest = list("ranked").sort().slice(-1)[0];
  if (!latest) return { generated: 0 };
  const ranked = JSON.parse(getText(latest));
  const system = "Tailor truthfully for candidate: MERN, Hono/Bun, React Native, AWS (Lambda, SQS, SES, S3, Secrets, Cognito roles), Azure (App + Graph). Prefer Houston hybrid/onsite, salary 90\u2013120k. Never invent experience; only rephrase.";
  let generated = 0;
  for (const job of ranked.slice(0, MAX_PER_RUN)) {
    try {
      const cat = classifyRole(`${job.title} ${job.description}`);
      const { r, c } = pickTemplates(cat);
      const resumeBase = await read(r);
      const coverBase = await read(c);
      const tailoredResume = await chat(MODEL, system, `JD:
${job.description}

Resume base:
${resumeBase}`);
      const tailoredCover = await chat(MODEL, system, `JD:
${job.description}

Cover base:
${coverBase}`);
      const ts = Date.now();
      putText(`generated/${job.id}/resume-${ts}.md`, tailoredResume);
      putText(`generated/${job.id}/cover-${ts}.md`, tailoredCover);
      const summary = {
        jobId: job.id,
        title: job.title,
        company: job.company,
        category: cat,
        score: job.score,
        reasons: job.reasons,
        generatedAt: ts,
        model: MODEL
      };
      putText(`generated/${job.id}/summary-${ts}.json`, JSON.stringify(summary, null, 2));
      generated++;
      await new Promise((r2) => setTimeout(r2, 250));
    } catch (e) {
      putText(`generated/errors-${Date.now()}.log`, `[${job.id}] ${e?.message || e}`);
    }
  }
  return { generated };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
