import type { DiscardPrompt } from './DiscardPrompt';

export interface DialogOverlayOptions {
  cancelSelector: string;
  discardPrompt: DiscardPrompt;
  onDismiss: () => void;
}
