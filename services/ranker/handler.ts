import { list, getText, putText } from "../shared/fsStore";
import { scoreJob } from "../shared/score";
import type { Job, Settings } from "../shared/types";
import settings from "../../config/settings.json" assert { type: "json" };

export const handler = async () => {
    const latest = list("discovered").sort().slice(-1)[0];
    if (!latest) return { count: 0 };
    const jobs: Job[] = JSON.parse(getText(latest));

    const ranked = jobs
        .map(j => ({ j, r: scoreJob(j, settings as Settings) }))
        .filter(x => x.r.score >= 40)
        .sort((a, b) => b.r.score - a.r.score)
        .map(x => ({ ...x.j, score: x.r.score, reasons: x.r.reasons, cat: x.r.cat }));

    const key = `ranked/${Date.now()}.json`;
    putText(key, JSON.stringify(ranked, null, 2));
    return { count: ranked.length, key };
};