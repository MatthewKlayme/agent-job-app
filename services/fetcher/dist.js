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

// services/fetcher/handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);

// config/companies.json
var companies_default = [
  {
    name: "Datadog",
    greenhouseBoard: "datadoghq"
  }
];

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

// services/fetcher/handler.ts
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[fetcher] ${url} -> ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[fetcher] ${url} -> ${e?.message || e}`);
    return null;
  }
}
var handler = async () => {
  const jobs = [];
  for (const c of companies_default) {
    if (c.greenhouseBoard) {
      const url = `https://boards-api.greenhouse.io/v1/boards/${c.greenhouseBoard}/jobs`;
      const json = await fetchJSON(url);
      const list = Array.isArray(json?.jobs) ? json.jobs : [];
      if (!Array.isArray(json?.jobs)) {
        console.warn(`[fetcher] Greenhouse '${c.greenhouseBoard}': unexpected payload`);
      }
      for (const j of list) {
        const loc = j.location?.name || "";
        jobs.push({
          id: String(j.id),
          title: j.title,
          company: c.name,
          location: loc,
          url: j.absolute_url,
          description: (j.content || "").toString().slice(0, 5e3),
          source: "greenhouse",
          remote: /remote/i.test(loc) || /remote/i.test(j.title),
          hybrid: /hybrid/i.test(loc) || /hybrid/i.test(j.title),
          onsite: /on[- ]?site/i.test(loc) || /on[- ]?site/i.test(j.title)
        });
      }
    }
    if (c.leverBoard) {
      const url = `https://api.lever.co/v0/postings/${c.leverBoard}?mode=json`;
      const json = await fetchJSON(url);
      if (!Array.isArray(json)) {
        console.warn(`[fetcher] Lever '${c.leverBoard}': expected array, got ${typeof json}`);
      }
      const list = Array.isArray(json) ? json : [];
      for (const j of list) {
        const loc = (j.categories?.location || "").toString();
        jobs.push({
          id: j.id,
          title: j.text,
          company: c.name,
          location: loc,
          url: j.hostedUrl,
          description: (j.descriptionPlain || "").slice(0, 5e3),
          source: "lever",
          remote: /remote/i.test(loc),
          hybrid: /hybrid/i.test(loc),
          onsite: /on[- ]?site/i.test(loc)
        });
      }
    }
  }
  const key = `discovered/${Date.now()}.json`;
  putText(key, JSON.stringify(jobs, null, 2));
  return { count: jobs.length, key };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
