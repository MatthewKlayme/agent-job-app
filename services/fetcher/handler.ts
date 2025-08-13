import type { Job } from "../shared/types"; // optional if you have the type
import companies from "../../config/companies.json" assert { type: "json" };
import { putText } from "../shared/fsStore";

async function fetchJSON(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.warn(`[fetcher] ${url} -> ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
            return null;
        }
        return await res.json();
    } catch (e: any) {
        console.warn(`[fetcher] ${url} -> ${e?.message || e}`);
        return null;
    }
}

export const handler = async () => {
    const jobs: Job[] = [];

    for (const c of companies as any[]) {
        // --- Greenhouse ---
        if (c.greenhouseBoard) {
            const url = `https://boards-api.greenhouse.io/v1/boards/${c.greenhouseBoard}/jobs`;
            const json: any = await fetchJSON(url);
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
                    description: (j.content || "").toString().slice(0, 5000),
                    source: "greenhouse",
                    remote: /remote/i.test(loc) || /remote/i.test(j.title),
                    hybrid: /hybrid/i.test(loc) || /hybrid/i.test(j.title),
                    onsite: /on[- ]?site/i.test(loc) || /on[- ]?site/i.test(j.title)
                });
            }
        }

        // --- Lever ---
        if (c.leverBoard) {
            const url = `https://api.lever.co/v0/postings/${c.leverBoard}?mode=json`;
            const json: any = await fetchJSON(url);
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
                    description: (j.descriptionPlain || "").slice(0, 5000),
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
