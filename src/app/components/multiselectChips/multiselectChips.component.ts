import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { MultiSelect, MultiSelectModule } from 'primeng/multiselect';
import { CardFilterService } from '../../services/cardFilter.service';
import { FieldsService } from '../../services/fields.service';
import { UtilsService } from '../../services/utils.service';

@Component({
  standalone: true,
  selector: 'multiselect-chips',
  templateUrl: './multiselectChips.component.html',
  styleUrls: ['./multiselectChips.component.css'],
  imports: [
    FloatLabelModule,
    FormsModule,
    IconFieldModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    MultiSelectModule,
  ],
})
export class MultiselectChipsComponent {
  @Input() optionsSource: string = 'filters';
  @Input() allowCustom: boolean = true;

  @Input() chips: string[] = [];
  @Input() optionsName: string = '';
  @Output() chipsChange: EventEmitter<string[]> = new EventEmitter();

  currentText: string = '';
  multiSelection: string[] = [];
  multiselectOptions: any[] = [];

  @Input() fieldName: string = 'Field Name';
  @Input() icon: string = 'pi pi-users';
  @Input() error: boolean = false;
  @Input() filter: boolean = true;

  @ViewChild('pmulti', { read: MultiSelect }) multiSelectEl!: MultiSelect;

  chipAnimations: Record<string, boolean> = {};
  selectedConceptsColor: Map<string, string> = new Map();

  constructor(
    private filterService: CardFilterService,
    private utilsService: UtilsService,
    private bokInfo: BokInformationService,
    private fieldsService: FieldsService
  ) {}

  ngOnInit() {
    if (this.optionsSource === 'filters') {
      this.filterService
        .getOptionByLabel(this.optionsName)
        .subscribe(
          (filterOption) =>
            (this.multiselectOptions = filterOption.values
              .filter((value) => value !== 'Other')
              .map((v) => ({ label: v, value: v })))
        );
    } else if (this.optionsSource === 'fields') {
      this.fieldsService.getFields().subscribe((fields) => {
        const groups = new Map<string, any[]>();

        fields.forEach((field) => {
          if (!groups.has(field.grandparent)) {
            groups.set(field.grandparent, []);
          }
          groups.get(field.grandparent)!.push({
            label: field.name,
            value: field.name,
          });
        });

        this.multiselectOptions = Array.from(groups, ([label, items]) => ({
          label,
          items,
        }));
      });
    }

    this.chips.forEach((chip) => {
      this.chipAnimations[chip] = false;
      this.getBackgroundColor(chip);
    });
  }

  getBackgroundColor(chip: string) {
    const chipCode = this.utilsService.knowledgeAreaToCode.get(chip);
    if (chipCode !== undefined) {
      this.bokInfo.getConceptColor(chipCode).subscribe((color) => {
        const softColor = color
          ? this.utilsService.convertHexToRgba(color, 0.5)
          : '';
        this.selectedConceptsColor.set(chip, softColor);
      });
    }
  }

  onDropdownOpen() {
    setTimeout(() => {
      const input = document.querySelector(
        '.p-multiselect-filter-container .p-inputtext'
      ) as HTMLInputElement | null;
      if (input) {
        const keyHandler = (event: KeyboardEvent) => {
          if (event.key === 'Enter' && this.allowCustom) {
            input.removeEventListener('keyup', keyHandler);
            this.clickButton();
          }
        };
        input.addEventListener('keyup', keyHandler);
      }
    }, 20);
  }

  clickButton() {
    if (!this.allowCustom) return;
    const inputValue: string = this.currentText.trim();
    if (inputValue !== '' && !this.chips.includes(inputValue)) {
      this.chipsChange.emit(this.chips.concat(inputValue));
    } else if (inputValue !== '') {
      this.chipAnimations[inputValue] = true;
      setTimeout(() => {
        this.chipAnimations[inputValue] = false;
      }, 800);
    }
    this.currentText = '';
    this.multiSelectEl.hide();
  }

  deleteElement(element: string) {
    this.multiSelection = this.multiSelection.filter(
      (value) => value !== element
    );
    this.chipsChange.emit(this.chips.filter((value) => value !== element));
  }

  multiselectChange(values: string[]) {
    this.multiSelection = values || [];
    const include = this.multiSelection.filter(
      (value) => !this.chips.includes(value)
    );
    include.forEach((chip) => this.getBackgroundColor(chip));
    let exclude: string[] = [];
    if (this.optionsSource === 'fields') {
      exclude = this.chips.filter(
        (value) =>
          !this.multiSelection.includes(value) &&
          this.multiselectOptions
            .map((x) => x.items)
            .some((array) => array.map((y: any) => y.value).includes(value))
      );
    } else {
      exclude = this.chips.filter(
        (value) =>
          !this.multiSelection.includes(value) &&
          this.multiselectOptions.map((x) => x.value).includes(value)
      );
    }
    this.chipsChange.emit(
      this.chips.concat(include).filter((value) => !exclude.includes(value))
    );
  }

  getSingularFieldName(): string {
    const value = this.fieldName.toLowerCase();
    const rules: Array<[RegExp, string]> = [
      [/ies$/, 'y'],
      [/ses$/, 's'],
      [/xes$/, 'x'],
      [/s$/, ''],
    ];
    for (const [pattern, replacement] of rules) {
      if (pattern.test(value)) {
        return value.replace(pattern, replacement);
      }
    }
    return value;
  }
}
