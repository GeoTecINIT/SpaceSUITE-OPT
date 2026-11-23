import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { TreeNode } from 'primeng/api';
import { TreeModule } from 'primeng/tree';
import { map, Observable, take } from 'rxjs';
import { BloomSkill } from '../../models/bloomSkill';

@Component({
  standalone: true,
  selector: 'skillsTree',
  templateUrl: './skillsTree.component.html',
  styleUrls: ['./skillsTree.component.css'],
  imports: [CommonModule, TreeModule],
})
export class SkillsTreeComponent {
  @Input() array: BloomSkill[] = [];
  @Input() custom: string[] = [];
  @Input() headline: string = '';

  public formattedTree: WritableSignal<TreeNode[]> = signal([]);

  private bokInfo: BokInformationService = inject(BokInformationService);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['array'] || changes['custom']) {
      const tempTree: TreeNode[] = [
        {
          key: '1',
          label: 'Level 1: Remember',
          children: [],
          leaf: false,
          expanded: false,
        },
        {
          key: '2',
          label: 'Level 2: Understand',
          children: [],
          leaf: false,
          expanded: false,
        },
        {
          key: '3',
          label: 'Level 3: Apply',
          children: [],
          leaf: false,
          expanded: false,
        },
        {
          key: '4',
          label: 'Level 4: Analyze',
          children: [],
          leaf: false,
          expanded: false,
        },
        {
          key: '5',
          label: 'Level 5: Evaluate',
          children: [],
          leaf: false,
          expanded: false,
        },
        {
          key: '6',
          label: 'Level 6: Create',
          children: [],
          leaf: false,
          expanded: false,
        },
        {
          key: '0',
          label: 'Unclassified Skills',
          children: [],
          leaf: false,
          expanded: false,
        },
      ];

      const newArray = changes['array'].currentValue as BloomSkill[];
      newArray.forEach((element) => {
        const levelNode = tempTree.at(element.level - 1);
        if (!levelNode) return;
        levelNode.children ??= [];
        levelNode.children.push({
          key: `${element.concept}-${element.level}-${element.verb}`,
          label: element.label,
          children: [],
          leaf: true,
          expanded: false,
          type: 'leaf',
          data: element,
        });
      });

      tempTree.push({
        key: '-1',
        label: 'Custom Skills',
        children: changes['custom'].currentValue.map((skill: string) => {
          return {
            key: `custom-${skill}`,
            label: skill,
            children: [],
            leaf: true,
            expanded: false,
            type: 'leaf',
          };
        }),
        leaf: false,
        expanded: false,
      });

      tempTree.forEach((levelNode) => {
        levelNode.children = this.getSortedArray(levelNode.children ?? []);
      });
      this.formattedTree.set(tempTree);
    }
  }

  private getSortedArray(values: TreeNode[]) {
    if (values.length > 0) {
      return [...values].sort((a, b) =>
        this.compareStrings(a.label ?? '', b.label ?? ''),
      );
    }
    return values;
  }

  public countChildren(node: TreeNode): number {
    let count = 0;
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => (count += this.countChildren(child)));
    } else if (node.leaf) count += 1;
    return count;
  }

  private compareStrings = (a: string, b: string) => {
    const partsA = a.split('-');
    const partsB = b.split('-');
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i];
      const partB = partsB[i];
      if (!isNaN(Number(partA)) && !isNaN(Number(partB))) {
        const numA = parseInt(partA, 10);
        const numB = parseInt(partB, 10);
        if (numA !== numB) return numA - numB;
      } else {
        const result = (partA || '').localeCompare(partB || '');
        if (result !== 0) return result;
      }
    }
    return 0;
  };

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
}
