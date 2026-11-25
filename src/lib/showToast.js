// Shared feedback helper for the legacy `showToast(message, type)` call sites. It goes through the app's Sonner
// toaster (components/ui/sonner.jsx) so every toast has the same look, position and timing.
import { toast } from 'sonner';

export function showToast(message, type = 'success') {
  const show = { error: toast.error, warning: toast.warning, info: toast.info }[type] || toast.success;
  show(message);
}
