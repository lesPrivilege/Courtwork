import { describe, expect, it, vi } from 'vitest';
import {
  assertUrlIsFetchSafe,
  fetchWithGuardedRedirects,
  isBlockedIpAddress,
  WebFetchBlockedError,
  type FetchLike,
  type HostResolver,
} from './web-fetch-ssrf.js';

describe('isBlockedIpAddress — IPv4 private/reserved ranges', () => {
  it.each([
    ['127.0.0.1', true, 'loopback'],
    ['10.1.2.3', true, '10.0.0.0/8'],
    ['172.16.0.1', true, '172.16.0.0/12 lower bound'],
    ['172.31.255.255', true, '172.16.0.0/12 upper bound'],
    ['192.168.1.1', true, '192.168.0.0/16'],
    ['169.254.169.254', true, 'cloud metadata endpoint'],
    ['169.254.1.1', true, '169.254.0.0/16 link-local'],
    ['0.0.0.0', true, 'unspecified'],
    ['172.15.255.255', false, 'just below 172.16.0.0/12'],
    ['172.32.0.1', false, 'just above 172.16.0.0/12'],
    ['8.8.8.8', false, 'public (Google DNS)'],
    ['1.1.1.1', false, 'public (Cloudflare DNS)'],
  ])('%s → blocked=%s (%s)', (ip, expected) => {
    expect(isBlockedIpAddress(ip)).toBe(expected);
  });
});

describe('isBlockedIpAddress — IPv6 private/reserved ranges and IPv4-mapped forms', () => {
  it.each([
    ['::1', true, 'loopback'],
    ['fc00::1', true, 'unique local'],
    ['fe80::1', true, 'link-local'],
    ['::ffff:127.0.0.1', true, 'IPv4-mapped loopback'],
    ['::ffff:192.168.1.1', true, 'IPv4-mapped private'],
    ['::ffff:8.8.8.8', false, 'IPv4-mapped public'],
    ['2001:4860:4860::8888', false, 'public IPv6 (Google DNS)'],
  ])('%s → blocked=%s (%s)', (ip, expected) => {
    expect(isBlockedIpAddress(ip)).toBe(expected);
  });
});

describe('isBlockedIpAddress — non-IP input', () => {
  it('treats a string that is not a valid IP literal as blocked (conservative default)', () => {
    expect(isBlockedIpAddress('not-an-ip')).toBe(true);
  });
});

describe('assertUrlIsFetchSafe — protocol allowlist', () => {
  it('rejects a file:// URL', async () => {
    await expect(assertUrlIsFetchSafe('file:///etc/passwd')).rejects.toThrow(WebFetchBlockedError);
  });

  it('rejects an ftp:// URL', async () => {
    await expect(assertUrlIsFetchSafe('ftp://example.invalid/x')).rejects.toThrow(WebFetchBlockedError);
  });

  it('accepts https', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8'];
    await expect(assertUrlIsFetchSafe('https://example.invalid/', resolveHost)).resolves.toBeUndefined();
  });
});

describe('assertUrlIsFetchSafe — literal IP in URL', () => {
  it('rejects a literal private IP without needing DNS resolution', async () => {
    const resolveHost = vi.fn();
    await expect(assertUrlIsFetchSafe('http://127.0.0.1/admin', resolveHost)).rejects.toThrow(WebFetchBlockedError);
    expect(resolveHost).not.toHaveBeenCalled();
  });

  it('rejects the cloud metadata literal IP', async () => {
    await expect(assertUrlIsFetchSafe('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      WebFetchBlockedError,
    );
  });

  it('accepts a literal public IP', async () => {
    const resolveHost = vi.fn();
    await expect(assertUrlIsFetchSafe('http://8.8.8.8/', resolveHost)).resolves.toBeUndefined();
    expect(resolveHost).not.toHaveBeenCalled();
  });
});

describe('assertUrlIsFetchSafe — hostname resolution', () => {
  it('rejects "localhost" without needing DNS resolution', async () => {
    const resolveHost = vi.fn();
    await expect(assertUrlIsFetchSafe('http://localhost:8080/', resolveHost)).rejects.toThrow(WebFetchBlockedError);
    expect(resolveHost).not.toHaveBeenCalled();
  });

  it('rejects a hostname that resolves to a private IP (DNS rebinding / internal-only domain)', async () => {
    const resolveHost: HostResolver = async () => ['10.0.0.5'];
    await expect(assertUrlIsFetchSafe('https://internal.example.invalid/', resolveHost)).rejects.toThrow(
      WebFetchBlockedError,
    );
  });

  it('rejects a hostname if ANY of its resolved addresses is blocked, even if others are public', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8', '192.168.1.1'];
    await expect(assertUrlIsFetchSafe('https://mixed.example.invalid/', resolveHost)).rejects.toThrow(
      WebFetchBlockedError,
    );
  });

  it('rejects when resolution yields no addresses at all', async () => {
    const resolveHost: HostResolver = async () => [];
    await expect(assertUrlIsFetchSafe('https://nowhere.example.invalid/', resolveHost)).rejects.toThrow(
      WebFetchBlockedError,
    );
  });

  it('accepts a hostname whose every resolved address is public', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8', '1.1.1.1'];
    await expect(assertUrlIsFetchSafe('https://public.example.invalid/', resolveHost)).resolves.toBeUndefined();
  });
});

