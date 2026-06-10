<template>
    <div class="schema-page">
        <div class="schema-content">
            <div class="page-header">
                <h1 class="page-title">Schema Browser</h1>
                <p class="page-subtitle">
                    All entity flavors and properties exposed by the Lovelace Query Server for this
                    tenant.
                </p>
            </div>

            <v-row dense class="mb-4">
                <v-col cols="12" md="6">
                    <v-text-field
                        v-model="query"
                        prepend-inner-icon="mdi-magnify"
                        label="Filter by name or description"
                        variant="outlined"
                        density="comfortable"
                        clearable
                        hide-details
                    />
                </v-col>
                <v-col cols="12" md="3">
                    <v-select
                        v-model="typeFilter"
                        :items="typeFilterOptions"
                        label="Property type"
                        variant="outlined"
                        density="comfortable"
                        clearable
                        hide-details
                    />
                </v-col>
                <v-col cols="12" md="3" class="d-flex align-center">
                    <v-switch
                        v-model="samOnly"
                        color="success"
                        density="compact"
                        hide-details
                        inset
                        label="SAM keywords only"
                    />
                </v-col>
            </v-row>

            <div v-if="pending" class="d-flex justify-center pa-8">
                <v-progress-circular indeterminate />
            </div>

            <v-alert v-else-if="data && !data.schemaReachable" type="error" variant="tonal">
                Schema not reachable: {{ data.error || 'unknown error' }}
            </v-alert>

            <template v-else-if="data">
                <v-tabs v-model="tab" color="primary" class="mb-2">
                    <v-tab value="flavors">
                        Flavors
                        <v-chip size="x-small" variant="text" class="ml-2">
                            {{ filteredFlavors.length }}
                        </v-chip>
                    </v-tab>
                    <v-tab value="properties">
                        Properties
                        <v-chip size="x-small" variant="text" class="ml-2">
                            {{ filteredProperties.length }}
                        </v-chip>
                    </v-tab>
                </v-tabs>

                <v-window v-model="tab">
                    <v-window-item value="flavors">
                        <v-empty-state
                            v-if="!filteredFlavors.length"
                            headline="No flavors match"
                            icon="mdi-database-off"
                        />
                        <v-list v-else density="compact" class="flavor-list">
                            <v-list-item
                                v-for="f in filteredFlavors"
                                :key="f.fid"
                                class="flavor-item"
                            >
                                <template #prepend>
                                    <v-icon
                                        size="small"
                                        :color="
                                            isSam(f.name, f.description) ? 'success' : undefined
                                        "
                                    >
                                        mdi-shape
                                    </v-icon>
                                </template>
                                <v-list-item-title>
                                    <span class="flavor-name">{{ f.name }}</span>
                                    <v-chip
                                        v-if="isSam(f.name, f.description)"
                                        size="x-small"
                                        variant="tonal"
                                        color="success"
                                        class="ml-2"
                                    >
                                        SAM
                                    </v-chip>
                                </v-list-item-title>
                                <v-list-item-subtitle v-if="f.description">
                                    {{ f.description }}
                                </v-list-item-subtitle>
                                <template #append>
                                    <span class="text-disabled text-caption mono">
                                        fid {{ shortId(f.fid) }}
                                    </span>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-window-item>

                    <v-window-item value="properties">
                        <v-empty-state
                            v-if="!filteredProperties.length"
                            headline="No properties match"
                            icon="mdi-database-off"
                        />
                        <v-list v-else density="compact" class="prop-list">
                            <v-list-item
                                v-for="p in filteredProperties"
                                :key="p.pid"
                                class="prop-item"
                            >
                                <template #prepend>
                                    <v-icon
                                        size="small"
                                        :color="
                                            isSam(p.name, p.description) ? 'success' : undefined
                                        "
                                    >
                                        {{ propIcon(p.type) }}
                                    </v-icon>
                                </template>
                                <v-list-item-title>
                                    <span class="prop-name">{{ p.name }}</span>
                                    <v-chip size="x-small" variant="text" class="ml-2">
                                        {{ p.type || '—' }}
                                    </v-chip>
                                    <v-chip
                                        v-if="isSam(p.name, p.description)"
                                        size="x-small"
                                        variant="tonal"
                                        color="success"
                                        class="ml-1"
                                    >
                                        SAM
                                    </v-chip>
                                </v-list-item-title>
                                <v-list-item-subtitle>
                                    <span v-if="p.description">{{ p.description }}</span>
                                    <span v-else class="text-disabled">no description</span>
                                    <span
                                        v-if="p.domainFlavors.length"
                                        class="ml-2 text-medium-emphasis"
                                    >
                                        on: {{ p.domainFlavors.join(', ') }}
                                    </span>
                                    <span
                                        v-if="p.targetFlavors.length"
                                        class="ml-2 text-medium-emphasis"
                                    >
                                        → {{ p.targetFlavors.join(', ') }}
                                    </span>
                                </v-list-item-subtitle>
                                <template #append>
                                    <span class="text-disabled text-caption mono">
                                        pid {{ shortId(p.pid) }}
                                    </span>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-window-item>
                </v-window>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { SchemaDigest, SchemaFlavor, SchemaProperty } from '~/server/api/sam/schema.get';

    const route = useRoute();

    const query = ref<string>(typeof route.query.q === 'string' ? route.query.q : '');
    const typeFilter = ref<string | null>(null);
    const samOnly = ref(false);
    const tab = ref<'flavors' | 'properties'>('flavors');

    const { data, pending } = await useFetch<SchemaDigest>('/api/sam/schema', {
        server: false,
        lazy: true,
    });

    const SAM_KEYWORDS = [
        'sam.gov',
        'uei',
        'cage',
        'duns',
        'naics',
        'psc',
        'contractor',
        'gov contract',
        'government contract',
        'federal contract',
        'sba',
        'award',
        'wosb',
        'sdvosb',
        'hubzone',
        'small business',
    ];

    function isSam(...parts: (string | undefined | null)[]): boolean {
        const t = parts.filter(Boolean).join(' ').toLowerCase();
        return SAM_KEYWORDS.some((k) => t.includes(k));
    }

    const typeFilterOptions = computed(() => {
        const types = new Set<string>();
        for (const p of data.value?.properties ?? []) {
            if (p.type) types.add(p.type);
        }
        return Array.from(types).sort();
    });

    const matchesQuery = (text: string) => {
        if (!query.value) return true;
        return text.toLowerCase().includes(query.value.toLowerCase());
    };

    const filteredFlavors = computed<SchemaFlavor[]>(() => {
        const all = data.value?.flavors ?? [];
        return all.filter((f) => {
            if (samOnly.value && !isSam(f.name, f.description)) return false;
            return matchesQuery(`${f.name} ${f.description}`);
        });
    });

    const filteredProperties = computed<SchemaProperty[]>(() => {
        const all = data.value?.properties ?? [];
        return all.filter((p) => {
            if (samOnly.value && !isSam(p.name, p.description)) return false;
            if (typeFilter.value && p.type !== typeFilter.value) return false;
            return matchesQuery(`${p.name} ${p.description} ${p.domainFlavors.join(' ')}`);
        });
    });

    function propIcon(type: string): string {
        if (type === 'data_nindex') return 'mdi-link-variant';
        if (type === 'data_int' || type === 'data_float') return 'mdi-numeric';
        if (type === 'data_bool') return 'mdi-toggle-switch';
        if (type === 'data_str') return 'mdi-text';
        if (type === 'data_date' || type === 'data_datetime') return 'mdi-calendar';
        return 'mdi-tag-outline';
    }

    function shortId(id: string): string {
        if (!id) return '—';
        if (id.length <= 8) return id;
        return `${id.slice(0, 4)}…${id.slice(-4)}`;
    }
</script>

<style scoped>
    .schema-page {
        height: 100%;
        overflow-y: auto;
        display: flex;
        justify-content: center;
        padding: 32px 24px 64px;
    }

    .schema-content {
        max-width: 1100px;
        width: 100%;
    }

    .page-header {
        margin-bottom: 24px;
    }

    .page-title {
        font-family: var(--font-headline);
        font-weight: 400;
        font-size: 1.7rem;
        letter-spacing: 0.02em;
        margin-bottom: 4px;
    }

    .page-subtitle {
        color: var(--lv-silver);
    }

    .mono {
        font-family: var(--font-mono);
    }

    .flavor-name,
    .prop-name {
        font-family: var(--font-mono);
        font-size: 0.95rem;
    }

    .flavor-item,
    .prop-item {
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
</style>
