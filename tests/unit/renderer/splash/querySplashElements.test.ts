import { describe, expect, it } from 'vitest';
import { querySplashElements } from '@renderer/splash/querySplashElements';
import { mountSplashDocument } from '@tests/support/indexDocument';

const EXPECTED_IDS = {
  logo: 'logo',
  status: 'statusText',
  progress: 'progress',
  progressBar: 'progressBar',
  version: 'versionLabel'
};
const EMPTY_BODY = '';

describe('querySplashElements', () => {
  it('resolves every splash element by id', () => {
    mountSplashDocument();

    const elements = querySplashElements();

    expect(Object.fromEntries(Object.entries(elements).map(([key, element]) => [key, element.id]))).toEqual(EXPECTED_IDS);
  });

  it('throws when the splash markup is missing', () => {
    document.body.innerHTML = EMPTY_BODY;

    expect(() => querySplashElements()).toThrow(EXPECTED_IDS.logo);
  });
});
