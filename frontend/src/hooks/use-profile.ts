import { useAuthStore } from '@/store/useAuthStore';

export function useProfile() {
  const { user, profile, fetchProfile } = useAuthStore();

  return { user, profile, fetchProfile };
}