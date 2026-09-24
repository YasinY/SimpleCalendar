import type { EventInput } from '../../shared/eventInput';

export interface EventDialogHandlers {
  onSubmit: (payload: EventInput) => void;
  onDelete: (eventId: string) => void;
}
