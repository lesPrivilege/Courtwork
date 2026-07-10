/**
 * 只读 ZIP 的 EOCD（结束目录记录）与中央目录头，拿到每个 entry 声明的压缩/未压缩大小——
 * 不调用 unzipSync，不触发任何实际解压。这是"解压比例检测必须在解压前完成"这条安全
 * 纪律的字面落点：可疑 zip 在这一步就会被挡下，永远不会进入 fflate 的实际 inflate 路径。
 *
 * 实现用 DataView + TextDecoder，避免依赖 Node Buffer，以便 apps/desktop 浏览器壳可打包。
 */

export class ZipInspectionError extends Error {}

export interface ZipCentralDirectoryEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_LENGTH = 65535;
const ZIP64_SENTINEL_32 = 0xffffffff;
const ZIP64_SENTINEL_16 = 0xffff;
const utf8 = new TextDecoder('utf-8');

function u16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export function readZipCentralDirectory(data: Uint8Array): ZipCentralDirectoryEntry[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const length = data.byteLength;

  let eocdOffset = -1;
  const searchStart = Math.max(0, length - EOCD_MIN_SIZE - MAX_COMMENT_LENGTH);
  for (let i = length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (u32(view, i) === EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new ZipInspectionError('未找到 ZIP 结束目录记录（EOCD），不是合法 zip 文件');
  }

  const totalEntries = u16(view, eocdOffset + 10);
  const centralDirectoryOffset = u32(view, eocdOffset + 16);
  if (centralDirectoryOffset === ZIP64_SENTINEL_32 || totalEntries === ZIP64_SENTINEL_16) {
    throw new ZipInspectionError('检测到 ZIP64 格式哨兵值，本包不支持（普通 docx 不会用到 ZIP64，视为可疑文件）');
  }

  const entries: ZipCentralDirectoryEntry[] = [];
  let pointer = centralDirectoryOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (pointer + 46 > length || u32(view, pointer) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new ZipInspectionError(`中央目录第 ${i} 条记录签名不合法（偏移量 ${pointer}）`);
    }
    const compressedSize = u32(view, pointer + 20);
    const uncompressedSize = u32(view, pointer + 24);
    const nameLength = u16(view, pointer + 28);
    const extraLength = u16(view, pointer + 30);
    const commentLength = u16(view, pointer + 32);
    if (compressedSize === ZIP64_SENTINEL_32 || uncompressedSize === ZIP64_SENTINEL_32) {
      throw new ZipInspectionError('检测到 ZIP64 大小字段哨兵值，本包不支持');
    }
    const nameBytes = data.subarray(pointer + 46, pointer + 46 + nameLength);
    const name = utf8.decode(nameBytes);
    entries.push({ name, compressedSize, uncompressedSize });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export interface ZipBombCheckResult {
  suspicious: boolean;
  detail?: string;
}

export function checkZipBomb(
  entries: ZipCentralDirectoryEntry[],
  limits: { maxDecompressionRatio: number; maxUncompressedBytes: number },
): ZipBombCheckResult {
  let totalUncompressed = 0;
  for (const entry of entries) {
    totalUncompressed += entry.uncompressedSize;
    const ratio = entry.compressedSize === 0 ? entry.uncompressedSize : entry.uncompressedSize / entry.compressedSize;
    if (ratio > limits.maxDecompressionRatio) {
      return {
        suspicious: true,
        detail: `entry ${entry.name} 解压比例 ${ratio.toFixed(1)}:1 超过上限 ${limits.maxDecompressionRatio}:1`,
      };
    }
  }
  if (totalUncompressed > limits.maxUncompressedBytes) {
    return {
      suspicious: true,
      detail: `总解压体积 ${totalUncompressed} 字节超过上限 ${limits.maxUncompressedBytes} 字节`,
    };
  }
  return { suspicious: false };
}
