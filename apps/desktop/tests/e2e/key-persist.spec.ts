import { expect, test, type Page } from '@playwright/test';

type CredentialHooks = {
  setStatus(status: {
    credential: { phase: 'absent' | 'stored'; source?: 'pasted' | 'environment' };
    connection: { phase: 'unverified' | 'verifying' | 'ready' | 'failed' };
  }): void;
};

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('option', { name: 'Settings', exact: true }).click();
}

test('stored Keychain readiness restores after reload without reopening or refilling the credential form', async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & {
      __CW_FORCE_CREDENTIAL__?: {
        credential: { phase: 'stored'; source: 'pasted' };
        connection: { phase: 'unverified' };
      };
    }).__CW_FORCE_CREDENTIAL__ = {
      credential: { phase: 'stored', source: 'pasted' },
      connection: { phase: 'unverified' },
    };
  });

  for (let launch = 0; launch < 2; launch += 1) {
    if (launch === 0) await page.goto('/');
    else await page.reload();

    await expect(page.getByTestId('workbench')).toHaveAttribute('data-credential-probed', 'true');
    await openSettings(page);
    await expect(page.getByTestId('settings-credential-storage')).toHaveAttribute('data-phase', 'stored');
    await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-phase', 'ready');
    await expect(page.getByTestId('settings-credential-embed')).toHaveCount(0);
    await page.getByTestId('settings-close').click();
  }
});

test('Settings explicitly clears the saved credential and leaves no browser persistence residue', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const hooks = (window as typeof window & { __courtworkCredentials?: CredentialHooks }).__courtworkCredentials;
    if (!hooks) throw new Error('credential hooks missing behind DEV+E2E gate');
    hooks.setStatus({
      credential: { phase: 'stored', source: 'pasted' },
      connection: { phase: 'ready' },
    });
  });

  await openSettings(page);
  await expect(page.getByTestId('settings-credential-storage')).toHaveText('Saved in Keychain');
  await page.getByTestId('settings-clear-credential').click();
  await expect(page.getByTestId('settings-credential-storage')).toHaveAttribute('data-phase', 'absent');
  await expect(page.getByTestId('settings-credential-phase')).toHaveAttribute('data-phase', 'unverified');
  await expect(page.getByTestId('settings-clear-credential')).toHaveCount(0);

  const browserResidue = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
    body: document.body.textContent ?? '',
  }));
  expect(JSON.stringify(browserResidue)).not.toContain('cw-valid-secret-key');
  expect(JSON.stringify(browserResidue)).not.toMatch(/sk-[A-Za-z0-9_-]{8,}/);
});
