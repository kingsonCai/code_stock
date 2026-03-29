<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useUserStore } from './stores/user';

const userStore = useUserStore();

// 初始化用户状态
userStore.initialize();
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <RouterView />
  </div>
</template>
