import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  type AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialog implements AfterViewInit {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly dark = input(false);
  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const dialog = this.dialog().nativeElement;
    const opener = dialog.ownerDocument.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    this.destroyRef.onDestroy(() => {
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      if (typeof HTMLElement !== 'undefined' && opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    });
  }

  protected requestDismiss(event: Event): void {
    event.preventDefault();
    this.dismissed.emit();
  }

  protected dismissOnBackdrop(event: MouseEvent, dialog: HTMLDialogElement): void {
    if (event.target === dialog) this.dismissed.emit();
  }
}
