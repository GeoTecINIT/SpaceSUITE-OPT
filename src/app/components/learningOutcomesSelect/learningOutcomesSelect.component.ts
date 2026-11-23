import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PopoverModule } from 'primeng/popover';
import { TreeSelectModule } from 'primeng/treeselect';
import { map, Observable, take } from 'rxjs';
import { BloomSkill } from '../../models/bloomSkill';

@Component({
  standalone: true,
  selector: 'learningOutcomes-select',
  templateUrl: './learningOutcomesSelect.component.html',
  styleUrls: ['./learningOutcomesSelect.component.css'],
  imports: [
    FloatLabelModule,
    FormsModule,
    IconFieldModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    TreeSelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    PopoverModule,
    DividerModule,
  ],
})
export class LearningOutcomesSelectComponent {
  @Input() treeSelection: TreeNode[] = [];
  @Output() treeSelectionChange: EventEmitter<TreeNode[]> = new EventEmitter();

  chips: BloomSkill[] = [];

  @Input() treeSelectOptions: TreeNode[] = [];
  @Input() fieldName: string = 'Field Name';
  @Input() error: boolean = false;
  @Input() popoverUsingAddonGroup: boolean = false;

  private bokInfo: BokInformationService = inject(BokInformationService);

  public chipsStructure = [
    {
      label: 'Level 1: Remember',
      key: 1,
      expanded: true,
    },
    {
      label: 'Level 2: Understand',
      key: 2,
      expanded: true,
    },
    {
      label: 'Level 3: Apply',
      key: 3,
      expanded: true,
    },
    {
      label: 'Level 4: Analyze',
      key: 4,
      expanded: true,
    },
    {
      label: 'Level 5: Evaluate',
      key: 5,
      expanded: true,
    },
    {
      label: 'Level 6: Create',
      key: 6,
      expanded: true,
    },
    {
      label: 'Unclassified',
      key: 0,
      expanded: true,
    },
  ];

  getBackgroundColor(code: string) {
    return this.bokInfo.getConceptColor(code).pipe(
      take(1),
      map((color) => {
        if (color) {
          let hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, ${0.5})`;
        }
        return '';
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['treeSelection']) {
      const currentValue: TreeNode[] = changes[
        'treeSelection'
      ].currentValue.filter((node: TreeNode) => node.leaf);
      this.chips = currentValue.map((value) => value.data);
    }
  }

  deleteElement(element: BloomSkill) {
    this.treeSelection = this.treeSelection.filter(
      (value) =>
        value.label != element.label && value.key != element.level.toString(),
    );
    this.treeSelectionChange.emit(this.treeSelection);
  }

  treeselectChange(values: TreeNode[]) {
    this.treeSelection = values || [];
    this.treeSelectionChange.emit(this.treeSelection);
  }

  getChipsByLevel(level: number) {
    return this.chips
      .filter((chip) => chip.level == level)
      .sort(
        (a: BloomSkill, b: BloomSkill) =>
          a.concept.localeCompare(b.concept) || a.label.localeCompare(b.label),
      );
  }

  checkChipLevel(level: number) {
    return this.chips.some((chip) => chip.level == level);
  }

  divideSkill(value: BloomSkill): Observable<string[]> {
    return this.bokInfo.getConceptName(value.concept).pipe(
      map((conceptName) => {
        const words = value.label.split(' ');

        const verb = words[0];

        const conceptIndex = value.label
          .toLowerCase()
          .indexOf(conceptName.toLowerCase());

        if (conceptIndex === -1) {
          return [verb, value.label.substring(verb.length).trim(), '', ''];
        }

        const verbIndex = verb.length;

        const textBeforeConcept = value.label
          .substring(verbIndex, conceptIndex)
          .trim();

        const textAfterConcept = value.label
          .substring(conceptIndex + conceptName.length)
          .trim();

        return [verb, textBeforeConcept, conceptName, textAfterConcept];
      }),
    );
  }
}
