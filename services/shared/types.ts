export type Job = {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
    source: "greenhouse" | "lever" | "other";
    remote: boolean; hybrid: boolean; onsite: boolean;
    salaryMin?: number; salaryMax?: number;
};

export type Settings = {
    location: { priority: string[]; allow: string[]; hybrid_or_onsite_only: boolean };
    salary: { min: number; max: number };
    keywords_must: string[];
    keywords_nice: string[];
    exclude: string[];
};

export type RoleCategory = "fullstack" | "mobile" | "cloud" | "solutions" | "automation";