import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, map, Observable, tap } from 'rxjs';
import { OccupationalProfile } from '../models/occupationalProfile';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root',
})
export class OccupationalProfileService {
  private profilesMap: BehaviorSubject<
    Map<string, OccupationalProfile> | undefined
  > = new BehaviorSubject<Map<string, OccupationalProfile> | undefined>(
    undefined
  );
  private profiles$ = this.profilesMap
    .asObservable()
    .pipe(filter((map): map is Map<string, OccupationalProfile> => !!map));

  constructor(private firebaseService: FirebaseService) {
    this.firebaseService
      .getOccupationalProfiles()
      .pipe(
        tap((profiles) => {
          const map = new Map(
            this.formatOccupationalProfiles(profiles).map((p) => [p._id, p])
          );
          this.profilesMap.next(map);
        })
      )
      .subscribe();
  }

  public getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return this.profiles$.pipe(
      map((profileMap) => Array.from(profileMap.values()))
    );
  }

  public getProfilesOrganizations(): Observable<string[]> {
    return this.profiles$.pipe(
      map((profileMap) => [
        ...new Set(
          Array.from(profileMap.values())
            .filter((p) => !!p.orgName)
            .map((p) => p.orgName!)
        ),
      ])
    );
  }

  private formatOccupationalProfiles(
    profiles: OccupationalProfile[]
  ): OccupationalProfile[] {
    return profiles.map((profile) => {
      const newProfile = new OccupationalProfile(profile);
      newProfile.knowledge = this.formatFirestoreConcepts(newProfile.knowledge);

      return newProfile;
    });
  }

  private formatFirestoreConcepts(concepts: string[]): string[] {
    return concepts
      .map((c) => /\[(.*?)\]/.exec(c)?.[1])
      .filter((c): c is string => !!c);
  }
}
