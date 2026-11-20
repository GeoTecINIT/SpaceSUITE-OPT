import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, ExitWithoutSavingService, PermissionService } from '@eo4geo/ngx-bok-utils';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { StepperModule } from 'primeng/stepper';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, finalize, of, Subscription, switchMap, take } from 'rxjs';
import { Filter } from '../../models/filter';
import { FormType } from '../../models/formType';
import {
  Competence,
  Field,
  OccupationalProfile,
} from '../../models/occupationalProfile';
import { ESCOService } from '../../services/esco.service';
import { FieldsService } from '../../services/fields.service';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { BokModalComponent } from '../bokModal/bokModal.component';
import { CustomSelectComponent } from '../customSelect/customSelect.component';
import { MultiselectChipsComponent } from '../multiselectChips/multiselectChips.component';
import { TextChipsComponent } from '../textChips/textChips.component';
import { TreeselectChipsComponent } from '../treeselectChips/treeselectChips.component';
import { LearningOutcomesSelectComponent } from '../learningOutcomesSelect/learningOutcomesSelect.component';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { BloomSkill } from '../../models/bloomSkill';

@Component({
  standalone: true,
  selector: 'profile-form',
  templateUrl: './profileForm.component.html',
  styleUrls: ['./profileForm.component.css'],
  imports: [
    InputTextModule,
    FloatLabelModule,
    FormsModule,
    InputIconModule,
    IconFieldModule,
    TextareaModule,
    SelectModule,
    CommonModule,
    DividerModule,
    StepperModule,
    ButtonModule,
    DatePickerModule,
    MultiSelectModule,
    TextChipsComponent,
    InputNumberModule,
    BokModalComponent,
    ToastModule,
    FileUploadModule,
    TooltipModule,
    MultiselectChipsComponent,
    CustomSelectComponent,
    ConfirmDialog,
    SelectButton,
    IftaLabelModule,
    TreeselectChipsComponent,
    LearningOutcomesSelectComponent
],
  providers: [MessageService, ConfirmationService],
})
export class ProfileFormComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() pageName: string = 'Create New Profile';
  @Input() inputProfile?: OccupationalProfile;

  profile: OccupationalProfile = new OccupationalProfile();

  organizationSelector = {
    label: 'Organization',
    values: [] as any[],
    selection: [],
  };

  divisionSelector: Filter = {
    label: 'Division',
    values: [],
    selection: [],
  };

  errorMap: Map<string, string | undefined> = new Map();

  visibilityFieldOptions: any[] = [
    { label: 'Public', value: true },
    { label: 'Private', value: false },
  ];

  fieldNames: string[] = [];
  competenceLabels: string[] = [];

  competenceTree: TreeNode[] = [];
  customCompetences: string[] = [];

  showCustomCompetences: boolean = false;
  showCustomSkills: boolean = false;

  selectedOrgCanPublish: WritableSignal<boolean> = signal(false);
  skillOptions: WritableSignal<TreeNode[]> = signal([]);
  
  skillSelection: WritableSignal<TreeNode[]> = signal([]);

  private authSubscription!: Subscription;
  private userOrgsSubscription!: Subscription;

  private fields: Field[] = [];
  private competences: Competence[] = [];

  private formType: FormType = FormType.Create;

  private origin: string = '';
  private profileId: string = '';

  constructor(
    private exitWithoutSavingService: ExitWithoutSavingService,
    private firebaseService: FirebaseService,
    private messageService: MessageService,
    private occupationalProfileService: OccupationalProfileService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private fieldsService: FieldsService,
    private escoService: ESCOService,
    private route: ActivatedRoute,
    private permissionService: PermissionService,
    private bokInfoService: BokInformationService
  ) {}

  ngOnInit() {
    this.origin = this.route.snapshot.queryParamMap.get('origin') || '';
    this.profileId = this.route.snapshot.paramMap.get('profileId') || '';

    this.formType = this.detectFormType(this.inputProfile);

    this.profile = new OccupationalProfile(
      this.formType === FormType.Create ? undefined : this.inputProfile,
    );

    this.authSubscription = this.authService
      .getUserState()
      .subscribe((state) => {
        if (state?.logged) {
          if (
            this.formType === FormType.Create ||
            this.formType === FormType.Duplicate
          ) {
            this.profile.userId = state.uid;
          }
        } else {
          this.exitWithoutSavingService.bypassGuard.next(true);
          this.router.navigate(['profile']);
        }
      });

    this.userOrgsSubscription = this.firebaseService
      .getUserOrganizationList()
      .subscribe((organizations) => {
        if (organizations.length == 0) {
          this.exitWithoutSavingService.bypassGuard.next(true);
          this.router.navigate(['profile']);
        }
        else {
          this.organizationSelector.values = organizations.map((org) => ({
            label: org.name,
            value: org._id,
          }));
        }
      });

    this.fieldsService
      .getFields()
      .subscribe((fields) => (this.fields = fields));

    this.escoService.getTransversalSkillsFromJson().subscribe((tree) => {
      this.competenceTree = tree;
      this.competences = this.extractCompetencesFromTree(tree);

      this.manageProfileCompetences();

      if (this.profile.orgId) {
        this.firebaseService
          .getOrganizationDivisions(this.profile.orgId)
          .pipe(take(1))
          .subscribe((divisions) => (this.divisionSelector.values = divisions));
        this.permissionService.organizationHasPermission(this.profile.orgId, 'opt').pipe(take(1)).subscribe(hasPermission => this.selectedOrgCanPublish.set(hasPermission));
      }

      this.fieldNames = this.profile.fields.map((field) => field.name);
    });

    this.buildSkillOptions();

    this.exitWithoutSavingService.showModalSubject.subscribe((value) => {
      if (value) this.confirmExitWithoutSaving();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
    this.userOrgsSubscription.unsubscribe();
  }

  onOrganizationChange(newValue: { label: string; value: string }): void {
    this.profile.orgId = newValue.value;
    this.profile.orgName = newValue.label;
    this.profile.division = '';
    this.firebaseService
      .getOrganizationDivisions(this.profile.orgId!)
      .subscribe((divisions) => (this.divisionSelector.values = divisions));
    this.permissionService.organizationHasPermission(this.profile.orgId, 'opt').pipe(take(1)).subscribe(hasPermission => {
      this.selectedOrgCanPublish.set(hasPermission);
      if (!hasPermission) {
        this.profile.isPublic = false;
      }
    });
  }

  onConceptsChange(concepts: string[]): void {
    this.profile.knowledge = concepts;
    this.buildSkillOptions();
  }

  onDeletedConcept(label: string): void {
    const matchedSkills = this.profile.skills.filter((skill) =>
      skill.concept == label
   );

    if (matchedSkills.length > 0) this.confirmDeleteConcept(matchedSkills);
  }

  returnToHomepage(): void {
    if (this.origin === 'details') {
      this.router.navigate([`profile/${this.profileId}`]);
    } else if (this.origin === 'explorer') {
      this.router.navigate(['profile']);
    } else {
      this.router.navigate(['not_found']);
    }
  }

  submitProfile(): void {
    this.profile.competences = this.competences.filter((c) =>
      this.competenceLabels.includes(c.preferredLabel),
    );
    this.profile.customCompetences = this.customCompetences;

    this.profile.fields = this.fields.filter((field) =>
      this.fieldNames.includes(field.name),
    );

    this.errorMap = this.occupationalProfileService.validateOccupationalProfile(
      this.profile,
    );
    const allValid: boolean = Array.from(this.errorMap.values()).every(
      (value) => value === undefined,
    );

    if (allValid) {
      this.exitWithoutSavingService.bypassGuard.next(true);

      const isUpdate = this.formType === FormType.Edit;

      this.occupationalProfileService
        .submitOccupationalProfile(this.profile, isUpdate)
        .pipe(
          take(1),
          catchError((error) => {
            console.log(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                'Something went wrong. Try again later or contact the administrator.',
              life: 3000,
              closable: true,
            });
            return of(null);
          }),
          finalize(() => {
            if (this.profile._id !== '') {
              this.router.navigate(['profile/' + this.profile._id], {
                queryParams: {
                  submitted: true,
                  mode: isUpdate ? 'update' : 'create',
                },
              });
            }
          }),
        )
        .subscribe((actionId) => {
          this.profile._id = actionId || '';
        });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'There are incomplete mandatory fields. Please review the form and try to submit again.',
        life: 3000,
        closable: true,
      });
    }
  }

  private detectFormType(profile?: OccupationalProfile): FormType {
    if (!profile) return FormType.Create;

    if (profile._id === '' && profile.userId === '') return FormType.Duplicate;

    return FormType.Edit;
  }

  private extractCompetencesFromTree(
    tree: any[],
    seen = new Set<string>(),
  ): Competence[] {
    return tree.reduce((acc: Competence[], node) => {
      const label = node.label ?? '';

      if (!seen.has(label)) {
        seen.add(label);

        acc.push({
          preferredLabel: label,
          altLabels: node.altLabels ?? [],
          description: node.description ?? '',
          reuseLevel: node.reuseLevel ?? '',
          skillType: node.skillType ?? '',
          uri: node.uri ?? '',
        });
      }

      if (node.children?.length) {
        acc.push(...this.extractCompetencesFromTree(node.children, seen));
      }

      return acc;
    }, []);
  }

  private manageProfileCompetences(): void {
    if (!this.inputProfile) return;

    const labels = this.competences.map((c) => c.preferredLabel);

    const legacyLabels = this.profile.competences
      .filter((c) => !labels.includes(c.preferredLabel))
      .map((c) => c.preferredLabel);

    this.profile.competences = this.profile.competences.filter((c) =>
      labels.includes(c.preferredLabel),
    );

    this.customCompetences = legacyLabels.filter(
      (c) => !this.profile.customCompetences.includes(c),
    );

    this.competenceLabels = this.profile.competences.map(
      (c) => c.preferredLabel,
    );

    this.customCompetences.push(...this.profile.customCompetences);
    this.showCustomCompetences = this.customCompetences.length > 0;
  }

  private confirmExitWithoutSaving(): void {
    this.confirmationService.confirm({
      message: 'Are you sure that you want to exit without saving?',
      header: 'Exit Without Saving',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptButtonProps: {
        label: 'Exit',
        severity: 'primary',
      },
      accept: () => this.exitWithoutSavingService.exitSubject.next(true),
      reject: () => this.exitWithoutSavingService.exitSubject.next(false),
    });
  }

  private confirmDeleteConcept(skills: BloomSkill[]): void {
    const isSingle = skills.length === 1;

    const message = isSingle
      ? 'There is 1 skill associated with the knowledge you deleted. Do you want to also delete it?'
      : `There are ${skills.length} skills associated with the knowledge you deleted. Do you want to also delete them?`;
    const acceptLabel = isSingle ? 'Yes, delete it.' : 'Yes, delete them.';
    const rejectLabel = isSingle ? 'No, keep it.' : 'No, keep them.';

    this.confirmationService.confirm({
      message: message,
      header: 'Deleted Knowledge',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: rejectLabel,
        severity: 'secondary',
      },
      acceptButtonProps: {
        label: acceptLabel,
        severity: 'primary',
      },
      accept: () =>
        (this.profile.skills = this.profile.skills.filter(
          (skill) => !skills.includes(skill),
        )),
      reject: () => {},
    });
  }

  private buildSkillOptions() {
    const tempTree: TreeNode[] = []
    // TODO - fill with selectd skills from unselected concepts
    this.profile.knowledge.forEach(concept => {
      const conceptTree: TreeNode[] = [
        {
          label: "Level 1: Remember",
          key: concept + '-1',
          expanded: false,
          leaf: false
        },
        {
          label: "Level 2: Understand",
          key: concept + '-2',
          expanded: false,
          leaf: false
        },
        {
          label: "Level 3: Apply",
          key: concept + '-3',
          expanded: false,
          leaf: false
        },
        {
          label: "Level 4: Analyze",
          key: concept + '-4',
          expanded: false,
          leaf: false
        },
        {
          label: "Level 5: Evaluate",
          key: concept + '-5',
          expanded: false,
          leaf: false
        },
        {
          label: "Level 6: Create",
          key: concept + '-6',
          expanded: false,
          leaf: false
        },
        {
          label: "Unclassified",
          key: concept + '-0',
          expanded: false,
          leaf: false
        }
      ]
      this.bokInfoService.getConceptSkills(concept).pipe(
        switchMap(skills => {
          skills.forEach(skill => {
            const levelNode: TreeNode | undefined = conceptTree.at(skill.bloomLevel - 1);
            if (!levelNode) return
            levelNode.children ??= [];
            levelNode.children.push({
              key: `${skill.bloomLevel}-${concept}-${skill.bloomVerb}-${levelNode.children.length}`,
              label: skill.name,
              children: [],
              leaf: true,
              expanded: false,
              type: 'leaf',
              data: { 
                level: skill.bloomLevel,
                verb: skill.bloomVerb, 
                label: skill.name,
                concept: concept
              } as BloomSkill
            })
          })
          return this.bokInfoService.getConceptName(concept)
        })
      ).subscribe(conceptName => {
        tempTree.push({
          label: `[${concept}] ${conceptName}`,
          key: concept,
          expanded: true,
          leaf: false,
          children: conceptTree,
          selectable: false
        })
      });
    })
    tempTree.forEach(levelNode => {
      levelNode.children = this.getSortedArray(levelNode.children ?? []);
    })
    this.skillOptions.set(tempTree);
  }
  
  private getSortedArray(values: TreeNode[]) {
    if (values.length > 0) {
      return [...values].sort((a, b) =>
        (a.label || '').localeCompare(b.label || '')
      );
    }
    return values;
  }

}
