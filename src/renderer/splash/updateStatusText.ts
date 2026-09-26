import { PERCENT_SEPARATOR, PERCENT_SUFFIX, STATUS_TEXTS, UNKNOWN_VERSION } from './splashConstants';
import { UPDATE_PHASES } from '@shared/updatePhase';
import type { UpdateStatus } from '@shared/updateStatus';

function formatPercent(percent: number | null): string {
  if (percent === null) return UNKNOWN_VERSION;
  return PERCENT_SEPARATOR + percent + PERCENT_SUFFIX;
}

export function describeUpdateStatus({ phase, version, percent }: UpdateStatus): string {
  const versionText = version ?? UNKNOWN_VERSION;
  if (phase === UPDATE_PHASES.CHECKING) return STATUS_TEXTS.CHECKING;
  if (phase === UPDATE_PHASES.DOWNLOADING) return STATUS_TEXTS.DOWNLOADING_PREFIX + versionText + formatPercent(percent);
  if (phase === UPDATE_PHASES.INSTALLING) return STATUS_TEXTS.INSTALLING_PREFIX + versionText;
  return STATUS_TEXTS.UP_TO_DATE;
}
