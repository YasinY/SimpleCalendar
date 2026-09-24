import { generateCoverageReport } from './coverageReport';

export default async function globalTeardown(): Promise<void> {
  await generateCoverageReport();
}
