import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Popover, PopoverModule } from 'primeng/popover';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, finalize, of, take } from 'rxjs';
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
  ],
})
export class ProfileCardComponent implements OnInit {
  @Input() occupationalProfile!: OccupationalProfile;
  @Input() logged: boolean = false;

  concepts: string[] = [];
  selectedConceptsColor: Map<string, string> = new Map();
  selectedConceptsTooltip: Map<string, string> = new Map();

  private organizations: string[] = [];

  @ViewChild('op') op!: Popover;

  constructor(
    private bokInfo: BokInformationService,
    private utilsService: UtilsService,
    private router: Router,
    private firebaseService: FirebaseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private occupationalProfileService: OccupationalProfileService,
    private pdfService: PdfService,
    private rdfService: RdfService,
  ) {}

  ngOnInit() {
    this.firebaseService.getUserOrganizationList().subscribe((orgs) => {
      orgs.forEach((org) => this.organizations.push(org._id));
    });

    this.occupationalProfile.knowledge.forEach((concept) => {
      this.concepts.push(concept);

      this.bokInfo.getConceptColor(concept).subscribe((color) => {
        const softColor = color
          ? this.utilsService.convertHexToRgba(color, 0.5)
          : '';

        this.selectedConceptsColor.set(concept, softColor);
      });

      this.bokInfo
        .getConceptName(concept)
        .subscribe((tooltip) =>
          this.selectedConceptsTooltip.set(concept, tooltip),
        );
    });

    this.concepts.sort();
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

  private downloadURI(uri: string, name: string): void {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    link.click();
  }
}
