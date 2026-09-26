export interface StartupOptions {
  autoUpdate: boolean;
  backgroundColor: string;
  openMainWindow(): Promise<void>;
  onFinished(): void;
}
