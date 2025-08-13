import { notify } from "../shared/smtpMailer";
import { list, putText } from "../shared/fsStore";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const MODE = (process.env.APPLY_MODE || "email").toLowerCase(); // "email" | "none"
const ART = process.env.ARTIFACTS_DIR || "./artifacts";

function latestWith(prefix: string, files: string[]) {
    return files
        .filter(f => f.startsWith(prefix))
        .sort()
        .at(-1) || null;
}

export const handler = async () => {
    if (MODE !== "email") {
        console.log(`APPLY_MODE=${MODE}; submitter will not send emails`);
    }

    // list("generated") returns entries like "generated/<jobId>"
    const jobDirs = list("generated").sort().slice(-20); // last N job folders
    if (!jobDirs.length) return { notified: 0 };

    let n = 0;
    for (const key of jobDirs) {
        const parts = key.split("/");
        const jobId = parts[1];
        const dir = join(ART, "generated", jobId);

        // skip if already notified (marker file exists)
        const already = readdirSync(dir).some(f => f.startsWith("notified-"));
        if (already) continue;

        const files = readdirSync(dir).sort();
        const resume = latestWith("resume-", files);
        const cover = latestWith("cover-", files);
        const summary = latestWith("summary-", files);

        if (!resume && !cover) continue; // nothing to send yet

        const body = [
            `<b>Job ID:</b> ${jobId}`,
            resume ? `Resume: <code>${join("artifacts/generated", jobId, resume)}</code>` : "",
            cover ? `Cover: <code>${join("artifacts/generated", jobId, cover)}</code>` : "",
            summary ? `Summary: <code>${join("artifacts/generated", jobId, summary)}</code>` : "",
            `Open your dashboard: <code>http://&lt;pi-ip&gt;:5173/generated/${jobId}/resume</code> and <code>/cover</code>`
        ].filter(Boolean).join("<br/>");

        if (MODE === "email") {
            await notify(`Generated application materials for Job ${jobId}`, body);
        } else {
            console.log(`[DRY RUN] Would email for job ${jobId}\n${body}`);
        }

        // write a marker so we don't email again for this job
        const ts = Date.now();
        putText(`generated/${jobId}/notified-${ts}.txt`, `emailed=${MODE === "email"} at ${new Date(ts).toISOString()}`);
        n++;
    }

    return { notified: n };
};
