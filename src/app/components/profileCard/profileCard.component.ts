import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, finalize, of, take } from 'rxjs';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { UtilsService } from '../../services/utils.service';

@Component({
  standalone: true,
  selector: 'profile-card',
  templateUrl: './profileCard.component.html',
  styleUrl: './profileCard.component.css',
  imports: [CommonModule, ButtonModule, CardModule, TagModule, TooltipModule],
})
export class ProfileCardComponent implements OnInit {
  @Input() occupationalProfile!: OccupationalProfile;

  concepts: string[] = [];
  selectedConceptsColor: Map<string, string> = new Map();
  selectedConceptsTooltip: Map<string, string> = new Map();

  private organizations: string[] = [];

  constructor(
    private bokInfo: BokInformationService,
    private utilsService: UtilsService,
    private router: Router,
    private firebaseService: FirebaseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private occupationalProfileService: OccupationalProfileService
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
          this.selectedConceptsTooltip.set(
            concept,
            tooltip ? tooltip : 'Deprecated concept'
          )
        );
    });

    this.concepts.sort();
  }

  onClickConcept(code: string): void {
    window.open('https://geospacebok.eu/' + code);
  }

  onClickTitle(event: MouseEvent): void {
    event.preventDefault();
    this.router.navigate(['profile/' + this.occupationalProfile._id]);
  }

  checkUser() {
    return this.organizations.includes(this.occupationalProfile.orgId);
  }

  editProfile() {
    this.router.navigate(['profile/edit/' + this.occupationalProfile._id]);
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
        })
      )
      .subscribe();
  }
}
