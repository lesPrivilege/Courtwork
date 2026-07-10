/**
 * 只读 ZIP 的 EOCD（结束目录记录）与中央目录头，拿到每个 entry 声明的压缩/未压缩大小——
 * 不调用 unzipSync，不触发任何实际解压。这是"解压比例检测必须在解压前完成"这条安全
 * 纪律的字面落点：可疑 zip 在这一步就会被挡下，永远不会进入 fflate 的实际 inflate 路径。
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

export function readZipCentralDirectory(data: Uint8Array): ZipCentralDirectoryEntry[] {
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);

  let eocdOffset = -1;
  const searchStart = Math.max(0, buf.length - EOCD_MIN_SIZE - MAX_COMMENT_LENGTH);
  for (let i = buf.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new ZipInspectionError('未找到 ZIP 结束目录记录（EOCD），不是合法 zip 文件');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buf.readUInt32LE(eocdOffset + 16);
  if (centralDirectoryOffset === ZIP64_SENTINEL_32 || totalEntries === ZIP64_SENTINEL_16) {
    throw new ZipInspectionError('检测到 ZIP64 格式哨兵值，本包不支持（普通 docx 不会用到 ZIP64，视为可疑文件）');
  }

  const entries: ZipCentralDirectoryEntry[] = [];
  let pointer = centralDirectoryOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (pointer + 46 > buf.length || buf.readUInt32LE(pointer) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new ZipInspectionError(`中央目录第 ${i} 条记录签名不合法（偏移量 ${pointer}）`);
    }
    const compressedSize = buf.readUInt32LE(pointer + 20);
    const uncompressedSize = buf.readUInt32LE(pointer + 24);
    const nameLength = buf.readUInt16LE(pointer + 28);
    const extraLength = buf.readUInt16LE(pointer + 30);
    const commentLength = buf.readUInt16LE(pointer + 32);
    if (compressedSize === ZIP64_SENTINEL_32 || uncompressedSize === ZIP64_SENTINEL_32) {
      throw new ZipInspectionError('检测到 ZIP64 大小字段哨兵值，本包不支持');
    }
    const name = buf.toString('utf-8', pointer + 46, pointer + 46 + nameLength);
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
