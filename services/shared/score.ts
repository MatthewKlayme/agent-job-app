import type { Job, Settings } from "./types";
import { classifyRole } from "./roleClassifier";

export function scoreJob(job: Job, settings: Settings): { score: number; reasons: string[]; cat: string } {
    const reasons: string[] = [];
    let score = 0;
    const text = `${job.title} ${job.location} ${job.description}`.toLowerCase();

    // Exclusions
    if (settings.exclude.some(ex => text.includes(ex.toLowerCase()))) return { score: 0, reasons: ["Excluded keyword"], cat: "x" };

    // Location constraints
    const isHouston = settings.location.priority.some(p => job.location.toLowerCase().includes(p.toLowerCase()));
    const hybridOnsite = job.hybrid || job.onsite || /hybrid|onsite/i.test(text);
    if (settings.location.hybrid_or_onsite_only && !hybridOnsite) return { score: 0, reasons: ["Not hybrid/onsite"], cat: "x" };
    if (isHouston) { score += 30; reasons.push("Houston priority"); }

    // Salary window (if present)
    if (job.salaryMin || job.salaryMax) {
        const minOk = !job.salaryMax || job.salaryMax >= settings.salary.min;
        const maxOk = !job.salaryMin || job.salaryMin <= settings.salary.max;
        if (minOk && maxOk) { score += 15; reasons.push("Salary in range"); }
    }

    // Must keywords
    const mustHits = settings.keywords_must.filter(k => text.includes(k.toLowerCase()));
    if (mustHits.length < 3) return { score: 0, reasons: ["Too few must-haves"], cat: "x" };
    score += mustHits.length * 5; reasons.push(`Musts: ${mustHits.join(", ")}`);

    // Nice keywords
    const niceHits = settings.keywords_nice.filter(k => text.includes(k.toLowerCase()));
    score += niceHits.length * 2; if (niceHits.length) reasons.push(`Nice: ${niceHits.join(", ")}`);

    // Remote penalty if outside Houston
    if (!isHouston && job.remote) score -= 5;

    // Role category bonus
    const cat = classifyRole(text);
    const catBonus = { fullstack: 10, mobile: 14, cloud: 16, solutions: 18, automation: 12 }[cat];
    score += catBonus; reasons.push(`Role category: ${cat} (+${catBonus})`);

    return { score: Math.max(0, score), reasons, cat };
}