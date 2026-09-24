import { createCalendarApp } from './createCalendarApp';
import { bindWindowControls } from './dom/windowControls';

bindWindowControls(window.calendarApi);
void createCalendarApp(window.calendarApi).start();
