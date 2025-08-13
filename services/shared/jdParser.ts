export function extractSalary(jd: string): { min?: number; max?: number } {
    const m = jd.match(/\$?(\d{2,3})k\s*-\s*\$?(\d{2,3})k/i);
    if (m) return { min: Number(m[1]) * 1000, max: Number(m[2]) * 1000 };
    const m2 = jd.match(/\$(\d{5,6})\s*-\s*\$(\d{5,6})/);
    if (m2) return { min: Number(m2[1]), max: Number(m2[2]) };
    return {};
}