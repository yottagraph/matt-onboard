<template>
    <div class="entity-page">
        <div class="entity-content">
            <div class="back-link mb-3">
                <v-btn variant="text" prepend-icon="mdi-arrow-left" to="/entities" size="small">
                    Back to search
                </v-btn>
            </div>

            <div v-if="pending" class="d-flex justify-center pa-8">
                <v-progress-circular indeterminate />
            </div>

            <v-alert v-else-if="data?.error" type="error" variant="tonal" class="mb-4">
                {{ data.error }}
            </v-alert>

            <template v-else-if="data">
                <div class="entity-header">
                    <div class="d-flex align-center ga-3 mb-2">
                        <v-avatar size="48" :color="flavorColor(data.flavor)">
                            <v-icon size="x-large">{{ flavorIcon(data.flavor) }}</v-icon>
                        </v-avatar>
                        <div class="flex-grow-1">
                            <h1 class="entity-name">{{ data.name }}</h1>
                            <div class="entity-meta">
                                <v-chip size="small" variant="tonal" class="mr-2">
                                    {{ data.flavor }}
                                </v-chip>
                                <span class="mono text-medium-emphasis">{{ data.neid }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <v-row dense class="mb-4">
                    <v-col cols="12" sm="4">
                        <v-card variant="flat" border class="stat-card">
                            <v-card-text>
                                <div class="stat-label">SAM identifiers</div>
                                <div
                                    class="stat-value"
                                    :class="{
                                        'text-success': data.groups.sam.length > 0,
                                        'text-disabled': data.groups.sam.length === 0,
                                    }"
                                >
                                    {{ data.groups.sam.length }}
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="4">
                        <v-card variant="flat" border class="stat-card">
                            <v-card-text>
                                <div class="stat-label">Core attributes</div>
                                <div class="stat-value">{{ data.groups.core.length }}</div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="4">
                        <v-card variant="flat" border class="stat-card">
                            <v-card-text>
                                <div class="stat-label">Other populated</div>
                                <div class="stat-value">{{ data.groups.other.length }}</div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <PropertyGroup
                    title="SAM.gov identifiers"
                    icon="mdi-check-decagram"
                    icon-color="success"
                    :rows="data.groups.sam"
                    empty-text="No SAM.gov identifier properties populated for this entity."
                    sam
                />

                <PropertyGroup
                    title="Core attributes"
                    icon="mdi-card-bulleted"
                    :rows="data.groups.core"
                    empty-text="No core attributes populated."
                />

                <PropertyGroup
                    v-if="data.groups.other.length"
                    title="Other populated properties"
                    icon="mdi-tag-multiple"
                    :rows="data.groups.other"
                    collapsible
                />

                <v-expansion-panels v-if="data.knownProps.length" variant="accordion" class="mt-4">
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <v-icon size="small" class="mr-2">mdi-table-eye</v-icon>
                            Schema for
                            <span class="mono mx-1">{{ data.flavor }}</span>
                            <span class="text-medium-emphasis text-caption ml-2">
                                ({{ data.knownProps.length }} properties)
                            </span>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <v-list density="compact">
                                <v-list-item v-for="p in data.knownProps" :key="p.name">
                                    <template #prepend>
                                        <v-icon size="small">{{ propIcon(p.type) }}</v-icon>
                                    </template>
                                    <v-list-item-title class="mono">
                                        {{ p.name }}
                                    </v-list-item-title>
                                    <template #append>
                                        <v-chip size="x-small" variant="text">
                                            {{ p.type || '—' }}
                                        </v-chip>
                                    </template>
                                </v-list-item>
                            </v-list>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>

                <v-alert
                    v-if="data.missingFromSchema.length"
                    type="info"
                    variant="tonal"
                    class="mt-4"
                    icon="mdi-information-outline"
                >
                    <div class="font-weight-medium mb-1">
                        SAM identifier properties not in the schema yet
                    </div>
                    <div class="text-body-2">
                        The detail view asks for known SAM property names even when they're not
                        declared on this flavor — these are the ones that haven't been registered:
                    </div>
                    <div class="mt-2 d-flex flex-wrap ga-1">
                        <v-chip
                            v-for="name in data.missingFromSchema"
                            :key="name"
                            size="x-small"
                            variant="outlined"
                            class="mono"
                        >
                            {{ name }}
                        </v-chip>
                    </div>
                </v-alert>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { EntityDetailResponse } from '~/server/api/sam/entity.get';

    const route = useRoute();
    const neid = computed(() => String(route.params.neid ?? ''));
    const flavor = computed(() =>
        typeof route.query.flavor === 'string' ? route.query.flavor : 'organization'
    );

    const { data, pending } = await useFetch<EntityDetailResponse>('/api/sam/entity', {
        query: { neid, flavor },
        server: false,
        lazy: true,
        watch: [neid, flavor],
    });

    function propIcon(type: string): string {
        if (type === 'data_nindex') return 'mdi-link-variant';
        if (type === 'data_int' || type === 'data_float') return 'mdi-numeric';
        if (type === 'data_bool') return 'mdi-toggle-switch';
        if (type === 'data_str') return 'mdi-text';
        if (type === 'data_date' || type === 'data_datetime') return 'mdi-calendar';
        return 'mdi-tag-outline';
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
    .entity-page {
        height: 100%;
        overflow-y: auto;
        display: flex;
        justify-content: center;
        padding: 24px 24px 64px;
    }

    .entity-content {
        max-width: 960px;
        width: 100%;
    }

    .entity-header {
        margin-bottom: 24px;
    }

    .entity-name {
        font-family: var(--font-headline);
        font-weight: 400;
        font-size: 1.7rem;
        letter-spacing: 0.02em;
        margin-bottom: 2px;
    }

    .entity-meta {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .mono {
        font-family: var(--font-mono);
        font-size: 0.85rem;
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
</style>
