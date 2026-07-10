import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const PRIVATE_NETWORK_BLOCK_LIST = new BlockList();
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('0.0.0.0', 8, 'ipv4');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('10.0.0.0', 8, 'ipv4');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('127.0.0.0', 8, 'ipv4');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('169.254.0.0', 16, 'ipv4');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('172.16.0.0', 12, 'ipv4');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('192.168.0.0', 16, 'ipv4');
PRIVATE_NETWORK_BLOCK_LIST.addAddress('::1', 'ipv6');
PRIVATE_NETWORK_BLOCK_LIST.addAddress('::', 'ipv6');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('fc00::', 7, 'ipv6');
PRIVATE_NETWORK_BLOCK_LIST.addSubnet('fe80::', 10, 'ipv6');

/**
 * 私有网段/云元数据端点黑名单（docs/27 MVP 最小集第 3 条）。用 node:net 内置 BlockList
 * 而非手写 CIDR 数学：`check(address, 'ipv6')` 对 IPv4-mapped IPv6（如 ::ffff:127.0.0.1
 * 或十六进制形式 ::ffff:7f00:1）会自动按其内嵌的 IPv4 部分复核已添加的 IPv4 规则
 * （Node 官方文档示例已验证此行为），不需要为每条 IPv4 规则再手写一条等价的
 * ::ffff:x.x.x.x/mask IPv6 规则。
 */
export function isBlockedIpAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return PRIVATE_NETWORK_BLOCK_LIST.check(ip, 'ipv4');
  if (family === 6) return PRIVATE_NETWORK_BLOCK_LIST.check(ip, 'ipv6');
  return true;
}

export interface HostResolver {
  (hostname: string): Promise<string[]>;
}

/** 默认解析实现：走系统 DNS，取全部 A/AAAA 记录（而非只取第一条）逐一校验。 */
export const defaultHostResolver: HostResolver = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true });
  return records.map((record) => record.address);
};

export class WebFetchBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebFetchBlockedError';
  }
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * 抓取前的安全校验：协议白名单 + 目标地址（字面量 IP 或域名解析后的全部地址）不得落入
 * 私网段/云元数据黑名单。
 *
 * 已知残余风险（如实记录，不过度承诺）：DNS 解析与实际发起请求之间存在理论上的 TOCTOU
 * 窗口（DNS rebinding）——本函数做的是"解析后立即校验"这一层防御，不是形式化证明；
 * 彻底关闭这个窗口需要把解析结果锁定后直接拿 IP 建连（自定义 dispatcher/lookup 钉住
 * 解析结果），这属于 docs/14 §5.1 已经识别、留给 Stage 1 服务端代理统一出口的更彻底方案，
 * MVP 阶段这里的验证成本与收益比例更合适。
 */
export async function assertUrlIsFetchSafe(url: string, resolveHost: HostResolver = defaultHostResolver): Promise<void> {
  const parsed = new URL(url);
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new WebFetchBlockedError(`不支持的协议：${parsed.protocol}`);
  }

  const hostname = parsed.hostname;
  if (isIP(hostname)) {
    if (isBlockedIpAddress(hostname)) {
      throw new WebFetchBlockedError(`目标地址被拦截（私有网段/云元数据端点）：${hostname}`);
    }
    return;
  }

  if (hostname.toLowerCase() === 'localhost') {
    throw new WebFetchBlockedError('目标地址被拦截：localhost');
  }

  const addresses = await resolveHost(hostname);
  if (addresses.length === 0) {
    throw new WebFetchBlockedError(`域名解析失败或无可用地址：${hostname}`);
  }
  for (const address of addresses) {
    if (isBlockedIpAddress(address)) {
      throw new WebFetchBlockedError(`目标域名解析到被拦截网段：${hostname} → ${address}`);
    }
  }
}

export interface FetchLike {
  (url: string, init?: RequestInit): Promise<Response>;
}

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_MAX_REDIRECTS = 5;

export interface GuardedFetchOptions {
  fetchImpl?: FetchLike;
  resolveHost?: HostResolver;
  maxRedirects?: number;
  signal?: AbortSignal;
}

/**
 * 逐跳校验的重定向抓取（docs/27"重定向逐跳检查"）：每一跳（含首跳）都先过
 * assertUrlIsFetchSafe 才发起请求，防止"第一跳是公网地址、重定向目标是私网"的绕过。
 * redirect:'manual' 关闭 fetch 的自动跟随，由本函数显式控制每一跳。
 */
export async function fetchWithGuardedRedirects(
  initialUrl: string,
  opts: GuardedFetchOptions = {},
): Promise<{ response: Response; finalUrl: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const resolveHost = opts.resolveHost ?? defaultHostResolver;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let currentUrl = initialUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertUrlIsFetchSafe(currentUrl, resolveHost);
    const response = await fetchImpl(currentUrl, { redirect: 'manual', signal: opts.signal });

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return { response, finalUrl: currentUrl };
    }
    const location = response.headers.get('location');
    if (!location) {
      throw new WebFetchBlockedError(`重定向响应（${response.status}）缺少 Location 头：${currentUrl}`);
    }
    currentUrl = new URL(location, currentUrl).toString();
  }
  throw new WebFetchBlockedError(`重定向次数超过上限（${maxRedirects}）：${initialUrl}`);
}
