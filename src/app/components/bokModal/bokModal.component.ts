import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  BokComponent,
  BokInformationService,
} from '@eo4geo/ngx-bok-visualization';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { UtilsService } from '../../services/utils.service';

@Component({
  standalone: true,
  selector: 'bokModal',
  templateUrl: './bokModal.component.html',
  styleUrls: ['./bokModal.component.css'],
  imports: [
    DialogModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    TooltipModule,
    ProgressSpinner,
    ToastModule,
  ],
  providers: [MessageService],
})
export class BokModalComponent implements OnInit {
  @Input() allowKnowledgeAreas: boolean = true;
  @Input() disabled: boolean = false;
  @Input() label: string = 'BoK Concepts';

  private _selectedConcepts: string[] = [];
  @Input() set selectedConcepts(value: string[]) {
    this._selectedConcepts = value ?? [];
    this._selectedConcepts.forEach((concept) => {
      if (!this.conceptColors.has(concept)) {
        this.setConceptAttributes(concept);
      }
    });
  }
  get selectedConcepts() {
    return this._selectedConcepts;
  }

  @Input() selectedSkills: string[] = [];

  @Output() selectedConceptsChange = new EventEmitter<string[]>();
  @Output() selectedSkillsChange = new EventEmitter<string[]>();
  @Output() deletedConcept = new EventEmitter<string>();

  @ViewChild('dynamicContainer', { read: ViewContainerRef })
  container!: ViewContainerRef;

  currentConcept = '';
  currentConceptName = '';
  invalidConcept = false;

  conceptColors = new Map<string, string>();
  conceptTooltips = new Map<string, string>();

  isVisible = false;
  private componentRef: ComponentRef<BokComponent> | null = null;

  constructor(
    private readonly bokInfo: BokInformationService,
    private readonly utilsService: UtilsService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
  ) {}

  ngOnInit() {}

  removeChip(label: string): void {
    this._selectedConcepts = this._selectedConcepts.filter(
      (concept) => concept !== label,
    );

    this.conceptColors.delete(label);
    this.conceptTooltips.delete(label);

    this.selectedConceptsChange.emit(this._selectedConcepts);

    this.deletedConcept.emit(label);
    this.cdr.detectChanges();
  }

  showDialog(): void {
    this.isVisible = true;
  }

  async loadComponent(): Promise<void> {
    if (this.componentRef) return;

    this.container.clear();
    const { BokComponent } = await import('@eo4geo/ngx-bok-visualization');
    this.componentRef = this.container.createComponent(BokComponent);
    this.componentRef.setInput('showDescription', false);
    this.componentRef.setInput('showVersions', false);
    this.componentRef.setInput('showSearchEngine', true);

    this.componentRef.instance.codSelectedChange.subscribe(
      (newCode: string) => {
        this.currentConcept = newCode;

        if (
          !this.allowKnowledgeAreas &&
          (this.utilsService.codeToKnowledgeArea.has(this.currentConcept) ||
            this.currentConcept === 'GIST')
        ) {
          this.invalidConcept = true;
          this.cdr.detectChanges();
          return;
        }

        this.invalidConcept = false;

        this.bokInfo.getConceptName(newCode).subscribe((name) => {
          this.currentConceptName = name;
          this.cdr.detectChanges();
        });
      },
    );
  }

  addConcept(): void {
    this.addConceptWithName(this.currentConcept);
  }

  private setConceptAttributes(concept: string): void {
    this.bokInfo.getConceptColor(concept).subscribe((color) => {
      const softColor = color
        ? this.utilsService.convertHexToRgba(color, 0.5)
        : '';
      this.conceptColors.set(concept, softColor);
      this.cdr.detectChanges();
    });

    this.bokInfo.getConceptName(concept).subscribe((name) => {
      this.conceptTooltips.set(concept, name);
      this.cdr.detectChanges();
    });
  }

  private addConceptWithName(concept: string): void {
    if (!this._selectedConcepts.includes(concept)) {
      this._selectedConcepts = [...this._selectedConcepts, concept];
      this.setConceptAttributes(concept);
      this.selectedConceptsChange.emit(this._selectedConcepts);

      this.addMessage(`Concept "${concept}" annotated!`, 'info', 'Info');
      this.addSkills(concept);
    } else {
      this.addMessage(
        `Concept "${concept}" is already annotated!`,
        'error',
        'Error',
      );
    }
  }

  private getSkills(concept: string): string[] {
    const list: string[] = [];

    this.bokInfo.getConceptSkills(concept).subscribe((skills) => {
      skills.forEach((skill) => list.push(`[${concept}] ${skill}`));
      this.cdr.detectChanges();
    });

    return list;
  }

  private addSkills(concept: string): void {
    const skills = this.getSkills(concept);

    skills.forEach((skill) => {
      if (!this.selectedSkills.includes(skill)) {
        this.selectedSkills.push(skill);
      }
    });

    this.selectedSkillsChange.emit(this.selectedSkills);
  }

  private addMessage(message: string, severity: string, summary: string): void {
    this.messageService.add({
      severity: severity,
      summary: summary,
      detail: message,
      life: 3000,
      closable: true,
    });
  }
}
