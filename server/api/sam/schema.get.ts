/**
 * Full schema digest for the schema-browser page.
 *
 * Returns flavors and properties as already-stringified ids (PIDs / FIDs
 * are 64-bit and would round in a JSON.parse round-trip if we let
 * `$fetch` parse them — `qsFetch` uses the 64-bit-safe `qsParse`).
 *
 * The shape here is intentionally narrow: just the fields the browser
 * page renders. We don't echo the full upstream schema payload because
 * (a) it's large, and (b) it leaks fields the UI doesn't use.
 */
import { isQsConfigured, qsFetch } from '~/server/utils/elementalQs';

export interface SchemaFlavor {
    fid: string;
    name: string;
    description: string;
}

export interface SchemaProperty {
    pid: string;
    name: string;
    type: string;
    description: string;
    domainFlavors: string[];
    targetFlavors: string[];
}

export interface SchemaDigest {
    schemaReachable: boolean;
    error: string | null;
    flavors: SchemaFlavor[];
    properties: SchemaProperty[];
}

export default defineEventHandler(async (): Promise<SchemaDigest> => {
    if (!isQsConfigured()) {
        return {
            schemaReachable: false,
            error: 'Query Server not configured',
            flavors: [],
            properties: [],
        };
    }
    try {
        const res: any = await qsFetch('elemental/metadata/schema');
        const rawF = res?.schema?.flavors ?? res?.flavors ?? [];
        const rawP = res?.schema?.properties ?? res?.properties ?? [];
        const flavors: SchemaFlavor[] = rawF.map((f: any) => ({
            fid: String(f?.fid ?? f?.findex ?? ''),
            name: String(f?.name ?? ''),
            description: String(f?.description ?? ''),
        }));
        const properties: SchemaProperty[] = rawP.map((p: any) => ({
            pid: String(p?.pid ?? p?.pindex ?? ''),
            name: String(p?.name ?? ''),
            type: String(p?.type ?? ''),
            description: String(p?.description ?? ''),
            domainFlavors: (p?.domain_flavors ?? p?.domainFlavors ?? []) as string[],
            targetFlavors: (p?.target_flavors ?? p?.targetFlavors ?? []) as string[],
        }));
        return { schemaReachable: true, error: null, flavors, properties };
    } catch (e: any) {
        return {
            schemaReachable: false,
            error: e?.message ? String(e.message).slice(0, 200) : 'schema fetch failed',
            flavors: [],
            properties: [],
        };
    }
});
