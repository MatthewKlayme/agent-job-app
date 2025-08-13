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

// services/shared/score.ts
function scoreJob(job, settings) {
  const reasons = [];
  let score = 0;
  const text = `${job.title} ${job.location} ${job.description}`.toLowerCase();
  if (settings.exclude.some((ex) => text.includes(ex.toLowerCase()))) return { score: 0, reasons: ["Excluded keyword"], cat: "x" };
  const isHouston = settings.location.priority.some((p) => job.location.toLowerCase().includes(p.toLowerCase()));
  const hybridOnsite = job.hybrid || job.onsite || /hybrid|onsite/i.test(text);
  if (settings.location.hybrid_or_onsite_only && !hybridOnsite) return { score: 0, reasons: ["Not hybrid/onsite"], cat: "x" };
  if (isHouston) {
    score += 30;
    reasons.push("Houston priority");
  }
  if (job.salaryMin || job.salaryMax) {
    const minOk = !job.salaryMax || job.salaryMax >= settings.salary.min;
    const maxOk = !job.salaryMin || job.salaryMin <= settings.salary.max;
    if (minOk && maxOk) {
      score += 15;
      reasons.push("Salary in range");
    }
  }
  const mustHits = settings.keywords_must.filter((k) => text.includes(k.toLowerCase()));
  if (mustHits.length < 3) return { score: 0, reasons: ["Too few must-haves"], cat: "x" };
  score += mustHits.length * 5;
  reasons.push(`Musts: ${mustHits.join(", ")}`);
  const niceHits = settings.keywords_nice.filter((k) => text.includes(k.toLowerCase()));
  score += niceHits.length * 2;
  if (niceHits.length) reasons.push(`Nice: ${niceHits.join(", ")}`);
  if (!isHouston && job.remote) score -= 5;
  const cat = classifyRole(text);
  const catBonus = { fullstack: 10, mobile: 14, cloud: 16, solutions: 18, automation: 12 }[cat];
  score += catBonus;
  reasons.push(`Role category: ${cat} (+${catBonus})`);
  return { score: Math.max(0, score), reasons, cat };
}

// config/settings.json
var settings_default = {
  location: {
    priority: [
      "Houston, TX"
    ],
    allow: [
      "Houston, TX",
      "Texas",
      "United States",
      "Remote"
    ],
    hybrid_or_onsite_only: true
  },
  salary: {
    min: 9e4,
    max: 12e4
  },
  keywords_must: [
    "React",
    "Node",
    "MongoDB",
    "AWS",
    "Lambda",
    "SQS",
    "SES",
    "S3",
    "Azure",
    "Graph API",
    "React Native",
    "Hono",
    "Bun"
  ],
  keywords_nice: [
    "TypeScript",
    "Prisma",
    "Cognito",
    "Serverless",
    "Express",
    "Implementation",
    "Integration",
    "Solutions Engineer",
    "Automation",
    "Onboarding"
  ],
  exclude: [
    "Staff",
    "Principal",
    "Sr. Manager",
    "Security Engineer (Network)"
  ]
};

// services/ranker/handler.ts
var handler = async () => {
  const latest = list("discovered").sort().slice(-1)[0];
  if (!latest) return { count: 0 };
  const jobs = JSON.parse(getText(latest));
  const ranked = jobs.map((j) => ({ j, r: scoreJob(j, settings_default) })).filter((x) => x.r.score >= 40).sort((a, b) => b.r.score - a.r.score).map((x) => ({ ...x.j, score: x.r.score, reasons: x.r.reasons, cat: x.r.cat }));
  const key = `ranked/${Date.now()}.json`;
  putText(key, JSON.stringify(ranked, null, 2));
  return { count: ranked.length, key };
};

// services/ranker/run.ts
handler().then((r) => console.log("ranker:", r)).catch((e) => (console.error(e), process.exit(1)));
