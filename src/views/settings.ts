import { Dexie } from 'dexie';
import { z } from 'zod';
import { DB_NAME, db } from '../db/flashcardsDb';
import type { Attempt, CardSchedulingState, ExamResult } from '../types/runtime';

export const USER_DATA_EXPORT_VERSION = 1 as const;

const looseRecord = z.record(z.string(), z.unknown());

const importBundleSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string().optional(),
  cardSchedulingState: z.array(looseRecord),
  attempts: z.array(looseRecord),
  examResults: z.array(looseRecord),
});

export async function renderSettings(outlet: HTMLElement): Promise<void> {
  outlet.replaceChildren();

  const section = document.createElement('section');
  section.className = 'view view-settings';
  const h2 = document.createElement('h2');
  h2.textContent = 'Settings';
  section.appendChild(h2);

  const p = document.createElement('p');
  p.textContent =
    'All study progress and exam history are stored locally in your browser. Export regularly if you want a backup.';
  section.appendChild(p);

  const actions = document.createElement('div');
  actions.className = 'settings-actions';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Export user data (JSON)';
  exportBtn.addEventListener('click', () => void exportUserData());
  actions.appendChild(exportBtn);

  const importLabel = document.createElement('label');
  importLabel.className = 'import-label';
  importLabel.textContent = 'Import user data ';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.addEventListener('change', () => void handleImportFile(fileInput));
  importLabel.appendChild(fileInput);
  actions.appendChild(importLabel);

  const wipeBtn = document.createElement('button');
  wipeBtn.type = 'button';
  wipeBtn.textContent = 'Wipe all local data';
  wipeBtn.className = 'btn-danger';
  wipeBtn.addEventListener('click', () => void wipeAllData());
  actions.appendChild(wipeBtn);

  section.appendChild(actions);

  const back = document.createElement('p');
  const a = document.createElement('a');
  a.href = '#/';
  a.textContent = '← Home';
  back.appendChild(a);
  section.appendChild(back);

  outlet.appendChild(section);
}

async function exportUserData(): Promise<void> {
  const [cardSchedulingState, attempts, examResults] = await Promise.all([
    db.cardSchedulingState.toArray(),
    db.attempts.toArray(),
    db.examResults.toArray(),
  ]);

  const bundle = {
    schemaVersion: USER_DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    cardSchedulingState,
    attempts,
    examResults,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flashcards-user-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImportFile(input: HTMLInputElement): Promise<void> {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  let text: string;
  try {
    text = await file.text();
  } catch {
    alert('Could not read file.');
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    alert('Invalid JSON.');
    return;
  }

  const result = importBundleSchema.safeParse(parsed);
  if (!result.success) {
    alert('File does not match the expected export format.');
    return;
  }

  if (
    !confirm(
      'Replace all local progress with this file? This cannot be undone (unless you exported first).',
    )
  ) {
    return;
  }

  try {
    await db.transaction(
      'rw',
      db.cardSchedulingState,
      db.attempts,
      db.examResults,
      async () => {
        await db.cardSchedulingState.clear();
        await db.attempts.clear();
        await db.examResults.clear();
        if (result.data.cardSchedulingState.length) {
          await db.cardSchedulingState.bulkAdd(
            result.data.cardSchedulingState as unknown as CardSchedulingState[],
          );
        }
        if (result.data.attempts.length) {
          await db.attempts.bulkAdd(result.data.attempts as unknown as Attempt[]);
        }
        if (result.data.examResults.length) {
          await db.examResults.bulkAdd(result.data.examResults as unknown as ExamResult[]);
        }
      },
    );
    alert('Import complete.');
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Import failed.');
  }
}

async function wipeAllData(): Promise<void> {
  if (
    !confirm(
      'Delete all study progress, attempts, and exam history from this browser?',
    )
  ) {
    return;
  }
  await db.close();
  await Dexie.delete(DB_NAME);
  window.location.reload();
}
