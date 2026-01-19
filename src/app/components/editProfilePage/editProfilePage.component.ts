import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExitWithoutSavingService } from '@eo4geo/ngx-bok-utils';
import { concatMap, EMPTY } from 'rxjs';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { ProfileFormComponent } from '../profileForm/profileForm.component';

@Component({
  standalone: true,
  selector: 'edit-profile-page',
  templateUrl: './editProfilePage.component.html',
  imports: [ProfileFormComponent, CommonModule],
})
export class EditProfilePageComponent implements OnInit {
  profile?: OccupationalProfile;
  isDuplicate: boolean = false;

  constructor(
    private occupationalProfileService: OccupationalProfileService,
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private exitWithoutSavingService: ExitWithoutSavingService,
  ) {}

  ngOnInit() {
    this.isDuplicate = this.router.url.includes('/profile/new/');
    const profileId = this.route.snapshot.paramMap.get('profileId') || '';

    this.occupationalProfileService
      .getOccupationalProfile(profileId)
      .pipe(
        concatMap((profile?: OccupationalProfile) => {
          if (!profile) {
            this.notFound();

            return EMPTY;
          }

          return this.firebaseService.getUserOrganizationList().pipe(
            concatMap((orgsList) => {
              if (this.isDuplicate) {
                this.duplicateProfile(profile, orgsList);
              } else {
                this.loadProfile(profile);

                if (!this.canEditProfile(orgsList)) {
                  this.notFound();

                  return EMPTY;
                }
              }

              return EMPTY;
            }),
          );
        }),
      )
      .subscribe();
  }

  private notFound(): void {
    this.exitWithoutSavingService.bypassGuard.next(true);
    this.router.navigate(['/not_found']);
  }

  private duplicateProfile(
    originalProfile: OccupationalProfile,
    userOrgs: { _id: string; name: string }[],
  ): void {
    this.profile = new OccupationalProfile(originalProfile);
    this.profile._id = '';
    this.profile.createdAt = undefined;
    this.profile.eqf = 'EQF ' + this.profile.eqf;
    this.profile.lastModified = '';
    this.profile.updatedAt = undefined;
    this.profile.userId = '';

    if (!userOrgs.some((o) => o._id === this.profile?.orgId)) {
      this.profile.orgId = '';
      this.profile.orgName = '';
      this.profile.division = '';
    }
  }

  private loadProfile(originalProfile: OccupationalProfile): void {
    this.profile = new OccupationalProfile(originalProfile);
    this.profile.eqf = 'EQF ' + this.profile.eqf;
  }

  private canEditProfile(orgsList: { _id: string; name: string }[]): boolean {
    const belongsToOrg = orgsList.some((o) => o._id === this.profile?.orgId);
    const userData = this.firebaseService.getUserData();
    const isCreator =
      userData !== null && this.profile?.userId === userData.uid;

    return belongsToOrg || isCreator;
  }
}
