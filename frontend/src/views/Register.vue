<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function handleRegister() {
  error.value = '';

  // 验证
  if (!name.value || !email.value || !password.value) {
    error.value = '请填写所有必填项';
    return;
  }

  if (password.value.length < 8) {
    error.value = '密码至少需要8个字符';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }

  loading.value = true;

  try {
    await userStore.register(email.value, password.value, name.value);
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '注册失败，请稍后重试';
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
          创建账户
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          开始您的量化交易之旅
        </p>
      </div>

      <!-- Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              姓名
            </label>
            <input
              id="name"
              v-model="name"
              type="text"
              required
              class="input mt-1"
              placeholder="请输入姓名"
            />
          </div>

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
              autocomplete="new-password"
              required
              class="input mt-1"
              placeholder="至少8个字符"
            />
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              确认密码
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="input mt-1"
              placeholder="请再次输入密码"
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
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </div>

        <!-- Login Link -->
        <div class="text-center">
          <router-link
            to="/login"
            class="text-sm text-primary-600 hover:text-primary-500"
          >
            已有账户？立即登录
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
