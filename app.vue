<template>
    <v-app class="theme-brand">
        <template v-if="showAppFramework">
            <AppHeader>
                <template #nav-toggle>
                    <v-btn
                        icon="mdi-menu"
                        variant="text"
                        color="white"
                        @click="state.navDrawerOpen = !state.navDrawerOpen"
                    />
                </template>
            </AppHeader>

            <v-navigation-drawer
                v-model="state.navDrawerOpen"
                color="surface"
                width="260"
                temporary
            >
                <v-list density="compact" nav>
                    <v-list-subheader>SAM.gov Onboarding</v-list-subheader>
                    <v-list-item
                        v-for="item in navItems"
                        :key="item.to"
                        :to="item.to"
                        :prepend-icon="item.icon"
                        :title="item.title"
                        :subtitle="item.subtitle"
                        link
                    />
                </v-list>
            </v-navigation-drawer>

            <v-main class="fill-height">
                <ServerStatus />
                <NuxtPage />
            </v-main>

            <!-- Global Dialogs -->
            <v-dialog v-model="state.showSettingsDialog" max-width="600">
                <SettingsDialog />
            </v-dialog>

            <!-- Global Notifications -->
            <NotificationContainer />

            <!-- Server Status Footer -->
            <ServerStatusFooter />
        </template>
        <template v-else>
            <NuxtPage />
        </template>
    </v-app>
</template>

<script setup lang="ts">
    import { state } from './utils/appState';

    const route = useRoute();
    const { userName } = useUserState();

    const noFrameworkRoutes = ['/login', '/a0callback', '/logout', '/pending'];

    const showAppFramework = computed(() => {
        if (noFrameworkRoutes.includes(route.path)) {
            return false;
        }
        if (!userName.value) {
            return false;
        }
        return true;
    });

    const navItems = [
        {
            to: '/',
            title: 'Onboarding Status',
            subtitle: 'Schema scan for SAM.gov',
            icon: 'mdi-check-network',
        },
        {
            to: '/schema',
            title: 'Schema Browser',
            subtitle: 'Flavors & properties',
            icon: 'mdi-graph-outline',
        },
        {
            to: '/entities',
            title: 'Entity Search',
            subtitle: 'Lookup by name',
            icon: 'mdi-magnify',
        },
        {
            to: '/tenancy-probe',
            title: 'Tenancy Probe',
            subtitle: 'Data plane reachability',
            icon: 'mdi-server-network',
        },
    ];
</script>
