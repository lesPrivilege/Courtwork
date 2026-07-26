import { preflightDocx } from '@courtwork/reading-view/docx-security';
import { Buffer } from 'buffer';
import { zipSync, strToU8, strFromU8, type Zippable } from 'fflate';

export type DocxFiles = Record<string, Uint8Array>;

export function loadDocx(buf: Uint8Array | Buffer): DocxFiles {
  return preflightDocx(new Uint8Array(buf)).files;
}

export function getText(files: DocxFiles, path: string): string {
  const entry = files[path];
  if (!entry) {
    throw new Error(`docx 内缺少必需部件：${path}`);
  }
  return strFromU8(entry);
}

export function setText(files: DocxFiles, path: string, text: string): void {
  files[path] = strToU8(text);
}

/** ZIP DOS date/time 的可表示范围；两端都以 UTC instant 判定，越界不静默 clamp。 */
export const ZIP_TIMESTAMP_MIN_MS = Date.UTC(1980, 0, 1, 0, 0, 0, 0);
export const ZIP_TIMESTAMP_MAX_MS = Date.UTC(2100, 0, 1, 0, 0, 0, 0);

/**
 * ZIP entry 时间越出 DOS 可表示范围。静默 clamp 会让产物时间与授权账本时间不再是同一件事，
 * 故一律 typed 阻断、零 ZIP。
 */
export class InvalidZipTimestampError extends Error {
  readonly code = 'invalid_zip_timestamp' as const;
  readonly instant?: string;
  constructor(instant?: string) {
    super(
      `ZIP 时间 ${instant ?? '(无效日期)'} 超出可表示范围 ` +
        `[1980-01-01T00:00:00.000Z, 2100-01-01T00:00:00.000Z)`,
    );
    this.name = 'InvalidZipTimestampError';
    this.instant = instant;
  }
}

/**
 * 把 UTC 年/月/日/时/分/秒编码为 packed DOS date/time（高 16 位 date、低 16 位 time）。
 *
 * 纯函数、只读 UTC 字段：fflate 0.8.3 读的是 Date 的**本地**字段，直接交给它会随宿主时区漂移
 * （纽约 DST gap 尤甚）。毫秒归零、秒向下归一到 2 秒刻度，是 DOS 时间本身的精度，不是降级。
 */
export function packedDosDateTime(now: Date): number {
  const ms = now.getTime();
  if (!Number.isFinite(ms)) throw new InvalidZipTimestampError(undefined);
  if (ms < ZIP_TIMESTAMP_MIN_MS || ms >= ZIP_TIMESTAMP_MAX_MS) {
    throw new InvalidZipTimestampError(now.toISOString());
  }
  const dosTime =
    (now.getUTCHours() << 11) | (now.getUTCMinutes() << 5) | (Math.floor(now.getUTCSeconds() / 2) & 0x1f);
  const dosDate =
    ((now.getUTCFullYear() - 1980) << 9) | ((now.getUTCMonth() + 1) << 5) | now.getUTCDate();
  return (((dosDate << 16) >>> 0) | dosTime) >>> 0;
}

/**
 * 固定、区间内的 placeholder：只为让 fflate 产出结构完整的 ZIP，随后每个 header 都被覆写。
 * 取 UTC 正午，使任一宿主时区下的本地字段都仍落在 DOS 可表示范围内。
 */
const PLACEHOLDER_MTIME = new Date(Date.UTC(1980, 0, 2, 12, 0, 0, 0));

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const EOCD_MIN_SIZE = 22;

/**
 * 结构化遍历中央目录并覆写每个 central-directory header 与其对应 local header 的 packed 时间。
 *
 * 走中央目录而不是全盘扫签名：压缩流里可能出现同样的四字节，按签名瞎扫会改坏数据。
 */
function stampZipTimestamps(zip: Uint8Array, packed: number): Uint8Array {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let eocd = -1;
  for (let i = zip.byteLength - EOCD_MIN_SIZE; i >= 0; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP 缺少中央目录结尾记录，无法写入确定性时间');

  const entryCount = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  for (let entry = 0; entry < entryCount; entry++) {
    if (view.getUint32(cursor, true) !== CENTRAL_HEADER_SIGNATURE) {
      throw new Error('ZIP 中央目录条目签名不符，拒绝写入确定性时间');
    }
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    view.setUint32(cursor + 12, packed, true);

    if (view.getUint32(localOffset, true) !== LOCAL_HEADER_SIGNATURE) {
      throw new Error('ZIP 本地头签名不符，拒绝写入确定性时间');
    }
    view.setUint32(localOffset + 10, packed, true);

    cursor += 46 + nameLen + extraLen + commentLen;
  }
  return zip;
}

/**
 * `now` 必填：production 合同审查批注稿的每个 ZIP entry mtime 都取已持久的确认时刻，
 * 使同一 session 跨秒、跨时区、跨重启重编译 byte-identical。泛用 draft 编译器传当前时间即可。
 */
export function saveDocx(files: DocxFiles, now: Date): Buffer {
  const packed = packedDosDateTime(now);
  // level: 6 是标准 deflate 的常见平衡点。docx 里 word/styles.xml 之类的样板部件体积不小
  // 但高度可压缩——不压缩会把典型文档的产出体积从几十 KB 撑到近 1MB。
  const zippable: Zippable = {};
  for (const [name, bytes] of Object.entries(files)) {
    zippable[name] = [bytes, { level: 6, mtime: PLACEHOLDER_MTIME }];
  }
  return Buffer.from(stampZipTimestamps(zipSync(zippable, { level: 6 }), packed));
}
