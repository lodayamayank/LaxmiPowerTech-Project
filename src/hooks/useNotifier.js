import { toast } from 'sonner';

const useNotifier = () => {
  return {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast.info(msg),
    warn: (msg) => toast.warning(msg),
  };
};

export default useNotifier;
