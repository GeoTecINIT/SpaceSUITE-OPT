import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PanelModule } from 'primeng/panel';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import {
  catchError,
  combineLatest,
  concatMap,
  finalize,
  forkJoin,
  map,
  of,
  retry,
  take,
  tap,
} from 'rxjs';
import {
  Competence,
  OccupationalProfile,
} from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { UtilsService } from '../../services/utils.service';

@Component({
  standalone: true,
  selector: 'profile-page',
  templateUrl: './profilePage.component.html',
  styleUrls: ['./profilePage.component.css'],
  imports: [
    CommonModule,
    ProgressSpinnerModule,
    ButtonModule,
    TagModule,
    PanelModule,
    TabsModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ProfilePageComponent implements OnInit {
  profile: OccupationalProfile | undefined;

  deprecatedConcepts: string[] = [];
  concepts: string[] = [];
  skills: string[] = [];
  transversalSkills: Competence[] = [];
  applicationDomains: string[] = [];

  conceptsColor: Map<string, string> = new Map();
  conceptsTooltip: Map<string, string> = new Map();

  private tagLimit: number = 30;
  knowledgeDistribution: Map<string, number> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private occupationalProfileService: OccupationalProfileService,
    private utilsService: UtilsService,
    private bokInfo: BokInformationService,
    private firebaseService: FirebaseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.queryParams])
      .pipe(
        map(([paramMap, queryParams]) => {
          const profileId = paramMap.get('dynamicValue') || '';
          const submitted =
            queryParams['submitted'] === 'true' ||
            queryParams['submitted'] === true;
          return { profileId: profileId, submitted };
        }),
        concatMap(({ profileId, submitted }) =>
          this.occupationalProfileService
            .getOccupationalProfile(profileId)
            .pipe(
              tap((profile) => {
                if (submitted && !profile) throw new Error('Profile not found');
              }),
              retry({ count: 1, delay: 500 }),
              catchError(() => of(undefined))
            )
        ),
        take(1)
      )
      .subscribe((newProfile: OccupationalProfile | undefined) => {
        if (newProfile) this.loadProfile(newProfile);
        else this.router.navigate(['not_found']);
      });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe((params) => {
      const submitted: boolean = params['submitted'];
      const mode: string = params['mode'];
      if (submitted) {
        switch (mode) {
          case 'update':
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Profile successfully updated!`,
              life: 3000,
              closable: true,
            });
            break;
          case 'create':
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Profile successfully created!`,
              life: 3000,
              closable: true,
            });
            break;
        }
      }
    });
  }

  private loadProfile(newProfile: OccupationalProfile) {
    this.profile = newProfile;
    this.concepts = [];
    this.deprecatedConcepts = [];
    this.skills = [];
    this.transversalSkills = [];
    this.applicationDomains = [];
    this.conceptsColor.clear();
    this.conceptsTooltip.clear();

    const conceptRequests = newProfile.knowledge.map((concept) =>
      forkJoin({
        name: this.bokInfo.getConceptName(concept).pipe(take(1)),
        color: this.bokInfo.getConceptColor(concept).pipe(take(1)),
      }).pipe(
        tap(({ name, color }) => {
          this.conceptsTooltip.set(concept, name || 'Deprecated concept');

          const softColor = color
            ? this.utilsService.convertHexToRgba(color, 0.5)
            : '';
          this.conceptsColor.set(concept, softColor);
        }),
        map(({ name }) => ({ concept, name }))
      )
    );

    forkJoin(conceptRequests).subscribe((results) => {
      results.forEach(({ concept, name }) => {
        if (name) {
          this.concepts.push(concept);
        } else {
          this.deprecatedConcepts.push(concept);
        }
      });

      this.getConcept(this.concepts);
    });

    this.profile.skills.forEach((skill) => {
      if (skill !== '') this.skills.push(skill);
    });

    this.profile.customSkills.forEach((customSkill) => {
      if (customSkill !== '' && !this.skills.includes(customSkill)) {
        this.skills.push(customSkill);
      }
    });

    this.profile.competences.forEach((competence) => {
      if (competence.preferredLabel !== '') {
        this.transversalSkills.push(competence);
      }
    });

    this.profile.customCompetences.forEach((customCompetence) => {
      if (
        customCompetence !== '' &&
        this.transversalSkills.every(
          (competence) => competence.preferredLabel !== customCompetence
        )
      ) {
        this.transversalSkills.push({ preferredLabel: customCompetence });
      }
    });

    this.profile.fields.forEach((field) => {
      this.applicationDomains.push(field.name + ' (' + field.grandparent + ')');
    });
  }

  goToMainPage() {
    this.router.navigate(['profile']);
  }

  editProfile() {
    this.router.navigate(['profile/edit/' + this.profile?._id]);
  }

  deleteModal(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Do you want to delete this occupational profile?',
      header: 'Delete Profile',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'primary',
      },

      accept: () => {
        this.deleteProfile();
      },
      reject: () => {},
    });
  }

  deleteProfile() {
    let deleteError = false;
    this.occupationalProfileService
      .deleteOccupationalProfile(this.profile!)
      .pipe(
        take(1),
        catchError((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.message ??
              'Something went wrong. Try again later or contact the administrator.',
            life: 3000,
            closable: true,
          });
          deleteError = true;
          return of(null);
        }),
        finalize(() => {
          if (!deleteError)
            this.router.navigate(['profile'], {
              queryParams: { submitted: true, mode: 'delete' },
            });
        })
      )
      .subscribe();
  }

  checkUser() {
    return this.firebaseService.userId == this.profile?.userId;
  }

  onClickConcept(code: string) {
    window.open('https://geospacebok.eu/' + code);
  }

  onClickSkill(uri: string) {
    window.open(uri);
  }

  overTagLimit(length: number): boolean {
    return length > this.tagLimit;
  }

  getConcept(codes: string[]) {
    const allAreas: string[] = [];

    codes.forEach((code) => {
      this.bokInfo.getKnowledgeAreas(code).subscribe((areas) => {
        allAreas.push(...areas);

        const total = allAreas.length;
        if (total === 0) return;

        const counts = allAreas.reduce<Record<string, number>>((acc, area) => {
          acc[area] = (acc[area] || 0) + 1;
          return acc;
        }, {});

        // IMPORTANT: Replace the Map instead of mutating it
        this.knowledgeDistribution = new Map(
          Object.entries(counts).map(([area, count]) => [
            area,
            Math.round((count / total) * 100),
          ])
        );

        allAreas.forEach((area) => {
          if (!this.conceptsColor.has(area)) {
            this.bokInfo
              .getConceptColor(area)
              .pipe(take(1))
              .subscribe((color) => {
                const softColor = color
                  ? this.utilsService.convertHexToRgba(color, 0.5)
                  : '';
                this.conceptsColor.set(area, softColor);
              });
          }

          if (!this.conceptsTooltip.has(area)) {
            this.bokInfo
              .getConceptName(area)
              .pipe(take(1))
              .subscribe((name) => {
                this.conceptsTooltip.set(area, name);
              });
          }
        });
      });
    });
  }

  get knowledgeDistributionArray() {
    return Array.from(this.knowledgeDistribution.entries());
  }
}
