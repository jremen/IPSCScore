/**
 * Minimal Microsoft Cabinet (.cab) reader.
 *
 * WinMSS exports .cab files as real Microsoft Cabinet archives (`MSCF`),
 * not ZIP files. The XML payloads are usually stored uncompressed, but some
 * Windows tools write MSZIP-compressed folders, so both are supported here.
 *
 * Only the pieces needed to read a CAB are implemented:
 *   - CFHEADER / optional reserve area
 *   - CFFOLDER
 *   - CFDATA blocks (compression type 0 = none, 1 = MSZIP)
 *   - CFFILE directory entries
 *
 * LZX/Quantum-compressed cabinets are rejected with a clear error rather than
 * silently producing corrupt XML.
 */

import { inflateRawSync } from 'node:zlib';

const CAB_SIGNATURE = 'MSCF';
const FLAG_RESERVE_PRESENT = 0x0004;
const ATTR_NAME_IS_UTF = 0x0080;

const COMPRESSION_NONE = 0;
const COMPRESSION_MSZIP = 1;

export interface CabEntry {
  name: string;
  data: Buffer;
}

function readU16(buffer: Buffer, offset: number): number {
  if (offset + 2 > buffer.length) throw new Error('CAB file is truncated');
  return buffer.readUInt16LE(offset);
}

function readU32(buffer: Buffer, offset: number): number {
  if (offset + 4 > buffer.length) throw new Error('CAB file is truncated');
  return buffer.readUInt32LE(offset);
}

function readU8(buffer: Buffer, offset: number): number {
  if (offset + 1 > buffer.length) throw new Error('CAB file is truncated');
  return buffer.readUInt8(offset);
}

/**
 * Concatenate a folder's CFDATA blocks, decompressing as required.
 * MSZIP blocks are independent DEFLATE streams that may reference the
 * preceding 32 KiB of the folder as a preset dictionary.
 */
function readFolderData(
  buffer: Buffer,
  startOffset: number,
  blockCount: number,
  compression: number,
  dataReserveSize: number,
): Buffer {
  const chunks: Buffer[] = [];
  let dictionary = Buffer.alloc(0);
  let offset = startOffset;

  for (let i = 0; i < blockCount; i++) {
    const checksum = readU32(buffer, offset);
    void checksum;
    const cbData = readU16(buffer, offset + 4);
    const cbUncomp = readU16(buffer, offset + 6);
    const dataStart = offset + 8 + dataReserveSize;
    const dataEnd = dataStart + cbData;
    if (dataEnd > buffer.length) throw new Error('CAB data block is truncated');
    const compressed = buffer.subarray(dataStart, dataEnd);

    let output: Buffer;
    if (compression === COMPRESSION_NONE) {
      output = compressed;
    } else if (compression === COMPRESSION_MSZIP) {
      if (compressed.length < 2 || compressed[0] !== 0x43 || compressed[1] !== 0x4b) {
        throw new Error('Invalid MSZIP block signature in CAB');
      }
      const payload = compressed.subarray(2);
      try {
        output = inflateRawSync(payload, dictionary.length > 0 ? { dictionary } : undefined);
      } catch (err: any) {
        // A block that did not actually reference the dictionary still
        // decompresses without it; retry once before failing.
        if (dictionary.length === 0) throw err;
        output = inflateRawSync(payload);
      }
    } else {
      throw new Error(
        `Unsupported CAB compression type ${compression}. WinMSS CABs must be uncompressed or MSZIP.`,
      );
    }

    if (cbUncomp !== 0 && output.length !== cbUncomp) {
      throw new Error(`CAB block decompressed to ${output.length} bytes, expected ${cbUncomp}`);
    }

    chunks.push(output);
    const combined = Buffer.concat([dictionary, output]);
    dictionary = combined.length > 32768 ? combined.subarray(combined.length - 32768) : combined;
    offset = dataEnd;
  }

  return Buffer.concat(chunks);
}

/** Extract every file entry from a Microsoft Cabinet archive. */
export function extractCabEntries(buffer: Buffer): CabEntry[] {
  if (buffer.length < 36 || buffer.subarray(0, 4).toString('ascii') !== CAB_SIGNATURE) {
    throw new Error('Not a Microsoft Cabinet (MSCF) archive');
  }

  const coffFiles = readU32(buffer, 16);
  const versionMinor = readU8(buffer, 24);
  const versionMajor = readU8(buffer, 25);
  void versionMinor;
  void versionMajor;
  const cFolders = readU16(buffer, 26);
  const cFiles = readU16(buffer, 28);
  const flags = readU16(buffer, 30);

  let headerEnd = 36;
  let folderReserveSize = 0;
  let dataReserveSize = 0;
  if (flags & FLAG_RESERVE_PRESENT) {
    const cbCFHeader = readU16(buffer, 36);
    folderReserveSize = readU8(buffer, 38);
    dataReserveSize = readU8(buffer, 39);
    headerEnd = 40 + cbCFHeader;
  }

  const folderEntrySize = 8 + folderReserveSize;
  const folders: Array<{ dataStart: number; blockCount: number; compression: number }> = [];
  for (let i = 0; i < cFolders; i++) {
    const offset = headerEnd + i * folderEntrySize;
    folders.push({
      dataStart: readU32(buffer, offset),
      blockCount: readU16(buffer, offset + 4),
      compression: readU16(buffer, offset + 6) & 0x000f,
    });
  }

  const folderData = folders.map((folder) =>
    readFolderData(buffer, folder.dataStart, folder.blockCount, folder.compression, dataReserveSize),
  );

  const entries: CabEntry[] = [];
  let offset = coffFiles;
  for (let i = 0; i < cFiles; i++) {
    const cbFile = readU32(buffer, offset);
    const folderOffset = readU32(buffer, offset + 4);
    const folderIndex = readU16(buffer, offset + 8);
    const attribs = readU16(buffer, offset + 14);
    const nameStart = offset + 16;

    let nameEnd = nameStart;
    while (nameEnd < buffer.length && buffer[nameEnd] !== 0) nameEnd++;
    if (nameEnd >= buffer.length) throw new Error('CAB file name is truncated');

    const nameBytes = buffer.subarray(nameStart, nameEnd);
    const name = (attribs & ATTR_NAME_IS_UTF)
      ? nameBytes.toString('utf8')
      : nameBytes.toString('latin1');

    const folder = folderData[folderIndex];
    if (!folder) throw new Error(`CAB file "${name}" references missing folder ${folderIndex}`);
    if (folderOffset + cbFile > folder.length) {
      throw new Error(`CAB file "${name}" extends beyond its folder data`);
    }

    entries.push({
      name: name.replace(/\\/g, '/'),
      data: folder.subarray(folderOffset, folderOffset + cbFile),
    });

    offset = nameEnd + 1;
  }

  return entries;
}

export function isMicrosoftCab(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === CAB_SIGNATURE;
}

export function isZipArchive(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}
