/**
 * Search for organizations (and other flavors) by name via the QS
 * `/entities/search` endpoint.
 *
 * The single most useful onboarding check is: "did SAM.gov register an
 * organization for this entity I know SAM has?" — so we keep the search
 * permissive (all flavors) and report `flavor` + `score` on each match
 * so the UI can flag organizations vs. other types.
 */
import { isQsConfigured, qsFetch } from '~/server/utils/elementalQs';

export interface OrgSearchMatch {
    neid: string;
    name: string;
    flavor: string;
    score: number | null;
}

export interface OrgSearchResponse {
    query: string;
    schemaReachable: boolean;
    error: string | null;
    matches: OrgSearchMatch[];
}

export default defineEventHandler(async (event): Promise<OrgSearchResponse> => {
    const body = await readBody<{ query?: string; maxResults?: number; flavors?: string[] }>(event);
    const query = String(body?.query ?? '').trim();
    if (!query) {
        return { query, schemaReachable: false, error: 'query required', matches: [] };
    }
    if (!isQsConfigured()) {
        return {
            query,
            schemaReachable: false,
            error: 'Query Server not configured',
            matches: [],
        };
    }

    const q: Record<string, unknown> = { queryId: 1, query };
    if (body?.flavors?.length) q.flavors = body.flavors;

    try {
        const res: any = await qsFetch('entities/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                queries: [q],
                maxResults: body?.maxResults ?? 20,
                includeNames: true,
                includeFlavors: true,
            }),
        });
        const matches: OrgSearchMatch[] = (res?.results?.[0]?.matches ?? []).map((m: any) => ({
            neid: String(m?.neid ?? ''),
            name: String(m?.name ?? m?.neid ?? ''),
            flavor: String(m?.flavor ?? ''),
            score: typeof m?.score === 'number' ? m.score : null,
        }));
        return { query, schemaReachable: true, error: null, matches };
    } catch (e: any) {
        return {
            query,
            schemaReachable: false,
            error: e?.message ? String(e.message).slice(0, 200) : 'search failed',
            matches: [],
        };
    }
});
