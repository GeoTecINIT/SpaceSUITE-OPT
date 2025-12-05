import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExitWithoutSavingService } from '@eo4geo/ngx-bok-utils';
import { concatMap } from 'rxjs';
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

  constructor(
    private occupationalProfileService: OccupationalProfileService,
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private exitWithoutSavingService: ExitWithoutSavingService
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        concatMap((params) => {
          const profileName = params.get('dynamicValue') || '';
          return this.occupationalProfileService.getOccupationalProfile(
            profileName
          );
        }),
        concatMap((profile?: OccupationalProfile) => {
          if (profile) this.loadProfile(profile);
          return this.firebaseService.getUserOrganizationList();
        })
      )
      .subscribe((orgsList: { _id: string; name: string }[]) => {
        const userData = this.firebaseService.getUserData();
        const userOrgIds = orgsList.map((org) => org._id);
        if (
          !this.profile ||
          !(
            (this.profile.orgId && userOrgIds.includes(this.profile.orgId)) ||
            (userData && this.profile.userId === userData.uid)
          )
        ) {
          this.exitWithoutSavingService.bypassGuard.next(true);
          this.router.navigate(['/not_found']);
        }
      });
  }

  private loadProfile(newProfile: OccupationalProfile) {
    this.profile = new OccupationalProfile(newProfile);
    this.profile.eqf = 'EQF ' + this.profile.eqf;
  }
}
