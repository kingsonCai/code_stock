import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, User, AuthResponse } from '../api/auth';

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);

  // Getters
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const userName = computed(() => user.value?.name || 'Guest');

  // Actions
  async function login(email: string, password: string): Promise<void> {
    const response = await authApi.login({ email, password });
    setAuth(response.data);
  }

  async function register(email: string, password: string, name: string): Promise<void> {
    const response = await authApi.register({ email, password, name });
    setAuth(response.data);
  }

  async function fetchUser(): Promise<void> {
    if (!token.value) return;

    try {
      const response = await authApi.me();
      user.value = response.data;
    } catch {
      logout();
    }
  }

  async function refreshAuthToken(): Promise<void> {
    if (!refreshToken.value) return;

    const response = await authApi.refresh();
    token.value = response.data.token;
    refreshToken.value = response.data.refreshToken;
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await authApi.changePassword({ oldPassword, newPassword });
  }

  function logout(): void {
    user.value = null;
    token.value = null;
    refreshToken.value = null;
  }

  function initialize(): void {
    // 从持久化存储恢复状态
    if (token.value) {
      fetchUser();
    }
  }

  function setAuth(data: AuthResponse): void {
    user.value = data.user;
    token.value = data.token;
    refreshToken.value = data.refreshToken;
  }

  return {
    // State
    user,
    token,
    refreshToken,
    // Getters
    isLoggedIn,
    userName,
    // Actions
    login,
    register,
    fetchUser,
    refreshAuthToken,
    changePassword,
    logout,
    initialize,
  };
}, {
  persist: {
    key: 'user-store',
    storage: localStorage,
    paths: ['token', 'refreshToken', 'user'],
  },
});
