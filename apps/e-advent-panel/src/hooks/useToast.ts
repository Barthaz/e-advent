import { useAppDispatch } from './useAppDispatch';
import { addToast } from '../store/uiSlice';
import type { ToastType } from '../store/uiSlice';

export function useToast() {
  const dispatch = useAppDispatch();

  const toast = (message: string, type: ToastType = 'info') => {
    dispatch(addToast({ message, type }));
  };

  return {
    success: (msg: string) => toast(msg, 'success'),
    error: (msg: string) => toast(msg, 'error'),
    info: (msg: string) => toast(msg, 'info'),
  };
}
