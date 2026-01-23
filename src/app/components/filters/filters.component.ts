import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { Filter } from '../../models/filter';
import { BokModalComponent } from '../bokModal/bokModal.component';

@Component({
  standalone: true,
  selector: 'filters',
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
  imports: [
    CommonModule,
    FormsModule,
    DividerModule,
    InputTextModule,
    MultiSelectModule,
    SelectButtonModule,
    TooltipModule,
    InputGroupModule,
    InputGroupAddonModule,
    MenuModule,
    ButtonModule,
    BokModalComponent,
  ],
})
export class FiltersComponent implements OnChanges {
  @Input() bokConcepts: string[] = [];
  @Input() loading: boolean = false;
  @Input() logged: boolean = false;
  @Input() multiSelectOptions: Filter[] = [];
  @Input() searchOption: string = 'Title';
  @Input() searchValue: string = '';
  @Input() visibilityFilter: string = 'all';

  @Output() bokConceptsChange: EventEmitter<string[]> = new EventEmitter();
  @Output() multiSelectOptionsChange: EventEmitter<Filter[]> =
    new EventEmitter();
  @Output() searchOptionChange: EventEmitter<string> = new EventEmitter();
  @Output() searchValueChange: EventEmitter<string> = new EventEmitter();
  @Output() visibilityFilterChange: EventEmitter<string> = new EventEmitter();

  searchOptions: MenuItem[] = [
    { label: 'Title' },
    { label: 'Description' },
    { label: 'Skills' },
    { label: 'Transversal Skills' },
  ];

  visibilityFilterOptions: MenuItem[] = [
    { label: 'My Profiles', value: 'mine', icon: 'pi pi-user' },
    {
      label: "My Organization's Profiles",
      value: 'organization',
      icon: 'pi pi-users',
    },
    { label: 'All Profiles', value: 'all', icon: 'pi pi-globe' },
  ];

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['logged'] &&
      !changes['logged'].isFirstChange() &&
      changes['logged'].currentValue === false
    ) {
      this.visibilityFilterChange.emit('all');
    }
  }

  clearOptions(label: string): void {
    const currentOption = this.multiSelectOptions.find(
      (option) => option.label === label,
    );

    if (currentOption) currentOption.selection = [];

    this.updateSelectOptions();
  }

  updateSearchOption(option: string): void {
    this.searchOptionChange.emit(option);
  }

  updateSearchValue(): void {
    this.searchValueChange.emit(this.searchValue);
  }

  updateSelectOptions(): void {
    this.multiSelectOptionsChange.emit(this.multiSelectOptions);
  }

  updateVisibilityFilter(): void {
    this.visibilityFilterChange.emit(this.visibilityFilter);
  }

  getMultiselectOptions(filterOption: Filter): { id: string; value: string }[] {
    return filterOption.values.map((x, i) => ({
      id: filterOption.tags ? filterOption.tags[i] : x,
      value: x,
    }));
  }

  trackByLabel(index: number, item: Filter): string | number {
    return item.label ?? index;
  }
}
