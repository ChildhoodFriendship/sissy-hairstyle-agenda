import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkHoursEditor } from './work-hours-editor';

async function openEditor(slots: number[]) {
  const fixture = TestBed.createComponent(WorkHoursEditor);
  const root: HTMLElement = fixture.nativeElement;
  // jsdom lacks native modal methods. Shim just this element; drive the actual controls below.
  const dialog = root.querySelector('dialog')!;
  if (!dialog.showModal) dialog.showModal = () => { dialog.open = true; };
  if (!dialog.close) dialog.close = () => { dialog.open = false; };

  fixture.componentRef.setInput('personName', 'Giulia Neri');
  fixture.componentRef.setInput('date', '2026-11-20');
  fixture.componentRef.setInput('slots', slots);
  const save = vi.fn();
  const dismiss = vi.fn();
  fixture.componentInstance.saveHours.subscribe(save);
  fixture.componentInstance.dismiss.subscribe(dismiss);
  fixture.detectChanges();
  await fixture.whenStable();

  const button = (text: string) => Array.from(dialog.querySelectorAll('button'))
    .find(item => item.textContent?.trim() === text)!;
  const click = (text: string) => {
    button(text).click();
    fixture.detectChanges();
  };
  const selects = () => Array.from(dialog.querySelectorAll('select'));
  const choose = (index: number, time: string) => {
    const select = selects()[index];
    const option = Array.from(select.options).find(item => item.textContent?.trim() === time)!;
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, dialog, save, dismiss, button, click, selects, choose };
}

describe('WorkHoursEditor', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkHoursEditor] }).compileComponents();
  });

  it('shows only the supplied person, date and split shifts; saving does not mutate the input', async () => {
    const initial = [28, 18, 19, 29];
    const ui = await openEditor(initial);
    expect(ui.dialog.open).toBe(true);
    expect(ui.dialog.textContent).toContain('Giulia Neri');
    expect(ui.dialog.querySelector('time')?.dateTime).toBe('2026-11-20');
    expect(ui.selects().map(item => item.selectedOptions[0].textContent?.trim()))
      .toEqual(['09:00', '10:00', '14:00', '15:00']);
    ui.choose(1, '10:30');
    expect(ui.save).not.toHaveBeenCalled();
    ui.click('Salva orari');
    expect(ui.save).toHaveBeenCalledExactlyOnceWith([18, 19, 20, 28, 29]);
    expect(ui.dismiss).not.toHaveBeenCalled();
    expect(initial).toEqual([28, 18, 19, 29]);
  });

  it('starts empty on a day off and supports the full day, including its final half hour', async () => {
    const ui = await openEditor([]);
    expect(ui.selects()).toHaveLength(0);
    expect(ui.dialog.textContent).toContain('Giorno di riposo');
    ui.click('Aggiungi fascia');
    expect(ui.selects().map(item => item.value)).toEqual(['', '']);
    expect(ui.button('Salva orari').disabled).toBe(true);
    ui.choose(0, '00:00');
    ui.choose(1, '24:00');
    ui.click('Salva orari');
    expect(ui.save).toHaveBeenCalledExactlyOnceWith(Array.from({ length: 48 }, (_, i) => i));
  });

  it('blocks incomplete, reversed, zero-length and overlapping bands; adjacent bands are valid', async () => {
    const ui = await openEditor([20, 21]); // 10:00–11:00
    ui.click('Aggiungi fascia');
    ui.choose(2, '09:00');
    for (const end of [null, '08:30', '09:00', '10:30']) {
      if (end) ui.choose(3, end);
      expect(ui.button('Salva orari').disabled).toBe(true);
      expect(ui.dialog.querySelector('[role="status"]')?.textContent?.trim()).toBeTruthy();
      ui.click('Salva orari');
    }
    expect(ui.save).not.toHaveBeenCalled();
    ui.choose(3, '10:00');
    ui.click('Salva orari');
    expect(ui.save).toHaveBeenCalledExactlyOnceWith([18, 19, 20, 21]);
  });

  it('removes an individual band or marks this entire date off without saving implicitly', async () => {
    const ui = await openEditor([18, 19, 28, 29]);
    ui.dialog.querySelector<HTMLButtonElement>('[aria-label="Rimuovi fascia 1"]')!.click();
    ui.fixture.detectChanges();
    expect(ui.selects().map(item => item.selectedOptions[0].textContent?.trim()))
      .toEqual(['14:00', '15:00']);
    ui.click('Imposta giorno di riposo');
    expect(ui.selects()).toHaveLength(0);
    expect(ui.save).not.toHaveBeenCalled();
    ui.click('Salva orari');
    expect(ui.save).toHaveBeenCalledExactlyOnceWith([]);
  });

  it('lets the parent dismiss via Cancel, Escape or backdrop, but not via an interior click', async () => {
    const ui = await openEditor([18]);
    ui.choose(1, '10:00');
    ui.dialog.querySelector('h2')!.click();
    expect(ui.dismiss).not.toHaveBeenCalled();
    ui.click('Annulla');
    const escape = new Event('cancel', { cancelable: true });
    ui.dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    ui.dialog.click();
    expect(ui.dismiss).toHaveBeenCalledTimes(3);
    expect(ui.save).not.toHaveBeenCalled();
  });

  it('returns keyboard focus to the opener when the parent removes the editor', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    try {
      opener.focus();
      const ui = await openEditor([]);
      ui.button('Annulla').focus();
      ui.fixture.destroy();
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });

  it('locks editing, saving and dismissal while busy, then retains the draft for retry on error', async () => {
    const ui = await openEditor([47]);
    ui.choose(0, '23:00');
    ui.fixture.componentRef.setInput('saving', true);
    ui.fixture.detectChanges();
    expect(ui.selects().every(item => item.matches(':disabled'))).toBe(true);
    expect(ui.button('Annulla').disabled).toBe(true);
    expect(ui.button('Salvataggio…').disabled).toBe(true);
    ui.click('Salvataggio…');
    ui.dialog.click();
    ui.dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(ui.dismiss).not.toHaveBeenCalled();
    expect(ui.save).not.toHaveBeenCalled();
    ui.fixture.componentRef.setInput('saving', false);
    ui.fixture.componentRef.setInput('error', 'Impossibile salvare gli orari.');
    ui.fixture.detectChanges();
    expect(ui.dialog.querySelector('[role="alert"]')?.textContent).toContain('Impossibile salvare gli orari.');
    ui.click('Salva orari');
    expect(ui.save).toHaveBeenCalledExactlyOnceWith([46, 47]);
  });
});
