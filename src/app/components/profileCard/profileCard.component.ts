import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SkillTagComponent, Tag } from '@eo4geo/ngx-bok-utils';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Popover, PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, defaultIfEmpty, finalize, of, take } from 'rxjs';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { PdfService } from '../../services/pdf.service';
import { RdfService } from '../../services/rdf.service';
import { UtilsService } from '../../services/utils.service';

@Component({
  standalone: true,
  selector: 'profile-card',
  templateUrl: './profileCard.component.html',
  styleUrl: './profileCard.component.css',
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    PopoverModule,
    SkeletonModule,
    SkillTagComponent,
  ],
})
export class ProfileCardComponent implements OnInit {
  @Input() occupationalProfile!: OccupationalProfile;
  @Input() logged: boolean = false;

  private organizations: string[] = [];

  @ViewChild('op') op!: Popover;

  @ViewChild('container') containerElement!: ElementRef;
  @ViewChild('subjects') subjectsElement!: ElementRef;

  @ViewChild('conceptsOp') conceptsOp!: Popover;

  @ViewChild('card') cardComponent!: ElementRef;
  maxOverflowWidth: number = 2000;
  minOverflowWidth: number = 500;

  concepts: Tag[] = [];
  conceptsLoaded: boolean = false;
  overflow: boolean = false;
  compactConcepts: boolean = false;
  limitTagsHeight: boolean = true;

  skeletonElements: number[] = [];
  showSkeleton: boolean = true;

  constructor(
    private utilsService: UtilsService,
    private router: Router,
    private firebaseService: FirebaseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private occupationalProfileService: OccupationalProfileService,
    private pdfService: PdfService,
    private rdfService: RdfService,
    private cdr: ChangeDetectorRef,
  ) {
    this.skeletonElements = Array(10).fill(null);
  }

  ngOnInit() {
    this.firebaseService.getUserOrganizationList().subscribe((orgs) => {
      orgs.forEach((org) => this.organizations.push(org._id));
    });

    this.utilsService
      .stringToTag(this.occupationalProfile.knowledge, 'bok')
      .pipe(defaultIfEmpty([]))
      .subscribe((results) => {
        this.concepts = [...this.concepts, ...results];
        this.concepts.sort((a, b) => a.label.localeCompare(b.label));
        this.conceptsLoaded = true;
        this.showSkeleton = false;
      });
  }

  ngAfterViewChecked() {
    if (this.conceptsLoaded && this.limitTagsHeight) {
      const currentWidth = this.cardComponent.nativeElement.clientWidth;
      this.maxOverflowWidth = currentWidth * 1.4;
      this.minOverflowWidth = currentWidth * 0.6;
      this.overflow = this.checkOverflow();
      this.limitTagsHeight = false;
      this.cdr.detectChanges();
    }
  }

  compactConceptsChanged = () => (this.compactConcepts = !this.compactConcepts);

  checkOverflow(): boolean {
    const containerHeight = this.containerElement.nativeElement.clientHeight;
    const subjectsHeight = this.subjectsElement.nativeElement.scrollHeight;
    return subjectsHeight > containerHeight;
  }

  onClickConcept(code: string): void {
    window.open(`https://geospacebok.eu/${code}`);
  }

  onClickTitle(event: MouseEvent): void {
    event.preventDefault();
    this.router.navigate([`profile/${this.occupationalProfile._id}`]);
  }

  checkUser() {
    return this.organizations.includes(this.occupationalProfile.orgId);
  }

  editProfile() {
    this.router.navigate([`profile/edit/${this.occupationalProfile._id}`], {
      queryParams: { origin: 'explorer' },
    });
  }

  duplicateProfile() {
    this.router.navigate([`profile/new/${this.occupationalProfile._id}`], {
      queryParams: { origin: 'explorer' },
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
      .deleteOccupationalProfile(this.occupationalProfile!)
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
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Profile successfully deleted!`,
              life: 3000,
              closable: true,
            });
        }),
      )
      .subscribe();
  }

  copyLink(): void {
    navigator.clipboard.writeText(
      window.location.href + `profile/${this.occupationalProfile._id}`,
    );

    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: `You copied the profile url to clipboard!`,
      life: 3000,
      closable: true,
    });
  }

  downloadPDF(): void {
    document.body.style.cursor = 'wait';
    this.op.hide();

    this.pdfService
      .generatePortfolioPdf(new OccupationalProfile(this.occupationalProfile))
      .subscribe((pdf) => {
        this.downloadURI(pdf.url, pdf.filename);
        document.body.style.cursor = '';
      });
  }

  downloadRDF(format: 'ttl' | 'xml' | 'rdfa'): void {
    document.body.style.cursor = 'wait';
    this.op.hide();

    const fileName = (this.occupationalProfile.title || 'default_name')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w_-]/g, '')
      .toLowerCase();
    const newProfile = new OccupationalProfile(this.occupationalProfile);

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

  downloadJSON() {
    this.op.hide();

    const fileName = (this.occupationalProfile.title || 'default_name')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w_-]/g, '')
      .toLowerCase();

    const plainProfile = this.occupationalProfile.toPlain();
    delete plainProfile['_id'];
    delete plainProfile['userId'];
    delete plainProfile['orgId'];
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
