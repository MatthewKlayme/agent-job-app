import { Hono } from "hono";
import { serve } from "bun";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const app = new Hono();
const ART = process.env.ARTIFACTS_DIR || "./artifacts";

app.get("/health", c => c.text("ok"));
app.get("/", c => {
    const discovered = existsSync(join(ART, "discovered")) ? readdirSync(join(ART, "discovered")).length : 0;
    const ranked = existsSync(join(ART, "ranked")) ? readdirSync(join(ART, "ranked")).length : 0;
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
    <h2 style="margin-top:24px;">Latest ranked</h2>
    ${listJson(join(ART, "ranked"))}
  </main>`);
});

function listJson(dir: string) {
    try {
        const files = readdirSync(dir).sort().slice(-5);
        const items = files.map(f => `<li><code>${f}</code></li>`).join("");
        return `<ul>${items}</ul>`;
    } catch { return "<p>No ranked files yet.</p>"; }
}

serve({ fetch: app.fetch, port: 5173 });
console.log("Dashboard: http://localhost:5173");