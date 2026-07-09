export class JsonPointerError extends Error {}

/** RFC 6901 最小实现：只支持 core 需要的"定位到具体字段并赋新值"这一种操作。 */
export function applyJsonPointer(target: Record<string, unknown> | unknown[], pointer: string, value: unknown): void {
  if (!pointer.startsWith('/')) {
    throw new JsonPointerError(`fieldPath 必须是 JSON Pointer（以 / 开头）：收到 "${pointer}"`);
  }
  if (pointer === '/') {
    throw new JsonPointerError(`fieldPath 不能是根指针 "/"：必须定位到具体字段`);
  }
  const tokens = pointer
    .split('/')
    .slice(1)
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = target;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    const next = Array.isArray(cursor) ? cursor[Number(token)] : cursor[token];
    if (next === undefined || next === null) {
      throw new JsonPointerError(`JSON Pointer "${pointer}" 在第 ${i + 1} 段 "${token}" 处找不到对应节点`);
    }
    cursor = next;
  }
  const lastToken = tokens[tokens.length - 1];
  if (Array.isArray(cursor)) {
    cursor[Number(lastToken)] = value;
  } else {
    cursor[lastToken] = value;
  }
}
