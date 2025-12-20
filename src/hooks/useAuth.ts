import { useAuthContext } from './useAuthStore';

const useAuth = () => {
  return useAuthContext();
};

export default useAuth;
