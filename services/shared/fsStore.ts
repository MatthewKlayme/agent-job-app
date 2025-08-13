import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
const ARTIFACTS = process.env.ARTIFACTS_DIR || "./artifacts";
export function putText(key: string, body: string) {
    const file = join(ARTIFACTS, key);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body, "utf8");
    return file;
}
export function getText(key: string) { return readFileSync(join(ARTIFACTS, key), "utf8"); }
export function list(prefix: string) {
    const dir = join(ARTIFACTS, prefix);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).map(f => join(prefix, f));
}