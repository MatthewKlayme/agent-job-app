import { list, getText, putText } from "../shared/fsStore";
import { classifyRole } from "../shared/roleClassifier";

async function chat(model: string, system: string, user: string) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0.25, messages: [{ role: "system", content: system }, { role: "user", content: user }] })
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
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

async function read(url: URL) { return await (await fetch(url)).text(); }

export const handler = async () => {
    const latest = list("ranked").sort().slice(-1)[0];
    if (!latest) return { count: 0 };
    const ranked: any[] = JSON.parse(getText(latest));

    let generated = 0;
    for (const job of ranked.slice(0, 5)) { // cap per run
        const cat = classifyRole(`${job.title} ${job.description}`);
        const { r, c } = pickTemplates(cat);
        const resumeBase = await read(r); const coverBase = await read(c);
        const system = `Tailor truthfully for candidate: MERN, Hono/Bun, React Native, AWS (Lambda, SQS, SES, S3, Secrets, Cognito roles), Azure (App + Graph). Prefers Houston hybrid/onsite, salary 90–120k.`;
        const tr = await chat("gpt-4o-mini", system, `JD:\n${job.description}\n\nResume base:\n${resumeBase}`);
        const tc = await chat("gpt-4o-mini", system, `JD:\n${job.description}\n\nCover base:\n${coverBase}`);
        const ts = Date.now();
        putText(`generated/${job.id}/resume-${ts}.md`, tr);
        putText(`generated/${job.id}/cover-${ts}.md`, tc);
        generated++;
    }
    return { generated };
};