import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExitWithoutSavingService } from '@eo4geo/ngx-bok-utils';
import { concatMap, EMPTY, tap } from 'rxjs';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { ProfileFormComponent } from '../profileForm/profileForm.component';

@Component({
  standalone: true,
  selector: 'edit-profile-page',
  templateUrl: './editProfilePage.component.html',
  imports: [ProfileFormComponent],
})
export class EditProfilePageComponent implements OnInit {
  isDuplicateSignal: WritableSignal<boolean> = signal(false);
  profileSignal: WritableSignal<OccupationalProfile | undefined> =
    signal(undefined);

  constructor(
    private occupationalProfileService: OccupationalProfileService,
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private exitWithoutSavingService: ExitWithoutSavingService,
  ) {}

  ngOnInit() {
    this.isDuplicateSignal.set(this.router.url.includes('/profile/new/'));
    const profileId = this.route.snapshot.paramMap.get('profileId');

    if (!profileId) {
      this.notFound();
      return;
    }

    this.occupationalProfileService
      .getOccupationalProfile(profileId)
      .pipe(
        concatMap((profile) => {
          if (!profile) {
            this.notFound();
            return EMPTY;
          }

          return this.firebaseService
            .getUserOrganizationList()
            .pipe(tap((orgs) => this.handleProfile(profile, orgs)));
        }),
      )
      .subscribe();
  }

  private notFound(): void {
    this.exitWithoutSavingService.bypassGuard.next(true);
    this.router.navigate(['/not_found']);
  }

  private handleProfile(
    profile: OccupationalProfile,
    organizations: { _id: string; name: string }[],
  ): void {
    if (this.isDuplicateSignal()) {
      this.duplicateProfile(profile, organizations);
    } else {
      if (this.canEditProfile(profile, organizations)) {
        this.loadProfile(profile);
      } else {
        this.notFound();
      }
    }
  }

  private duplicateProfile(
    originalProfile: OccupationalProfile,
    organizations: { _id: string; name: string }[],
  ): void {
    const profile = new OccupationalProfile(originalProfile);
    profile._id = '';
    profile.createdAt = undefined;

    if (!profile.eqf.startsWith('EQF ')) {
      profile.eqf = `EQF ${profile.eqf}`;
    }

    profile.lastModified = '';
    profile.updatedAt = undefined;
    profile.userId = '';

    if (!organizations.some((o) => o._id === profile.orgId)) {
      profile.orgId = '';
      profile.orgName = '';
      profile.division = '';
    }

    this.profileSignal.set(profile);
  }

  private loadProfile(originalProfile: OccupationalProfile): void {
    const profile = new OccupationalProfile(originalProfile);

    if (!profile.eqf.startsWith('EQF ')) {
      profile.eqf = `EQF ${profile.eqf}`;
    }

    this.profileSignal.set(profile);
  }

  private canEditProfile(
    profile: OccupationalProfile,
    organizations: { _id: string; name: string }[],
  ): boolean {
    const belongsToOrg = organizations.some((o) => o._id === profile.orgId);
    const userData = this.firebaseService.getUserData();
    const isCreator = userData !== null && profile.userId === userData.uid;

    return belongsToOrg || isCreator;
  }
}
