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
  private profiles$: Observable<Map<string, OccupationalProfile>> =
    this.profilesMap.pipe(
      filter((m): m is Map<string, OccupationalProfile> => m !== undefined)
    );

  constructor(private firebaseService: FirebaseService) {
    this.firebaseService
      .getOccupationalProfiles()
      .pipe(
        tap((profiles) => {
          const formattedProfiles = this.formatOccupationalProfiles(profiles);
          const map = new Map(formattedProfiles.map((p) => [p._id, p]));
          this.profilesMap.next(map);
        })
      )
      .subscribe();
  }

  getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return this.profiles$.pipe(map((map) => Array.from(map.values())));
  }

  getOccupationalProfile(
    id: string
  ): Observable<OccupationalProfile | undefined> {
    return this.profiles$.pipe(map((map) => map.get(id)));
  }

  getProfilesOrganizations(): Observable<string[]> {
    return this.profiles$.pipe(
      map((map) => [
        ...new Set(
          Array.from(map.values())
            .filter((p) => !!p.orgName)
            .map((p) => p.orgName!)
        ),
      ])
    );
  }

  deleteOccupationalProfile(profile: OccupationalProfile): Observable<void> {
    return this.firebaseService.deleteOccupationalProfile(profile);
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