function jsonResponse(status: number, headers?: Record<string, string>): Response {
  return new Response(null, { status, headers });
}

describe('fetchWithGuardedRedirects — happy path', () => {
  it('returns the response and finalUrl for a non-redirect response on the first hop', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => new Response('ok', { status: 200 }));
    const resolveHost: HostResolver = async () => ['8.8.8.8'];

    const { response, finalUrl } = await fetchWithGuardedRedirects('https://a.example.invalid/', {
      fetchImpl,
      resolveHost,
    });

    expect(response.status).toBe(200);
    expect(finalUrl).toBe('https://a.example.invalid/');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('https://a.example.invalid/', expect.objectContaining({ redirect: 'manual' }));
  });

  it('follows a redirect chain to public URLs and validates every hop', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8'];
    const fetchImpl: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(302, { location: 'https://b.example.invalid/' }))
      .mockResolvedValueOnce(new Response('final', { status: 200 }));

    const { response, finalUrl } = await fetchWithGuardedRedirects('https://a.example.invalid/', {
      fetchImpl,
      resolveHost,
    });

    expect(response.status).toBe(200);
    expect(finalUrl).toBe('https://b.example.invalid/');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('resolves a relative Location header against the current URL', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8'];
    const fetchImpl: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(301, { location: '/moved' }))
      .mockResolvedValueOnce(new Response('final', { status: 200 }));

    const { finalUrl } = await fetchWithGuardedRedirects('https://a.example.invalid/start', { fetchImpl, resolveHost });

    expect(finalUrl).toBe('https://a.example.invalid/moved');
  });
});

describe('fetchWithGuardedRedirects — SSRF protection on every hop', () => {
  it('blocks before ever calling fetchImpl when the initial URL is unsafe', async () => {
    const fetchImpl: FetchLike = vi.fn();

    await expect(fetchWithGuardedRedirects('http://127.0.0.1/', { fetchImpl })).rejects.toThrow(WebFetchBlockedError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('blocks a redirect hop that points at a private IP without following it', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8'];
    const fetchImpl: FetchLike = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(302, { location: 'http://169.254.169.254/latest/meta-data/' }));

    await expect(fetchWithGuardedRedirects('https://a.example.invalid/', { fetchImpl, resolveHost })).rejects.toThrow(
      WebFetchBlockedError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('fetchWithGuardedRedirects — malformed redirects and loops', () => {
  it('throws when a redirect response has no Location header', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8'];
    const fetchImpl: FetchLike = vi.fn(async () => jsonResponse(302));

    await expect(fetchWithGuardedRedirects('https://a.example.invalid/', { fetchImpl, resolveHost })).rejects.toThrow(
      WebFetchBlockedError,
    );
  });

  it('throws once the redirect count exceeds maxRedirects', async () => {
    const resolveHost: HostResolver = async () => ['8.8.8.8'];
    const fetchImpl: FetchLike = vi.fn(async () => jsonResponse(302, { location: 'https://a.example.invalid/next' }));

    await expect(
      fetchWithGuardedRedirects('https://a.example.invalid/', { fetchImpl, resolveHost, maxRedirects: 2 }),
    ).rejects.toThrow(WebFetchBlockedError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
