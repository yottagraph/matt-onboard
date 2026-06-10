/**
 * SAM.gov onboarding probe.
 *
 * Scans the Lovelace Query Server schema for entity flavors and properties
 * that look like they came from (or are about to come from) the SAM.gov
 * data source — `uei`, `cage`, `duns`, `naics`, `sam`, `contractor`,
 * `award`, plus a few well-known identifier shapes. The page uses the
 * result to render an "onboarding status" view: did the SAM.gov fetcher
 * register anything yet? What flavors / properties did it light up?
 *
 * The endpoint never throws to the client — if the QS isn't reachable,
 * the response carries `schemaReachable: false` and the UI degrades
 * gracefully instead of 500ing.
 */
import { isQsConfigured, qsFetch } from '~/server/utils/elementalQs';

interface RawProp {
    pid?: number | string;
    name?: string;
    type?: string;
    description?: string;
    domain_flavors?: string[];
    domainFlavors?: string[];
    target_flavors?: string[];
    targetFlavors?: string[];
}

interface RawFlavor {
    fid?: number | string;
    name?: string;
    description?: string;
}

export interface SamScanHit {
    name: string;
    description: string;
    matchedKeywords: string[];
    extra?: Record<string, unknown>;
}

export interface SamScanResponse {
    checkedAt: string;
    schemaReachable: boolean;
    error: string | null;
    keywords: string[];
    totals: {
        flavors: number;
        properties: number;
        samFlavors: number;
        samProperties: number;
    };
    samFlavors: SamScanHit[];
    samProperties: (SamScanHit & {
        type: string;
        domainFlavors: string[];
        targetFlavors: string[];
    })[];
}

// Keywords likely to surface SAM.gov-sourced concepts. Kept conservative so
// we don't flag generic words (e.g. plain "registration"); we anchor on
// strong identifier names that SAM.gov uniquely uses.
const KEYWORDS = [
    'sam.gov',
    'sam_gov',
    'samgov',
    ' sam ',
    'uei',
    'cage',
    'duns',
    'naics',
    'psc',
    'contractor',
    'gov contract',
    'government contract',
    'federal contract',
    'fed contract',
    'sba',
    'award',
    'opportunity',
    'wosb',
    'sdvosb',
    'hubzone',
    'small business',
    'business size',
    'small disadvantaged',
];

function matchKeywords(text: string): string[] {
    if (!text) return [];
    const t = ` ${text.toLowerCase()} `;
    return KEYWORDS.filter((k) => t.includes(k.trim().toLowerCase()));
}

export default defineEventHandler(async (): Promise<SamScanResponse> => {
    const now = new Date().toISOString();
    const empty: SamScanResponse = {
        checkedAt: now,
        schemaReachable: false,
        error: null,
        keywords: KEYWORDS,
        totals: { flavors: 0, properties: 0, samFlavors: 0, samProperties: 0 },
        samFlavors: [],
        samProperties: [],
    };

    if (!isQsConfigured()) {
        empty.error = 'Query Server not configured';
        return empty;
    }

    let schema: any;
    try {
        schema = await qsFetch('elemental/metadata/schema');
    } catch (e: any) {
        empty.error = e?.message ? String(e.message).slice(0, 200) : 'schema fetch failed';
        return empty;
    }

    const flavors: RawFlavor[] = schema?.schema?.flavors ?? schema?.flavors ?? [];
    const properties: RawProp[] = schema?.schema?.properties ?? schema?.properties ?? [];

    const samFlavors: SamScanHit[] = [];
    for (const f of flavors) {
        const name = String(f?.name ?? '');
        const desc = String(f?.description ?? '');
        const matched = [...matchKeywords(name), ...matchKeywords(desc)];
        if (matched.length === 0) continue;
        samFlavors.push({
            name,
            description: desc,
            matchedKeywords: Array.from(new Set(matched)),
        });
    }

    const samProperties: SamScanResponse['samProperties'] = [];
    for (const p of properties) {
        const name = String(p?.name ?? '');
        const desc = String(p?.description ?? '');
        const matched = [...matchKeywords(name), ...matchKeywords(desc)];
        if (matched.length === 0) continue;
        samProperties.push({
            name,
            description: desc,
            matchedKeywords: Array.from(new Set(matched)),
            type: String(p?.type ?? ''),
            domainFlavors: (p?.domain_flavors ?? p?.domainFlavors ?? []) as string[],
            targetFlavors: (p?.target_flavors ?? p?.targetFlavors ?? []) as string[],
        });
    }

    samFlavors.sort((a, b) => a.name.localeCompare(b.name));
    samProperties.sort((a, b) => a.name.localeCompare(b.name));

    return {
        checkedAt: now,
        schemaReachable: true,
        error: null,
        keywords: KEYWORDS,
        totals: {
            flavors: flavors.length,
            properties: properties.length,
            samFlavors: samFlavors.length,
            samProperties: samProperties.length,
        },
        samFlavors,
        samProperties,
    };
});
