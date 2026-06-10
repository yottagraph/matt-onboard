<template>
    <div class="onboarding-page">
        <div class="onboarding-content">
            <div class="hero">
                <h1 class="hero-title">SAM.gov Onboarding Tester</h1>
                <p class="hero-subtitle">
                    Live probe of the Lovelace knowledge graph for entity types and properties
                    contributed by the SAM.gov fetcher.
                </p>
            </div>

            <v-card class="status-card mb-6" variant="flat" border>
                <v-card-text class="d-flex align-center flex-wrap ga-4">
                    <v-progress-circular v-if="pending" indeterminate size="28" width="3" />
                    <template v-else-if="scan && !scan.schemaReachable">
                        <v-icon color="error" size="32">mdi-alert-circle</v-icon>
                        <div>
                            <div class="status-headline text-error">Schema not reachable</div>
                            <div class="text-medium-emphasis text-body-2">
                                {{ scan.error || 'Query Server unreachable' }}
                            </div>
                        </div>
                    </template>
                    <template v-else-if="scan">
                        <v-icon :color="hasSamSignal ? 'success' : 'warning'" size="32">
                            {{ hasSamSignal ? 'mdi-check-circle' : 'mdi-clock-outline' }}
                        </v-icon>
                        <div class="flex-grow-1">
                            <div class="status-headline">
                                {{
                                    hasSamSignal
                                        ? 'SAM.gov signal detected in schema'
                                        : 'No SAM.gov-specific schema yet'
                                }}
                            </div>
                            <div class="text-medium-emphasis text-body-2">
                                Scanned {{ scan.totals.flavors }} entity types and
                                {{ scan.totals.properties }} properties for SAM keywords —
                                {{ scan.totals.samFlavors }} flavor{{
                                    scan.totals.samFlavors === 1 ? '' : 's'
                                }}
                                and {{ scan.totals.samProperties }} propert{{
                                    scan.totals.samProperties === 1 ? 'y' : 'ies'
                                }}
                                matched.
                            </div>
                        </div>
                        <v-btn
                            variant="tonal"
                            prepend-icon="mdi-refresh"
                            :loading="refreshing"
                            @click="refresh"
                        >
                            Rescan
                        </v-btn>
                    </template>
                </v-card-text>
            </v-card>

            <v-row v-if="scan?.schemaReachable" dense class="mb-6">
                <v-col cols="12" sm="6" md="3">
                    <v-card variant="flat" border class="stat-card">
                        <v-card-text>
                            <div class="stat-label">Entity types</div>
                            <div class="stat-value">{{ scan.totals.flavors }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card variant="flat" border class="stat-card">
                        <v-card-text>
                            <div class="stat-label">Properties</div>
                            <div class="stat-value">{{ scan.totals.properties }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card variant="flat" border class="stat-card">
                        <v-card-text>
                            <div class="stat-label">SAM-tagged flavors</div>
                            <div
                                class="stat-value"
                                :class="{ 'text-success': scan.totals.samFlavors > 0 }"
                            >
                                {{ scan.totals.samFlavors }}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card variant="flat" border class="stat-card">
                        <v-card-text>
                            <div class="stat-label">SAM-tagged properties</div>
                            <div
                                class="stat-value"
                                :class="{ 'text-success': scan.totals.samProperties > 0 }"
                            >
                                {{ scan.totals.samProperties }}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <v-card v-if="scan?.samFlavors.length" variant="flat" border class="mb-4">
                <v-card-title class="d-flex align-center ga-2">
                    <v-icon color="success">mdi-database-check</v-icon>
                    Matched flavors
                </v-card-title>
                <v-list density="compact">
                    <v-list-item
                        v-for="f in scan.samFlavors"
                        :key="f.name"
                        :to="`/schema?q=${encodeURIComponent(f.name)}`"
                    >
                        <template #prepend>
                            <v-icon size="small">mdi-shape</v-icon>
                        </template>
                        <v-list-item-title>{{ f.name }}</v-list-item-title>
                        <v-list-item-subtitle v-if="f.description">
                            {{ f.description }}
                        </v-list-item-subtitle>
                        <template #append>
                            <v-chip
                                v-for="kw in f.matchedKeywords"
                                :key="kw"
                                size="x-small"
                                variant="tonal"
                                color="success"
                                class="mr-1"
                            >
                                {{ kw.trim() }}
                            </v-chip>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card>

            <v-card v-if="scan?.samProperties.length" variant="flat" border class="mb-4">
                <v-card-title class="d-flex align-center ga-2">
                    <v-icon color="success">mdi-tag-multiple</v-icon>
                    Matched properties
                </v-card-title>
                <v-list density="compact">
                    <v-list-item
                        v-for="p in scan.samProperties"
                        :key="p.name"
                        :to="`/schema?q=${encodeURIComponent(p.name)}`"
                    >
                        <template #prepend>
                            <v-icon size="small">{{ propIcon(p.type) }}</v-icon>
                        </template>
                        <v-list-item-title>
                            {{ p.name }}
                            <v-chip size="x-small" variant="text" class="ml-2">
                                {{ p.type || '—' }}
                            </v-chip>
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            <span v-if="p.description">{{ p.description }}</span>
                            <span v-else class="text-disabled">no description</span>
                            <span v-if="p.domainFlavors.length" class="ml-2 text-medium-emphasis">
                                on: {{ p.domainFlavors.join(', ') }}
                            </span>
                        </v-list-item-subtitle>
                        <template #append>
                            <v-chip
                                v-for="kw in p.matchedKeywords"
                                :key="kw"
                                size="x-small"
                                variant="tonal"
                                color="success"
                                class="mr-1"
                            >
                                {{ kw.trim() }}
                            </v-chip>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card>

            <v-card
                v-if="scan?.schemaReachable && !hasSamSignal"
                variant="flat"
                border
                class="mb-4 empty-card"
            >
                <v-card-text>
                    <div class="d-flex align-center ga-3 mb-2">
                        <v-icon color="warning" size="28">mdi-clock-outline</v-icon>
                        <div class="text-h6 font-weight-medium">
                            No SAM-tagged flavors or properties yet
                        </div>
                    </div>
                    <div class="text-medium-emphasis mb-3">
                        The Query Server is reachable, but nothing in its schema matches the SAM
                        keyword set below. Either the SAM.gov fetcher hasn't run yet, or its outputs
                        land on properties that don't carry these keywords in their names or
                        descriptions.
                    </div>
                    <div class="text-body-2 text-medium-emphasis mb-2">
                        Try the entity search to look up a known SAM-registered organization, or
                        browse the full schema for clues.
                    </div>
                    <div class="d-flex ga-2">
                        <v-btn variant="tonal" to="/entities" prepend-icon="mdi-magnify">
                            Entity search
                        </v-btn>
                        <v-btn variant="tonal" to="/schema" prepend-icon="mdi-graph-outline">
                            Browse schema
                        </v-btn>
                    </div>
                </v-card-text>
            </v-card>

            <v-card variant="flat" border>
                <v-card-title class="d-flex align-center ga-2">
                    <v-icon size="small">mdi-tag-search</v-icon>
                    Keywords scanned
                </v-card-title>
                <v-card-text>
                    <v-chip
                        v-for="kw in scan?.keywords ?? []"
                        :key="kw"
                        size="small"
                        variant="outlined"
                        class="mr-1 mb-1"
                    >
                        {{ kw.trim() }}
                    </v-chip>
                </v-card-text>
            </v-card>

            <div v-if="scan?.checkedAt" class="footer text-disabled text-caption mt-4">
                Last checked {{ formatTime(scan.checkedAt) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { SamScanResponse } from '~/server/api/sam/scan.get';

    const {
        data: scan,
        pending,
        refresh: refetch,
    } = await useFetch<SamScanResponse>('/api/sam/scan', { server: false, lazy: true });

    const refreshing = ref(false);
    async function refresh() {
        refreshing.value = true;
        try {
            await refetch();
        } finally {
            refreshing.value = false;
        }
    }

    const hasSamSignal = computed(
        () => !!scan.value && scan.value.totals.samFlavors + scan.value.totals.samProperties > 0
    );

    function propIcon(type: string): string {
        if (type === 'data_nindex') return 'mdi-link-variant';
        if (type === 'data_int' || type === 'data_float') return 'mdi-numeric';
        if (type === 'data_bool') return 'mdi-toggle-switch';
        if (type === 'data_str') return 'mdi-text';
        if (type === 'data_date' || type === 'data_datetime') return 'mdi-calendar';
        return 'mdi-tag-outline';
    }

    function formatTime(iso: string) {
        try {
            return new Date(iso).toLocaleTimeString();
        } catch {
            return iso;
        }
    }
</script>

<style scoped>
    .onboarding-page {
        height: 100%;
        overflow-y: auto;
        display: flex;
        justify-content: center;
        padding: 32px 24px 64px;
    }

    .onboarding-content {
        max-width: 960px;
        width: 100%;
    }

    .hero {
        margin-bottom: 32px;
    }

    .hero-title {
        font-family: var(--font-headline);
        font-weight: 400;
        font-size: 2rem;
        letter-spacing: 0.02em;
        margin-bottom: 8px;
    }

    .hero-subtitle {
        color: var(--lv-silver);
        font-size: 1rem;
        max-width: 640px;
    }

    .status-card {
        padding: 4px 0;
    }

    .status-headline {
        font-family: var(--font-headline);
        font-weight: 500;
        font-size: 1.1rem;
        letter-spacing: 0.02em;
    }

    .stat-card {
        height: 100%;
    }

    .stat-label {
        font-family: var(--font-headline);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        color: var(--lv-silver);
        margin-bottom: 4px;
    }

    .stat-value {
        font-family: var(--font-mono);
        font-size: 1.8rem;
        line-height: 1.1;
    }

    .empty-card {
        background: rgba(255, 200, 0, 0.04);
    }

    .footer {
        text-align: center;
    }
</style>
