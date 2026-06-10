<template>
    <div class="search-page">
        <div class="search-content">
            <div class="page-header">
                <h1 class="page-title">Entity Search</h1>
                <p class="page-subtitle">
                    Resolve a company or other entity by name. SAM.gov contractors register as
                    organizations — search by legal name or DBA to see if the platform knows them
                    yet.
                </p>
            </div>

            <v-card variant="flat" border class="mb-4">
                <v-card-text>
                    <v-form @submit.prevent="runSearch">
                        <div class="d-flex ga-3 align-start">
                            <v-text-field
                                v-model="queryInput"
                                label="Entity name"
                                placeholder="e.g. Lockheed Martin, Booz Allen Hamilton, NASA"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                autofocus
                                clearable
                                class="flex-grow-1"
                                @keydown.enter.prevent="runSearch"
                            />
                            <v-btn
                                type="submit"
                                color="primary"
                                size="large"
                                :loading="pending"
                                prepend-icon="mdi-magnify"
                            >
                                Search
                            </v-btn>
                        </div>
                        <div class="mt-3 d-flex ga-2 flex-wrap align-center">
                            <span class="text-medium-emphasis text-caption mr-1">Try:</span>
                            <v-chip
                                v-for="example in examples"
                                :key="example"
                                size="small"
                                variant="tonal"
                                @click="
                                    queryInput = example;
                                    runSearch();
                                "
                            >
                                {{ example }}
                            </v-chip>
                        </div>
                    </v-form>
                </v-card-text>
            </v-card>

            <v-alert
                v-if="data?.error && !pending"
                type="error"
                variant="tonal"
                class="mb-4"
                closable
            >
                {{ data.error }}
            </v-alert>

            <div v-if="pending" class="d-flex justify-center pa-8">
                <v-progress-circular indeterminate />
            </div>

            <template v-else-if="data && hasSearched">
                <div v-if="!data.matches.length" class="text-center pa-8">
                    <v-icon size="48" color="medium-emphasis">mdi-database-search</v-icon>
                    <div class="text-h6 mt-3">No matches</div>
                    <div class="text-medium-emphasis mt-1">
                        The Query Server found no entities for
                        <span class="mono">{{ data.query }}</span>
                    </div>
                </div>

                <div v-else>
                    <div class="results-header d-flex justify-space-between align-center mb-2">
                        <div class="text-medium-emphasis">
                            {{ data.matches.length }} match{{
                                data.matches.length === 1 ? '' : 'es'
                            }}
                            for <span class="mono">{{ data.query }}</span>
                        </div>
                    </div>
                    <v-list variant="flat" class="results-list">
                        <v-list-item
                            v-for="(m, idx) in data.matches"
                            :key="`${m.neid}-${idx}`"
                            :to="`/entity/${m.neid}?flavor=${encodeURIComponent(m.flavor || 'organization')}`"
                            class="result-item"
                        >
                            <template #prepend>
                                <v-avatar size="36" :color="flavorColor(m.flavor)">
                                    <v-icon size="small">{{ flavorIcon(m.flavor) }}</v-icon>
                                </v-avatar>
                            </template>
                            <v-list-item-title class="result-name">
                                {{ m.name }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                <span class="mono text-caption">{{ m.neid }}</span>
                                <v-chip v-if="m.flavor" size="x-small" variant="tonal" class="ml-2">
                                    {{ m.flavor }}
                                </v-chip>
                            </v-list-item-subtitle>
                            <template #append>
                                <div class="d-flex align-center ga-2">
                                    <v-chip
                                        v-if="m.score !== null"
                                        size="small"
                                        variant="text"
                                        class="mono"
                                    >
                                        {{ (m.score * 100).toFixed(0) }}%
                                    </v-chip>
                                    <v-icon size="small">mdi-chevron-right</v-icon>
                                </div>
                            </template>
                        </v-list-item>
                    </v-list>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { OrgSearchResponse } from '~/server/api/sam/search-orgs.post';

    const queryInput = ref('');
    const hasSearched = ref(false);
    const data = ref<OrgSearchResponse | null>(null);
    const pending = ref(false);

    const examples = ['Lockheed Martin', 'Booz Allen Hamilton', 'NASA', 'General Dynamics', 'SAIC'];

    async function runSearch() {
        const q = (queryInput.value || '').trim();
        if (!q) return;
        pending.value = true;
        hasSearched.value = true;
        try {
            data.value = await $fetch<OrgSearchResponse>('/api/sam/search-orgs', {
                method: 'POST',
                body: { query: q, maxResults: 20 },
            });
        } catch (e: any) {
            data.value = {
                query: q,
                schemaReachable: false,
                error: e?.message ?? 'request failed',
                matches: [],
            };
        } finally {
            pending.value = false;
        }
    }

    function flavorIcon(flavor: string): string {
        switch (flavor) {
            case 'organization':
                return 'mdi-domain';
            case 'person':
                return 'mdi-account';
            case 'location':
                return 'mdi-map-marker';
            case 'financial_instrument':
                return 'mdi-chart-line';
            case 'industry':
                return 'mdi-factory';
            case 'product':
                return 'mdi-package-variant';
            case 'event':
                return 'mdi-calendar-clock';
            default:
                return 'mdi-shape-outline';
        }
    }

    function flavorColor(flavor: string): string {
        switch (flavor) {
            case 'organization':
                return 'primary';
            case 'person':
                return 'info';
            case 'financial_instrument':
                return 'success';
            default:
                return 'surface-variant';
        }
    }
</script>

<style scoped>
    .search-page {
        height: 100%;
        overflow-y: auto;
        display: flex;
        justify-content: center;
        padding: 32px 24px 64px;
    }

    .search-content {
        max-width: 880px;
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
        max-width: 640px;
    }

    .mono {
        font-family: var(--font-mono);
    }

    .results-list {
        background: transparent;
    }

    .result-item {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .result-name {
        font-family: var(--font-headline);
        font-size: 1rem;
    }
</style>
