export interface ChoicePromptOptions<T> {
  choices: Record<string, T>;
  cancelValue: T;
  focusSelector: string;
}
