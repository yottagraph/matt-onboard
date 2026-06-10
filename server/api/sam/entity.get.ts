/**
 * Fetch all property values for an entity, with a focus on SAM.gov
 * identifiers if present.
 *
 * Workflow:
 *   1. Resolve the entity's display name (`GET /entities/{neid}/name`).
 *   2. Use the cached schema to enumerate every property whose
 *      `domain_flavors` includes the entity's flavor — those are the
 *      properties the platform knows can be set on this entity type.
 *      We also include any explicitly-requested extra property names.
 *   3. Fetch values via `getPropertiesByName()` (which dedups rows and
 *      resolves `data_nindex` references to display names for us).
 *   4. Bucket the populated properties into "SAM identifiers", "Core",
 *      and "Other" so the UI can show the SAM ones front-and-center.
 *
 * The caller passes the flavor (e.g. `organization`) — we don't try to
 * infer it from the NEID itself, because (a) the QS doesn't expose a
 * cheap "what flavor is this entity?" call, and (b) the search endpoint
 * already returned `flavor` so the UI knows it.
 */
import { getPropertiesByName, isQsConfigured, qsFetch } from '~/server/utils/elementalQs';

// Properties that SAM.gov typically populates on a registered entity.
// These are conservative guesses — the schema scan endpoint actually
// reports what's present; this list just shapes the detail view's
// "SAM identifiers" section so it surfaces meaningful fields first.
const SAM_IDENTIFIER_PROPS = [
    'uei',
    'cage_code',
    'cage',
    'duns',
    'duns_number',
    'naics',
    'naics_code',
    'psc',
    'sam_registration_status',
    'sam_status',
    'registration_status',
    'registration_expiration_date',
    'sam_expiration',
    'business_types',
    'small_business',
    'wosb',
    'sdvosb',
    'hubzone',
];

const CORE_ORG_PROPS = [
    'name',
    'country',
    'state_of_incorporation',
    'industry',
    'ticker_symbol',
    'lei_code',
    'fed_rssd_id',
    'crd_number',
    'cik',
];

export interface EntityDetailResponse {
    neid: string;
    flavor: string;
    name: string;
    schemaReachable: boolean;
    error: string | null;
    /** All property names known for this flavor, used for follow-up exploration. */
    knownProps: { name: string; type: string }[];
    /** Populated values, grouped by category. */
    groups: {
        sam: { name: string; value: string | null }[];
        core: { name: string; value: string | null }[];
        other: { name: string; value: string | null }[];
    };
    /** Names we asked for but the schema doesn't have — useful for diagnosing
     *  "is property X present yet?" checks. */
    missingFromSchema: string[];
}

export default defineEventHandler(async (event): Promise<EntityDetailResponse> => {
    const q = getQuery(event);
    const neid = String(q?.neid ?? '').padStart(20, '0');
    const flavor = String(q?.flavor ?? 'organization');

    const empty: EntityDetailResponse = {
        neid,
        flavor,
        name: neid,
        schemaReachable: false,
        error: null,
        knownProps: [],
        groups: { sam: [], core: [], other: [] },
        missingFromSchema: [],
    };

    if (!neid || neid === '0'.padStart(20, '0')) {
        empty.error = 'neid required';
        return empty;
    }
    if (!isQsConfigured()) {
        empty.error = 'Query Server not configured';
        return empty;
    }

    empty.schemaReachable = true;

    // Properties whose domain includes this flavor are the ones the platform
    // permits setting on this entity type. `getQsSchema` strips the domain
    // info to keep its maps small, so we fetch the raw schema directly via
    // `qsFetch` (which is 64-bit-safe).
    let knownNames: string[] = [];
    let knownProps: { name: string; type: string }[] = [];
    try {
        const raw: any = await qsFetch('elemental/metadata/schema');
        const props: any[] = raw?.schema?.properties ?? raw?.properties ?? [];
        for (const p of props) {
            const name = String(p?.name ?? '');
            if (!name) continue;
            const domains: string[] = (p?.domain_flavors ?? p?.domainFlavors ?? []) as string[];
            // Empty `domain_flavors` means "applies to anything" — include it.
            if (domains.length === 0 || domains.includes(flavor)) {
                knownNames.push(name);
                knownProps.push({ name, type: String(p?.type ?? '') });
            }
        }
        knownNames = Array.from(new Set(knownNames)).sort();
        knownProps.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e: any) {
        empty.error = `schema enumeration failed: ${e?.message ?? e}`.slice(0, 200);
        return empty;
    }

    // Always ask for the SAM identifiers even if the schema doesn't think
    // this flavor has them — that way the UI can report "not yet
    // registered" honestly. `getPropertiesByName` will tell us which names
    // weren't in the schema.
    const askNames = Array.from(new Set([...knownNames, ...SAM_IDENTIFIER_PROPS]));

    // Resolve display name in parallel with property fetch.
    const [nameRes, propRes] = await Promise.all([
        (async () => {
            try {
                const r: any = await qsFetch(`entities/${neid}/name`);
                return r?.name ? String(r.name) : neid;
            } catch {
                return neid;
            }
        })(),
        getPropertiesByName(neid, askNames).catch(
            (e) =>
                ({
                    values: {},
                    raw: {},
                    unknownProps: [],
                    _err: String(e?.message ?? e).slice(0, 200),
                }) as any
        ),
    ]);

    if ((propRes as any)?._err) {
        empty.name = nameRes;
        empty.knownProps = knownProps;
        empty.error = (propRes as any)._err;
        return empty;
    }

    const samSet = new Set(SAM_IDENTIFIER_PROPS);
    const coreSet = new Set(CORE_ORG_PROPS);

    const sam: EntityDetailResponse['groups']['sam'] = [];
    const core: EntityDetailResponse['groups']['core'] = [];
    const other: EntityDetailResponse['groups']['other'] = [];

    for (const [name, value] of Object.entries(propRes.values)) {
        if (value === null || value === undefined) continue;
        if (samSet.has(name)) sam.push({ name, value });
        else if (coreSet.has(name)) core.push({ name, value });
        else other.push({ name, value });
    }

    sam.sort((a, b) => a.name.localeCompare(b.name));
    core.sort((a, b) => a.name.localeCompare(b.name));
    other.sort((a, b) => a.name.localeCompare(b.name));

    return {
        neid,
        flavor,
        name: nameRes,
        schemaReachable: true,
        error: null,
        knownProps,
        groups: { sam, core, other },
        missingFromSchema: propRes.unknownProps ?? [],
    };
});
