import { Hono } from "hono";
import { serve } from "bun";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const app = new Hono();
const ART = process.env.ARTIFACTS_DIR || "./artifacts";

app.get("/health", c => c.text("ok"));
app.get("/", c => {
    const discovered = dirCount("discovered");
    const ranked = dirCount("ranked");
    const generated = existsSync(join(ART, "generated")) ? readdirSync(join(ART, "generated")).length : 0;
    return c.html(`
  <main style="font-family:ui-sans-serif;padding:24px;max-width:880px;margin:auto;">
    <h1>Job Apply Agent</h1>
    <p>Filters: Houston hybrid/onsite; $90–120k; MERN + Adjacent roles</p>
    <div style="display:grid;gap:12px;grid-template-columns:repeat(3,1fr);">
      <div style="padding:16px;border:1px solid #ddd;border-radius:12px;">Discovered: <b>${discovered}</b></div>
      <div style="padding:16px;border:1px solid #ddd;border-radius:12px;">Ranked: <b>${ranked}</b></div>
      <div style="padding:16px;border:1px solid #ddd;border-radius:12px;">Generated: <b>${generated}</b></div>
    </div>
    <p style="margin-top:16px;">See <a href="/ranked">/ranked</a> and <a href="/generated">/generated</a>.</p>
  </main>`);
});

app.get("/ranked", c => {
    const files = listSorted("ranked").slice(-1);
    if (!files.length) return c.text("No ranked yet");
    const data = JSON.parse(readFileSync(join(ART, files[0]), "utf8"));
    return c.html(`<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`);
});

app.get("/generated", c => {
    try {
        const root = join(ART, "generated");
        const ids = readdirSync(root);
        const lis = ids.map(id => `<li><a href="/generated/${id}/resume">${id}</a></li>`).join("");
        return c.html(`<ul>${lis || "<li>None yet</li>"}</ul>`);
    } catch { return c.html("<p>None yet</p>"); }
});

app.get("/generated/:id/resume", (c) => {
    const id = c.req.param("id");
    const file = latestFile(join(ART, "generated", id), "resume");
    if (!file) return c.text("No resume yet");
    const md = readFileSync(file, "utf8");
    return c.html(`<pre>${escapeHtml(md)}</pre>`);
});

app.get("/generated/:id/cover", (c) => {
    const id = c.req.param("id");
    const file = latestFile(join(ART, "generated", id), "cover");
    if (!file) return c.text("No cover yet");
    const md = readFileSync(file, "utf8");
    return c.html(`<pre>${escapeHtml(md)}</pre>`);
});

function dirCount(name: string) {
    const p = join(ART, name);
    return existsSync(p) ? readdirSync(p).length : 0;
}
function listSorted(name: string) {
    const p = join(ART, name);
    if (!existsSync(p)) return [];
    return readdirSync(p).map(f => join(name, f)).sort();
}
function latestFile(dir: string, prefix: string) {
    try {
        const files = readdirSync(dir).filter(f => f.startsWith(prefix)).sort();
        if (!files.length) return null;
        return join(dir, files.at(-1)!);
    } catch { return null; }
}
function escapeHtml(s: string) {
    return s.replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch] as string));
}

serve({ fetch: app.fetch, port: 5173 });
console.log("Dashboard: http://localhost:5173");