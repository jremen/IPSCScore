/**
 * Minimal Microsoft Cabinet (.cab) reader for the browser/WebView runtime.
 *
 * WinMSS exports .cab files as real Microsoft Cabinet archives (`MSCF`), not
 * ZIP files. The XML payloads are usually stored uncompressed, but some
 * Windows tools write MSZIP-compressed folders, so both are supported here.
 *
 * Mirrors `backend/src/utils/cabArchive.ts` but works on `Uint8Array` and uses
 * fflate instead of `node:zlib`, so the same archive can be read on a phone.
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

import { inflateSync } from 'fflate';

const CAB_SIGNATURE = 'MSCF';
const FLAG_RESERVE_PRESENT = 0x0004;
const ATTR_NAME_IS_UTF = 0x0080;

const COMPRESSION_NONE = 0;
const COMPRESSION_MSZIP = 1;

export interface CabEntry {
  name: string;
  data: Uint8Array;
}

function readU16(data: Uint8Array, offset: number): number {
  if (offset + 2 > data.length) throw new Error('CAB file is truncated');
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(offset, true);
}

function readU32(data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) throw new Error('CAB file is truncated');
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}

function readU8(data: Uint8Array, offset: number): number {
  if (offset + 1 > data.length) throw new Error('CAB file is truncated');
  return data[offset];
}

async function inflateBlock(payload: Uint8Array, dictionary: Uint8Array): Promise<Uint8Array> {
  if (dictionary.length === 0) {
    return inflateSync(payload);
  }
  try {
    return inflateSync(payload, { dictionary });
  } catch (err) {
    // A block that did not actually reference the dictionary still
    // decompresses without it; retry once before failing.
    try {
      return inflateSync(payload);
    } catch {
      throw err;
    }
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/**
 * Concatenate a folder's CFDATA blocks, decompressing as required.
 * MSZIP blocks are independent DEFLATE streams that may reference the
 * preceding 32 KiB of the folder as a preset dictionary.
 */
async function readFolderData(
  data: Uint8Array,
  startOffset: number,
  blockCount: number,
  compression: number,
  dataReserveSize: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let dictionary: Uint8Array = new Uint8Array(0);
  let offset = startOffset;

  for (let i = 0; i < blockCount; i++) {
    const cbData = readU16(data, offset + 4);
    const cbUncomp = readU16(data, offset + 6);
    const dataStart = offset + 8 + dataReserveSize;
    const dataEnd = dataStart + cbData;
    if (dataEnd > data.length) throw new Error('CAB data block is truncated');
    const compressed = data.subarray(dataStart, dataEnd);

    let output: Uint8Array;
    if (compression === COMPRESSION_NONE) {
      output = compressed;
    } else if (compression === COMPRESSION_MSZIP) {
      if (compressed.length < 2 || compressed[0] !== 0x43 || compressed[1] !== 0x4b) {
        throw new Error('Invalid MSZIP block signature in CAB');
      }
      output = await inflateBlock(compressed.subarray(2), dictionary);
    } else {
      throw new Error(
        `Unsupported CAB compression type ${compression}. WinMSS CABs must be uncompressed or MSZIP.`,
      );
    }

    if (cbUncomp !== 0 && output.length !== cbUncomp) {
      throw new Error(`CAB block decompressed to ${output.length} bytes, expected ${cbUncomp}`);
    }

    chunks.push(output);
    const combined = concat([dictionary, output]);
    dictionary = combined.length > 32768 ? combined.subarray(combined.length - 32768) : combined;
    offset = dataEnd;
  }

  return concat(chunks);
}

/** Extract every file entry from a Microsoft Cabinet archive. */
export async function extractCabEntries(data: Uint8Array): Promise<CabEntry[]> {
  if (data.length < 36 || String.fromCharCode(...data.subarray(0, 4)) !== CAB_SIGNATURE) {
    throw new Error('Not a Microsoft Cabinet (MSCF) archive');
  }

  const coffFiles = readU32(data, 16);
  const cFolders = readU16(data, 26);
  const cFiles = readU16(data, 28);
  const flags = readU16(data, 30);

  let headerEnd = 36;
  let folderReserveSize = 0;
  let dataReserveSize = 0;
  if (flags & FLAG_RESERVE_PRESENT) {
    const cbCFHeader = readU16(data, 36);
    folderReserveSize = readU8(data, 38);
    dataReserveSize = readU8(data, 39);
    headerEnd = 40 + cbCFHeader;
  }

  const folderEntrySize = 8 + folderReserveSize;
  const folders: Array<{ dataStart: number; blockCount: number; compression: number }> = [];
  for (let i = 0; i < cFolders; i++) {
    const offset = headerEnd + i * folderEntrySize;
    folders.push({
      dataStart: readU32(data, offset),
      blockCount: readU16(data, offset + 4),
      compression: readU16(data, offset + 6) & 0x000f,
    });
  }

  const folderData: Uint8Array[] = [];
  for (const folder of folders) {
    folderData.push(
      await readFolderData(data, folder.dataStart, folder.blockCount, folder.compression, dataReserveSize),
    );
  }

  const entries: CabEntry[] = [];
  let offset = coffFiles;
  for (let i = 0; i < cFiles; i++) {
    const cbFile = readU32(data, offset);
    const folderOffset = readU32(data, offset + 4);
    const folderIndex = readU16(data, offset + 8);
    const attribs = readU16(data, offset + 14);
    const nameStart = offset + 16;

    let nameEnd = nameStart;
    while (nameEnd < data.length && data[nameEnd] !== 0) nameEnd++;
    if (nameEnd >= data.length) throw new Error('CAB file name is truncated');

    const nameBytes = data.subarray(nameStart, nameEnd);
    const name = new TextDecoder((attribs & ATTR_NAME_IS_UTF) ? 'utf-8' : 'latin1').decode(nameBytes);

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

export function isMicrosoftCab(data: Uint8Array): boolean {
  return data.length >= 4 && String.fromCharCode(...data.subarray(0, 4)) === CAB_SIGNATURE;
}

export function isZipArchive(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b;
}
