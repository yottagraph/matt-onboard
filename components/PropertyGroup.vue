<template>
    <v-card variant="flat" border class="mb-3 property-group">
        <v-card-title class="d-flex align-center ga-2">
            <v-icon :color="iconColor">{{ icon }}</v-icon>
            <span>{{ title }}</span>
            <v-chip size="x-small" variant="text" class="ml-1">
                {{ rows.length }}
            </v-chip>
            <v-spacer />
            <v-btn
                v-if="collapsible"
                :icon="collapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'"
                size="small"
                variant="text"
                @click="collapsed = !collapsed"
            />
        </v-card-title>
        <v-divider />
        <v-card-text v-if="!collapsed">
            <div v-if="!rows.length && emptyText" class="text-medium-emphasis text-body-2 py-2">
                {{ emptyText }}
            </div>
            <div v-else class="prop-table">
                <div v-for="row in rows" :key="row.name" class="prop-row">
                    <div class="prop-key">
                        <v-chip
                            v-if="sam"
                            size="x-small"
                            variant="tonal"
                            color="success"
                            class="mr-2"
                        >
                            SAM
                        </v-chip>
                        <span class="mono">{{ row.name }}</span>
                    </div>
                    <div class="prop-val">{{ row.value }}</div>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    interface Row {
        name: string;
        value: string | null;
    }

    const props = defineProps<{
        title: string;
        icon: string;
        iconColor?: string;
        rows: Row[];
        emptyText?: string;
        collapsible?: boolean;
        sam?: boolean;
    }>();

    const collapsed = ref(props.collapsible === true);
</script>

<style scoped>
    .property-group :deep(.v-card-title) {
        font-family: var(--font-headline);
        font-weight: 400;
        font-size: 1.05rem;
        letter-spacing: 0.02em;
    }

    .prop-table {
        display: flex;
        flex-direction: column;
    }

    .prop-row {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 16px;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        font-size: 0.9rem;
    }

    .prop-row:last-child {
        border-bottom: none;
    }

    .prop-key {
        display: flex;
        align-items: center;
        color: var(--lv-silver);
    }

    .prop-val {
        word-break: break-word;
        color: var(--lv-text, #e5e7eb);
    }

    .mono {
        font-family: var(--font-mono);
        font-size: 0.85rem;
    }

    @media (max-width: 600px) {
        .prop-row {
            grid-template-columns: 1fr;
            gap: 2px;
            padding: 8px 0;
        }
    }
</style>
