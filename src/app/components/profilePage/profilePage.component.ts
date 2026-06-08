import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, SkillTagComponent, Tag } from '@eo4geo/ngx-bok-utils';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PanelModule } from 'primeng/panel';
import { Popover, PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  catchError,
  combineLatest,
  concatMap,
  defaultIfEmpty,
  filter,
  finalize,
  forkJoin,
  map,
  of,
  retry,
  skip,
  Subscription,
  take,
  tap,
} from 'rxjs';
import {
  Competence,
  OccupationalProfile,
} from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { PdfService } from '../../services/pdf.service';
import { RdfService } from '../../services/rdf.service';
import { UtilsService } from '../../services/utils.service';

interface AuthState {
  logged: boolean;
  nameInitial: string;
  uid: string;
}

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
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
    PopoverModule,
    TooltipModule,
    SkillTagComponent,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ProfilePageComponent implements OnInit, AfterViewInit, OnDestroy {
  profile?: OccupationalProfile;

  concepts: Tag[] = [];
  allSkills: string[] = [];
  transversalSkills: Competence[] = [];
  applicationDomains: string[] = [];

  private tagLimit: number = 30;
  knowledgeDistribution: Map<Tag, number> = new Map();

  private userOrgIdsSubscription!: Subscription;
  private organizations: string[] = [];

  private authStateSubscription!: Subscription;
  private authState: AuthState | undefined = undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private occupationalProfileService: OccupationalProfileService,
    private utilsService: UtilsService,
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private pdfService: PdfService,
    private rdfService: RdfService,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);

    const routeData$ = combineLatest([
      this.route.paramMap,
      this.route.queryParams,
    ]).pipe(
      map(([paramMap, queryParams]) => {
        const profileId = paramMap.get('profileId') || '';
        const submitted =
          queryParams['submitted'] === 'true' ||
          queryParams['submitted'] === true;
        return { profileId: profileId, submitted };
      }),
      concatMap(({ profileId, submitted }) =>
        this.occupationalProfileService.getOccupationalProfile(profileId).pipe(
          tap((profile) => {
            if (submitted && !profile) throw new Error('Profile not found');
          }),
          retry({ count: 1, delay: 500 }),
          catchError(() => of(undefined)),
        ),
      ),
      filter((profile) => profile?.updatedAt !== null),
      take(1),
    );

    const orgIds$ = this.firebaseService.getUserOrganizationList().pipe(
      map((orgs) => orgs.map((o) => o._id)),
      tap((orgIds) => (this.organizations = orgIds)),
      take(1),
    );

    const userState$ = this.authService.getUserState().pipe(
      tap((authState) => (this.authState = authState)),
      take(1),
    );

    forkJoin([routeData$, orgIds$, userState$]).subscribe(
      ([newProfile, _, userData]) => {
        const isProfileMissing = !newProfile;
        const isNotPublic = newProfile && !newProfile.isPublic;
        const belongsToUserOrg =
          newProfile?.orgId && this.organizations.includes(newProfile.orgId);
        const belongsToUser =
          newProfile && userData && newProfile.userId === userData.uid;

        if (
          isProfileMissing ||
          (isNotPublic && !(belongsToUserOrg || belongsToUser))
        ) {
          this.router.navigate(['not_found']);
        } else this.loadProfile(newProfile);
      },
    );

    this.userOrgIdsSubscription = this.firebaseService
      .getUserOrganizationList()
      .pipe(
        skip(1),
        map((orgs) => orgs.map((o) => o._id)),
      )
      .subscribe((ids) => {
        this.organizations = ids;
      });

    this.authStateSubscription = this.authService
      .getUserState()
      .pipe(skip(1))
      .subscribe((authState) => (this.authState = authState));
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

  ngOnDestroy() {
    this.authStateSubscription.unsubscribe();
    this.userOrgIdsSubscription.unsubscribe();
  }

  private loadProfile(newProfile: OccupationalProfile) {
    this.profile = newProfile;
    this.concepts = [];
    this.allSkills = [];
    this.transversalSkills = [];
    this.applicationDomains = [];

    this.utilsService
      .stringToTag(this.profile.knowledge, 'bok')
      .pipe(defaultIfEmpty([]))
      .subscribe((results) => {
        this.concepts = [...this.concepts, ...results];
        this.concepts.sort((a, b) => a.label.localeCompare(b.label));
        this.getConcept(this.concepts);
      });

    this.profile.skills.forEach((skill) => {
      if (skill !== '') this.allSkills.push(skill);
    });

    this.profile.customSkills.forEach((customSkill) => {
      if (customSkill !== '') this.allSkills.push(customSkill);
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
          (competence) => competence.preferredLabel !== customCompetence,
        )
      ) {
        this.transversalSkills.push({ preferredLabel: customCompetence });
      }
    });

    this.profile.fields.forEach((field) => {
      this.applicationDomains.push(`${field.name} (${field.grandparent})`);
    });
  }

  goToMainPage() {
    this.router.navigate(['profile']);
  }

  editProfile() {
    this.router.navigate([`profile/edit/${this.profile?._id}`], {
      queryParams: { origin: 'details' },
    });
  }

  duplicateProfile() {
    this.router.navigate([`profile/new/${this.profile?._id}`], {
      queryParams: { origin: 'details' },
    });
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
        }),
      )
      .subscribe();
  }

  checkUser() {
    return (
      this.authState?.uid == this.profile?.userId ||
      (this.profile && this.organizations.includes(this.profile.orgId))
    );
  }

  onClickConcept(code: string) {
    window.open(`https://geospacebok.eu/${code}`);
  }

  onClickSkill(uri: string) {
    window.open(uri);
  }

  overTagLimit(length: number): boolean {
    return length > this.tagLimit;
  }

  getConcept(concepts: Tag[]) {
    const conceptsAreas = concepts.map((concept) => {
      if (concept.label === 'GIST') return concept.label;
      return concept.label.substring(0, 2).toUpperCase();
    });
    this.utilsService
      .stringToTag(conceptsAreas, 'bok')
      .subscribe((areasTags) => {
        const allAreas = new Map<string, Tag>();
        const counts = new Map<string, number>();
        const total = concepts.length;

        areasTags.flat().forEach((area) => {
          allAreas.set(area.label, area);
          counts.set(area.label, (counts.get(area.label) || 0) + 1);
        });

        if (total > 0) {
          this.knowledgeDistribution = new Map(
            Array.from(counts.entries()).map(([label, count]) => [
              allAreas.get(label)!,
              Math.round((count / total) * 100),
            ]),
          );
        }
      });
  }

  get knowledgeDistributionArray() {
    return Array.from(this.knowledgeDistribution.entries());
  }

  isLogged(): boolean {
    return this.authState?.logged ?? false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href);

    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: `You copied the profile url to clipboard!`,
      life: 3000,
      closable: true,
    });
  }

  downloadPDF(op: Popover): void {
    document.body.style.cursor = 'wait';
    op.hide();

    this.pdfService
      .generatePortfolioPdf(new OccupationalProfile(this.profile))
      .subscribe((pdf) => {
        this.downloadURI(pdf.url, pdf.filename);
        document.body.style.cursor = '';
      });
  }

  downloadRDF(format: 'ttl' | 'xml' | 'rdfa', op: Popover): void {
    document.body.style.cursor = 'wait';
    op.hide();

    const fileName = (this.profile?.title || 'default_name')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w_-]/g, '')
      .toLowerCase();
    const newProfile = new OccupationalProfile(this.profile);

    switch (format) {
      case 'ttl':
        const ttlUrl = this.rdfService.getRdfTtlUrl(newProfile);
        this.downloadURI(ttlUrl, fileName + '_profile.ttl');

        break;

      case 'xml':
        const xmlUrl = this.rdfService.getRdfXmlUrl(newProfile);
        this.downloadURI(xmlUrl, fileName + '_profile.rdf.xml');

        break;

      case 'rdfa':
        const rdfaUrl = this.rdfService.getRdfaUrl(newProfile);
        this.downloadURI(rdfaUrl, fileName + '_profile.html');

        break;
    }

    document.body.style.cursor = '';
  }

  downloadJSON(op: Popover) {
    op.hide();

    const fileName = (this.profile?.title || 'default_name')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w_-]/g, '')
      .toLowerCase();

    const plainProfile = this.profile?.toPlain();
    if (plainProfile) {
      delete plainProfile['_id'];
      delete plainProfile['userId'];
      delete plainProfile['orgId'];
    }
    const jsonStr = JSON.stringify(plainProfile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    this.downloadURI(url, fileName + '_profile.json');
  }

  private downloadURI(uri: string, name: string): void {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    link.click();
  }
}
