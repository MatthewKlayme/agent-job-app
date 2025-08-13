import { list, getText, putText } from "../shared/fsStore";
import { classifyRole } from "../shared/roleClassifier";

// ---- config ----
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_PER_RUN = Number(process.env.TAILOR_MAX_PER_RUN || 5);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ---- helpers ----
async function chat(model: string, system: string, user: string, attempt = 1): Promise<string> {
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

    // Basic retry on 5xx or rate limit
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        if ((res.status >= 500 || res.status === 429) && attempt < 3) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            return chat(model, system, user, attempt + 1);
        }
        throw new Error(`OpenAI error ${res.status}: ${text}`);
    }

    const json = await res.json();
    return json?.choices?.[0]?.message?.content || "";
}

function pickTemplates(cat: string) {
    const p = (n: string) => new URL(`./prompts/${n}`, import.meta.url);
    switch (cat) {
        case "mobile": return { r: p("resume_base_mobile.md"), c: p("cover_base_mobile.md") };
        case "cloud": return { r: p("resume_base_cloud.md"), c: p("cover_base_cloud.md") };
        case "solutions": return { r: p("resume_base_solutions.md"), c: p("cover_base_solutions.md") };
        case "automation": return { r: p("resume_base_automation.md"), c: p("cover_base_automation.md") };
        default: return { r: p("resume_base_fullstack.md"), c: p("cover_base_fullstack.md") };
    }
}

// Bun supports fetch(URL) for local files
async function read(url: URL) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to read template: ${url} (${res.status})`);
    return await res.text();
}

export const handler = async () => {
    const latest = list("ranked").sort().slice(-1)[0];
    if (!latest) return { generated: 0 };

    const ranked: any[] = JSON.parse(getText(latest));
    const system =
        "Tailor truthfully for candidate: MERN, Hono/Bun, React Native, AWS (Lambda, SQS, SES, S3, Secrets, Cognito roles), " +
        "Azure (App + Graph). Prefer Houston hybrid/onsite, salary 90–120k. Never invent experience; only rephrase.";

    let generated = 0;

    for (const job of ranked.slice(0, MAX_PER_RUN)) {
        try {
            const cat = classifyRole(`${job.title} ${job.description}`);
            const { r, c } = pickTemplates(cat);
            const resumeBase = await read(r);
            const coverBase = await read(c);

            const tailoredResume = await chat(MODEL, system, `JD:\n${job.description}\n\nResume base:\n${resumeBase}`);
            const tailoredCover = await chat(MODEL, system, `JD:\n${job.description}\n\nCover base:\n${coverBase}`);

            const ts = Date.now();
            putText(`generated/${job.id}/resume-${ts}.md`, tailoredResume);
            putText(`generated/${job.id}/cover-${ts}.md`, tailoredCover);

            // write a small summary for the dashboard
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

            // gentle pacing
            await new Promise(r => setTimeout(r, 250));
        } catch (e: any) {
            putText(`generated/errors-${Date.now()}.log`, `[${job.id}] ${e?.message || e}`);
        }
    }

    return { generated };
};
