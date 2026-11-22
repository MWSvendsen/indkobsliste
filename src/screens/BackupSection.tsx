import { Download, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { db } from '../data/db';
import { backupFileName, exportData, importData, parseBackup, summarize, type Backup } from '../domain/backup';
import { Sheet } from '../ui/Sheet';
import { useRun, useToast } from '../ui/useToast';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Gemmer en fil: delingsarket på iPhone (så den kan lægges i Filer), ellers en almindelig download. */
async function saveFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Falder tilbage til download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Eksportér og importér data under Varer. */
export function BackupSection() {
  const run = useRun();
  const flash = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  const doExport = () =>
    run(async () => {
      const backup = await exportData(db);
      const file = new File([JSON.stringify(backup, null, 2)], backupFileName(), { type: 'application/json' });
      const result = await saveFile(file);
      if (result !== 'cancelled') flash(result === 'shared' ? 'Backup er klar' : `${file.name} er hentet`);
    });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // samme fil kan vælges igen
    if (!file) return;
    const backup = await run(async () => parseBackup(await file.text()));
    if (backup) setPending(backup);
  };

  const doImport = async () => {
    if (!pending) return;
    await run(() => importData(db, pending), () => 'Data er importeret');
    setPending(null);
  };

  const summary = pending && summarize(pending);

  return (
    <section className="backup" aria-labelledby="backup-head">
      <h2 id="backup-head" className="group__head">
        Backup
      </h2>
      <p className="hint">
        Data ligger kun på denne telefon. Eksportér en gang imellem, så I har en kopi, hvis Safari rydder op.
      </p>
      <div className="backup__actions">
        <button type="button" className="btn-plain btn-icon" onClick={doExport}>
          <Download size={18} strokeWidth={2.2} aria-hidden="true" />
          Eksportér data
        </button>
        <button type="button" className="btn-plain btn-icon" onClick={() => fileInput.current?.click()}>
          <Upload size={18} strokeWidth={2.2} aria-hidden="true" />
          Importér data
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Vælg backup-fil"
          onChange={onFile}
        />
      </div>

      {pending && summary && (
        <Sheet
          title="Importér data?"
          onClose={() => setPending(null)}
          compact
          footer={
            <div className="sheet__actions">
              <button type="button" className="btn-danger" onClick={doImport}>
                Erstat med backup
              </button>
              <button type="button" className="btn-outline" onClick={() => setPending(null)}>
                Annuller
              </button>
            </div>
          }
        >
          <p className="lead">
            Backuppen fra {new Date(pending.exportedAt).toLocaleString('da-DK', { dateStyle: 'long', timeStyle: 'short' })}{' '}
            har {count(summary.items, 'vare', 'varer')}, {count(summary.recipes, 'ret', 'retter')} og{' '}
            {count(summary.listEntries, 'linje', 'linjer')} på listen. Alt, der er på telefonen nu, bliver erstattet.
          </p>
        </Sheet>
      )}
    </section>
  );
}
