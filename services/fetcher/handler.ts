import type { Job } from "../shared/types";
import { putText } from "../shared/fsStore";
import companies from "../../config/companies.json" assert { type: "json" };

export const handler = async () => {
    const jobs: Job[] = [];

    for (const c of companies as any[]) {
        if (c.greenhouseBoard) {
            const url = `https://boards-api.greenhouse.io/v1/boards/${c.greenhouseBoard}/jobs`;
            const res = await fetch(url); const json: any = await res.json();
            for (const j of json.jobs || []) {
                const loc = j.location?.name || ""; const desc = (j.content || j.metadata || "").toString();
                jobs.push({
                    id: String(j.id), title: j.title, company: c.name, location: loc, url: j.absolute_url,
                    description: (j.content || "").toString().slice(0, 5000), source: "greenhouse",
                    remote: /remote/i.test(loc) || /remote/i.test(j.title),
                    hybrid: /hybrid/i.test(loc) || /hybrid/i.test(j.title),
                    onsite: /on[- ]?site/i.test(loc) || /on[- ]?site/i.test(j.title)
                });
            }
        }
        if (c.leverBoard) {
            const url = `https://api.lever.co/v0/postings/${c.leverBoard}?mode=json`;
            const res = await fetch(url); const list: any[] = await res.json();
            for (const j of list) {
                const loc = (j.categories?.location || "").toString();
                jobs.push({
                    id: j.id, title: j.text, company: c.name, location: loc, url: j.hostedUrl,
                    description: (j.descriptionPlain || "").slice(0, 5000), source: "lever",
                    remote: /remote/i.test(loc), hybrid: /hybrid/i.test(loc), onsite: /on[- ]?site/i.test(loc)
                });
            }
        }
    }

    const key = `discovered/${Date.now()}.json`;
    putText(key, JSON.stringify(jobs, null, 2));
    return { count: jobs.length, key };
};