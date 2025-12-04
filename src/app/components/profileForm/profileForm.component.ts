import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ExitWithoutSavingService } from '@eo4geo/ngx-bok-utils';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
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
import { catchError, finalize, of, Subscription, take } from 'rxjs';
import { FilterOption } from '../../models/filterOption';
import {
  Competence,
  Field,
  OccupationalProfile,
} from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { BokModalComponent } from '../bokModal/bokModal.component';
import { CustomSelectComponent } from '../customSelect/customSelect.component';
import { MultiselectChipsComponent } from '../multiselectChips/multiselectChips.component';
import { TextChipsComponent } from '../textChips/textChips.component';
import { FieldsService } from '../../services/fields.service';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ESCOService } from '../../services/esco.service';
import { TreeselectChipsComponent } from '../treeselectChips/treeselectChips.component';

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

  divisionSelector: FilterOption = {
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

  transversalSkills: TreeNode<any>[] = [];
  competences: string[] = [];
  customCompetences: string[] = [];

  showCustomCompetences: boolean = false;

  private authSubscription!: Subscription;
  private userOrgsSubscription!: Subscription;

  private fields: Field[] = [];
  private skills: Competence[] = [];

  constructor(
    private exitWithoutSavingService: ExitWithoutSavingService,
    private firebaseService: FirebaseService,
    private messageService: MessageService,
    private occupationalProfileService: OccupationalProfileService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private fieldsService: FieldsService,
    private escoService: ESCOService
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService
      .getUserState()
      .subscribe((state) => {
        if (state?.logged) {
          this.profile.userId = state.uid;
        } else {
          this.exitWithoutSavingService.bypassGuard.next(true);
          this.router.navigate(['profile']);
        }
      });

    this.userOrgsSubscription = this.firebaseService
      .getUserOrganizationList()
      .subscribe((organizations) => {
        this.organizationSelector.values = [];
        organizations.forEach((organization) =>
          this.organizationSelector.values.push({
            label: organization.name,
            value: organization._id,
          })
        );
      });

    this.fieldsService.getFields().subscribe((fields) => {
      this.fields = fields;
    });

    if (this.inputProfile) {
      this.profile = this.inputProfile;
      this.firebaseService
        .getOrganizationDivisions(this.profile.orgId!)
        .pipe(take(1))
        .subscribe((divisions) => (this.divisionSelector.values = divisions));
      this.fieldNames = this.getFieldNames(this.profile.fields);
      this.escoService
        .getTransversalSkillsFromJson()
        .pipe(take(1))
        .subscribe((data) => {
          this.transversalSkills = data;

          this.skills = this.extractCompetencesFromTree(this.transversalSkills);

          const validSkills = this.flattenTree(data);

          const legacyCompetences: string[] = [];

          this.profile.competences.forEach((c) => {
            if (!validSkills.includes(c.preferredLabel)) {
              legacyCompetences.push(c.preferredLabel);
            }
          });

          this.profile.competences = this.profile.competences.filter((c) =>
            validSkills.includes(c.preferredLabel)
          );

          legacyCompetences.forEach((l) => {
            if (!this.profile.customCompetences.includes(l)) {
              this.customCompetences.push(l);
            }
          });

          this.profile.competences.forEach((competence) => {
            this.competences.push(competence.preferredLabel);
          });

          this.profile.customCompetences.forEach((competence) => {
            this.customCompetences.push(competence);
          });
        });

      this.showCustomCompetences = this.profile.customCompetences.length !== 0;
    }

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

  private flattenTree(nodes: TreeNode[]): string[] {
    let result: string[] = [];
    nodes.forEach((node) => {
      if (node.label) result.push(node.label);
      if (node.children?.length) {
        result = result.concat(this.flattenTree(node.children));
      }
    });
    return result;
  }

  private extractCompetencesFromTree(nodes: any[]): Competence[] {
    let list: Competence[] = [];

    nodes.forEach((node) => {
      list.push({
        preferredLabel: node.label ?? '',
        altLabels: node.altLabels ?? [],
        description: node.description ?? '',
        reuseLevel: node.reuseLevel ?? '',
        skillType: node.skillType ?? '',
        uri: node.uri ?? '',
      });

      if (node.children?.length) {
        list = list.concat(this.extractCompetencesFromTree(node.children));
      }
    });

    return list;
  }

  getUserName(): string | null {
    const userData = this.firebaseService.getUserData();
    if (userData) {
      if (userData.displayName) return userData.displayName;
      else return userData.email;
    } else {
      return '';
    }
  }

  loadDivisions(newValue: { label: string; value: string }): void {
    this.profile.orgId = newValue.value;
    this.profile.orgName = newValue.label;
    this.profile.division = '';
    this.firebaseService
      .getOrganizationDivisions(this.profile.orgId!)
      .subscribe((divisions) => (this.divisionSelector.values = divisions));
  }

  submitProfile(): void {
    this.profile.competences = this.getCompetences(this.competences);
    this.profile.customCompetences = this.customCompetences;

    this.profile.fields = this.getFields(this.fieldNames);

    this.errorMap = this.occupationalProfileService.validateOccupationalProfile(
      this.profile
    );
    const allValid: boolean = Array.from(this.errorMap.values()).every(
      (value) => value === undefined
    );

    if (allValid) {
      this.exitWithoutSavingService.bypassGuard.next(true);

      this.occupationalProfileService
        .submitOccupationalProfile(this.profile, this.inputProfile != undefined)
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
                  mode: this.inputProfile != undefined ? 'update' : 'create',
                },
              });
            }
          })
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

  returnToHomepage(): void {
    this.router.navigate([`profile/${this.inputProfile?._id ?? ''}`]);
  }

  getFieldNames(fields: Field[]): string[] {
    let list: string[] = [];

    fields.forEach((field) => {
      list.push(field.name);
    });

    return list;
  }

  private getFields(names: string[]): Field[] {
    let list: Field[] = [];

    this.fields.forEach((field) => {
      if (names.includes(field.name)) {
        list.push(field);
      }
    });

    return list;
  }

  private getCompetences(labels: string[]): Competence[] {
    let list: Competence[] = [];

    this.skills.forEach((skill) => {
      if (labels.includes(skill.preferredLabel)) {
        list.push(skill);
      }
    });

    return list;
  }
  conceptsChange(concepts: string[]): void {
    this.profile.knowledge = concepts;
  }

  skillsChange(skills: string[]): void {
    this.profile.skills = skills;
  }

  deletedConceptSkills(skills: string[]): void {
    const matchedSkills = skills.filter((skill) =>
      this.profile.skills.includes(skill)
    );

    if (matchedSkills.length > 0) {
      this.confirmDeleteConcept(matchedSkills);
    }
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

  private confirmDeleteConcept(skills: string[]): void {
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
          (skill) => !skills.includes(skill)
        )),
      reject: () => {},
    });
  }
}
