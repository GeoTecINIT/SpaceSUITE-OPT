import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ClickOutsideDirective } from '../../directives/clickOutside.directive';

@Component({
  standalone: true,
  selector: 'text-chips',
  templateUrl: './textChips.component.html',
  styleUrls: ['./textChips.component.css'],
  imports: [
    InputTextModule,
    FloatLabelModule,
    FormsModule,
    InputIconModule,
    IconFieldModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    ClickOutsideDirective,
  ],
})
export class TextChipsComponent {
  @Input() chips: string[] = [];
  @Output() chipsChange: EventEmitter<string[]> = new EventEmitter<string[]>();

  currentText: string = '';

  @Input() fieldName: string = 'Field Name';
  @Input() icon: string = 'pi pi-users';

  @Input() error: boolean = false;

  @ViewChild('component', { static: true }) containerRef!: ElementRef;

  chipAnimations: Record<string, boolean> = {};

  ngOnInit() {
    this.chips.forEach((chip) => {
      this.chipAnimations[chip] = false;
    });
  }

  clickButton() {
    const inputValue: string = this.currentText.trim();
    if (inputValue !== '' && !this.chips.includes(inputValue)) {
      this.chipsChange.emit(this.chips.concat(inputValue));
      this.chipAnimations[inputValue] = false;
    } else if (inputValue !== '') {
      this.chipAnimations[inputValue] = true;
      setTimeout(() => {
        this.chipAnimations[inputValue] = false;
      }, 800);
    }
    this.currentText = '';
  }

  deleteElement(element: string) {
    if (this.chips.includes(element)) {
      this.chipsChange.emit(this.chips.filter((value) => value !== element));
    }

    delete this.chipAnimations[element];
  }

  focusOut(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const isInside =
      relatedTarget && this.containerRef.nativeElement.contains(relatedTarget);
    setTimeout(() => {
      if (!isInside) this.currentText = '';
    }, 100);
  }
}
