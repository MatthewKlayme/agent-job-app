import type { RoleCategory } from "./types";

const rules: Array<{ cat: RoleCategory; re: RegExp }> = [
    { cat: "mobile", re: /(react\s*native|mobile (engineer|developer)|ios|android)/i },
    { cat: "cloud", re: /(serverless|lambda|sqs|ses|s3|azure|graph api|cloud developer)/i },
    { cat: "solutions", re: /(solutions|implementation|professional services|onboarding|integration engineer)/i },
    { cat: "automation", re: /(automation|workflow|scripting|powershell|entra|azure ad|identity)/i },
    { cat: "fullstack", re: /(full[- ]?stack|react|node|mern|hono|bun)/i }
];

export function classifyRole(text: string): RoleCategory {
    const t = text.toLowerCase();
    for (const r of rules) if (r.re.test(t)) return r.cat;
    return "fullstack";
}