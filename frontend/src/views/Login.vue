<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = '请输入邮箱和密码';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await userStore.login(email.value, password.value);

    // 跳转到目标页面或首页
    const redirect = route.query.redirect as string || '/';
    router.push(redirect);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败，请检查邮箱和密码';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          量化交易平台
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          登录您的账户
        </p>
      </div>

      <!-- Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <div class="space-y-4">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              邮箱
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="input mt-1"
              placeholder="请输入邮箱"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              密码
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="input mt-1"
              placeholder="请输入密码"
            />
          </div>
        </div>

        <!-- Submit -->
        <div>
          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full flex justify-center"
          >
            <span v-if="loading" class="animate-spin mr-2">⏳</span>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>

        <!-- Register Link -->
        <div class="text-center">
          <router-link
            to="/register"
            class="text-sm text-primary-600 hover:text-primary-500"
          >
            没有账户？立即注册
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
