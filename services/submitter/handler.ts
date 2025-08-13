import { notify } from "../shared/smtpMailer";
import { list } from "../shared/fsStore";

export const handler = async () => {
    const gens = list("generated").sort().slice(-10);
    if (!gens.length) return { notified: 0 };
    let n = 0;
    for (const key of gens) {
        const parts = key.split("/"); const jobId = parts[1];
        // In v1 we just notify you to review & click; you can add Playwright autofill later.
        await notify(`Generated application materials for Job ${jobId}`, `Artifacts under artifacts/generated/${jobId}`);
        n++;
    }
    return { notified: n };
};