import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { TreeSelectModule } from 'primeng/treeselect';

@Component({
  standalone: true,
  selector: 'treeselect-chips',
  templateUrl: './treeselectChips.component.html',
  styleUrls: ['./treeselectChips.component.css'],
  imports: [
    FloatLabelModule,
    FormsModule,
    IconFieldModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    TreeSelectModule,
  ],
})
export class TreeselectChipsComponent implements OnInit, OnChanges {
  @Input() chips: string[] = [];
  @Input() error: boolean = false;
  @Input() fieldName: string = 'Field Name';
  @Input() treeNodes: TreeNode[] = [];

  @Output() chipsChange: EventEmitter<string[]> = new EventEmitter();

  chipAnimations: Record<string, boolean> = {};
  treeSelection: TreeNode[] = [];

  ngOnInit() {
    this.chips.forEach((chip) => {
      this.chipAnimations[chip] = false;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['treeNodes']?.currentValue?.length) {
      this.treeSelection = this.getTreeSelection(
        changes['treeNodes'].currentValue,
        this.chips,
      );
    }
  }

  addChip(chip: string) {
    if (!this.chips.includes(chip)) {
      this.chips.push(chip);
      this.chipsChange.emit(this.chips);

      const duplicates = this.getTreeSelection(this.treeNodes, [chip]).filter(
        (n) => n.key !== this.treeSelection[this.treeSelection.length - 1].key,
      );

      if (duplicates.length) {
        this.treeSelection = this.treeSelection.concat(duplicates);
      }
    }
  }

  deleteChip(chip: string) {
    this.chips = this.chips.filter((c) => c !== chip);
    this.chipsChange.emit(this.chips);
    this.treeSelection = this.treeSelection.filter((n) => n.label !== chip);
  }

  clear() {
    this.chips = [];
    this.chipsChange.emit(this.chips);
  }

  private getTreeSelection(nodes: TreeNode[], chips: string[]): TreeNode[] {
    return nodes.reduce<TreeNode[]>((acc, n) => {
      if (chips.includes(n.label!)) acc.push(n);
      if (n.children) acc.push(...this.getTreeSelection(n.children, chips));

      return acc;
    }, []);
  }
}
