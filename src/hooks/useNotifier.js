import { toast } from "react-toastify";

const useNotifier = () => {
  return {
    success: (msg) => toast.success(msg, { position: "top-center" }),
    error: (msg) => toast.error(msg, { position: "top-center" }),
    info: (msg) => toast.info(msg, { position: "top-center" }),
    warn: (msg) => toast.warn(msg, { position: "top-center" }),
  };
};

export default useNotifier;
