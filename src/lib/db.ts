// ============================================================
// IndexedDB Layer (Dexie) — للبيانات التقيلة اللي متعملهاش
// localStorage: ملفات PDF (Blobs)، Highlights، Notes.
// (بند 22-26) — الـ appState الأساسي (progress/vocab/sessions/
// carryover) لسه في localStorage لأنه صغير أصلًا وشغال كويس.
// ============================================================
import Dexie, { type Table } from 'dexie';
import type { PdfHighlight, PdfNote } from '../types';

export interface StoredPdfFile {
  sourceId: string;   // primary key — مصدر واحد = ملف واحد
  blob: Blob;
  fileName: string;
  size: number;
  addedAt: number;
}

class MassarDB extends Dexie {
  pdfFiles!: Table<StoredPdfFile, string>;
  pdfHighlights!: Table<PdfHighlight, string>;
  pdfNotes!: Table<PdfNote, string>;

  constructor() {
    super('massar-db');
    this.version(1).stores({
      pdfFiles: 'sourceId, addedAt',
      pdfHighlights: 'id, sourceId, page, [sourceId+page]',
      pdfNotes: 'id, sourceId, page, [sourceId+page]'
    });
  }
}

export const db = new MassarDB();

// ---------------- PDF Files ----------------
export async function savePdfFile(sourceId: string, file: File | Blob, fileName: string): Promise<boolean> {
  try {
    await db.pdfFiles.put({ sourceId, blob: file, fileName, size: file.size, addedAt: Date.now() });
    return true;
  } catch (e) {
    console.error('savePdfFile failed:', e);
    return false;
  }
}

export async function getPdfFile(sourceId: string): Promise<StoredPdfFile | undefined> {
  try {
    return await db.pdfFiles.get(sourceId);
  } catch (e) {
    console.error('getPdfFile failed:', e);
    return undefined;
  }
}

export async function deletePdfFile(sourceId: string): Promise<void> {
  try { await db.pdfFiles.delete(sourceId); } catch (e) { console.error('deletePdfFile failed:', e); }
}

// ---------------- Highlights ----------------
export async function saveHighlight(h: PdfHighlight): Promise<boolean> {
  try { await db.pdfHighlights.put(h); return true; } catch (e) { console.error('saveHighlight failed:', e); return false; }
}

export async function getHighlightsForSource(sourceId: string): Promise<PdfHighlight[]> {
  try { return await db.pdfHighlights.where('sourceId').equals(sourceId).toArray(); }
  catch (e) { console.error('getHighlightsForSource failed:', e); return []; }
}

export async function getHighlightsForPage(sourceId: string, page: number): Promise<PdfHighlight[]> {
  try { return await db.pdfHighlights.where('[sourceId+page]').equals([sourceId, page]).toArray(); }
  catch (e) { console.error('getHighlightsForPage failed:', e); return []; }
}

export async function deleteHighlight(id: string): Promise<void> {
  try { await db.pdfHighlights.delete(id); } catch (e) { console.error('deleteHighlight failed:', e); }
}

// ---------------- Notes ----------------
export async function saveNote(n: PdfNote): Promise<boolean> {
  try { await db.pdfNotes.put(n); return true; } catch (e) { console.error('saveNote failed:', e); return false; }
}

export async function getNotesForSource(sourceId: string): Promise<PdfNote[]> {
  try { return await db.pdfNotes.where('sourceId').equals(sourceId).toArray(); }
  catch (e) { console.error('getNotesForSource failed:', e); return []; }
}

export async function deleteNote(id: string): Promise<void> {
  try { await db.pdfNotes.delete(id); } catch (e) { console.error('deleteNote failed:', e); }
}

/** حذف كل بيانات مصدر PDF مع بعض في Transaction واحدة (بند 25) — تُستخدم عند حذف المصدر نفسه */
export async function deleteAllPdfDataForSource(sourceId: string): Promise<void> {
  try {
    await db.transaction('rw', db.pdfFiles, db.pdfHighlights, db.pdfNotes, async () => {
      await db.pdfFiles.delete(sourceId);
      await db.pdfHighlights.where('sourceId').equals(sourceId).delete();
      await db.pdfNotes.where('sourceId').equals(sourceId).delete();
    });
  } catch (e) {
    console.error('deleteAllPdfDataForSource failed:', e);
  }
}

/** تصدير Metadata فقط (بدون الـ Blobs الكبيرة) — للاستخدام في Backup (بند 29) */
export async function exportPdfMetadata(): Promise<{ highlights: PdfHighlight[]; notes: PdfNote[]; files: { sourceId: string; fileName: string; size: number }[] }> {
  try {
    const [highlights, notes, files] = await Promise.all([
      db.pdfHighlights.toArray(),
      db.pdfNotes.toArray(),
      db.pdfFiles.toArray()
    ]);
    return { highlights, notes, files: files.map(f => ({ sourceId: f.sourceId, fileName: f.fileName, size: f.size })) };
  } catch (e) {
    console.error('exportPdfMetadata failed:', e);
    return { highlights: [], notes: [], files: [] };
  }
}

/** استيراد الـ Highlights/Notes بس (مش الـ Blobs — المستخدم لازم يرفع الـ PDF تاني) */
export async function importPdfMetadata(data: { highlights?: PdfHighlight[]; notes?: PdfNote[] }): Promise<void> {
  try {
    await db.transaction('rw', db.pdfHighlights, db.pdfNotes, async () => {
      if (data.highlights?.length) await db.pdfHighlights.bulkPut(data.highlights);
      if (data.notes?.length) await db.pdfNotes.bulkPut(data.notes);
    });
  } catch (e) {
    console.error('importPdfMetadata failed:', e);
  }
}
