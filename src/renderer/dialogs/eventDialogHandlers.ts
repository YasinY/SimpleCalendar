import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';

export interface EventDialogHandlers {
  onSubmit: (payload: EventInput, editing: CalendarEvent | null) => void;
  onDelete: (event: CalendarEvent) => void;
}
