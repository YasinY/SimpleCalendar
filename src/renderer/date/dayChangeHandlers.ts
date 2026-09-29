export interface DayChangeHandlers {
  onDayChange: (previousDay: Date, today: Date) => void;
}
