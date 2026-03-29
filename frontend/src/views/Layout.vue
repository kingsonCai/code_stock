<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const sidebarOpen = ref(true);
const dropdownOpen = ref(false);

const navigation = [
  { name: '仪表盘', href: '/', icon: '📊' },
  { name: '策略管理', href: '/strategies', icon: '📝' },
  { name: '回测', href: '/backtest', icon: '🔬' },
  { name: '实时监控', href: '/monitor', icon: '📡' },
];

const currentPath = computed(() => router.currentRoute.value.path);

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center space-x-2">
          <span class="text-2xl">📈</span>
          <span v-if="sidebarOpen" class="text-lg font-bold text-gray-900 dark:text-white">
            量化平台
          </span>
        </div>
        <button @click="toggleSidebar" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          {{ sidebarOpen ? '◀' : '▶' }}
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-4 space-y-1">
        <router-link
          v-for="item in navigation"
          :key="item.href"
          :to="item.href"
          :class="[
            'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            currentPath === item.href
              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
        >
          <span class="text-xl mr-3">{{ item.icon }}</span>
          <span v-if="sidebarOpen">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- User Menu -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <div class="relative">
          <button
            @click="dropdownOpen = !dropdownOpen"
            class="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
              {{ userStore.userName.charAt(0).toUpperCase() }}
            </div>
            <span v-if="sidebarOpen" class="ml-3 text-gray-700 dark:text-gray-300">
              {{ userStore.userName }}
            </span>
          </button>

          <!-- Dropdown -->
          <div
            v-if="dropdownOpen"
            class="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button
              @click="handleLogout"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main
      :class="[
        'flex-1 overflow-auto transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-20'
      ]"
    >
      <router-view />
    </main>
  </div>
</template>
