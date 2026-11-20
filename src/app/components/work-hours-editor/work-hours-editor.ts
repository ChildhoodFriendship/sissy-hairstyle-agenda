import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, output, signal, viewChild,
  type AfterViewInit, type OnInit,
} from '@angular/core';

const SLOTS_PER_DAY = 48;
interface Band {
  id: number;
  start: number | null;
  end: number | null; // exclusive; 48 means 24:00, not 00:00 of this day
}

@Component({
  selector: 'app-work-hours-editor',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './work-hours-editor.html',
  styleUrl: './work-hours-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkHoursEditor implements OnInit, AfterViewInit {
  // The host mounts one editor per person/date and owns persistence and dismissal.
  readonly personName = input.required<string>();
  readonly date = input.required<string>();
  readonly slots = input.required<readonly number[]>();
  readonly saving = input(false);
  readonly error = input('');
  readonly saveHours = output<number[]>();
  readonly dismiss = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly destroyRef = inject(DestroyRef);
  private nextId = 0;
  protected readonly bands = signal<Band[]>([]);
  protected readonly boundaries = Array.from({ length: SLOTS_PER_DAY + 1 }, (_, slot) => ({
    slot, label: `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 ? '30' : '00'}`,
  }));
  protected readonly starts = this.boundaries.slice(0, -1);
  protected readonly ends = this.boundaries.slice(1);

  protected readonly selection = computed(() => {
    const slots = new Set<number>();
    for (const [index, { start, end }] of this.bands().entries()) {
      const label = `Fascia ${index + 1}`;
      if (start === null || end === null) return { error: `${label}: scegli l’inizio e la fine.` };
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > SLOTS_PER_DAY || start >= end) {
        return { error: `${label}: la fine deve essere successiva all’inizio nello stesso giorno.` };
      }
      for (let slot = start; slot < end; slot++) {
        if (slots.has(slot)) return { error: `${label}: l’orario si sovrappone a un’altra fascia.` };
        slots.add(slot);
      }
    }
    return { error: '', slots: [...slots].sort((a, b) => a - b) };
  });

  ngOnInit(): void {
    const selected = new Set(this.slots());
    const bands: Band[] = [];
    for (let start = 0; start < SLOTS_PER_DAY; start++) {
      if (!selected.has(start)) continue;
      let end = start + 1;
      while (end < SLOTS_PER_DAY && selected.has(end)) end++;
      bands.push({ id: this.nextId++, start, end });
      start = end - 1;
    }
    this.bands.set(bands);
  }

  ngAfterViewInit(): void {
    const dialog = this.dialog().nativeElement;
    const opener = dialog.ownerDocument.activeElement;
    dialog.showModal();
    this.destroyRef.onDestroy(() => {
      if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    });
  }

  protected addBand(): void {
    this.bands.update(bands => [...bands, { id: this.nextId++, start: null, end: null }]);
  }

  protected removeBand(id: number): void {
    this.bands.update(bands => bands.filter(band => band.id !== id));
  }

  protected editBand(id: number, edge: 'start' | 'end', value: string): void {
    const slot = value === '' ? null : Number(value);
    this.bands.update(bands => bands.map(band => band.id === id ? { ...band, [edge]: slot } : band));
  }

  protected save(): void {
    const slots = this.selection().slots;
    if (!this.saving() && slots !== undefined) this.saveHours.emit([...slots]);
  }

  protected requestDismiss(): void {
    if (!this.saving()) this.dismiss.emit();
  }
}
