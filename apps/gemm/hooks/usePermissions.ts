import { useAuthStore } from '@/stores/authStore';

export function usePermissions() {
  const profile = useAuthStore((s) => s.profile);
  const isRoot = profile?.role === 'root';
  const isAdminOrRoot = profile?.role === 'admin' || isRoot;
  return { isAdminOrRoot, isRoot };
}
