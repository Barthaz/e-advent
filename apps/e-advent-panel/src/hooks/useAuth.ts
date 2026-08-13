import { useAppDispatch, useAppSelector } from './useAppDispatch';
import { clearCredentials, selectIsAuthenticated, selectUsername, selectToken } from '../store/authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const username = useAppSelector(selectUsername);
  const token = useAppSelector(selectToken);

  const logout = () => dispatch(clearCredentials());

  return { isAuthenticated, username, token, logout };
}
