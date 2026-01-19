import { Injectable } from '@angular/core';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import {
  BehaviorSubject,
  concatMap,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';
import { OccupationalProfile } from '../models/occupationalProfile';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root',
})
export class OccupationalProfileService {
  private profilesMap: BehaviorSubject<
    Map<string, OccupationalProfile> | undefined
  > = new BehaviorSubject<Map<string, OccupationalProfile> | undefined>(
    undefined,
  );
  private profiles$: Observable<Map<string, OccupationalProfile>> =
    this.profilesMap.pipe(
      filter((m): m is Map<string, OccupationalProfile> => m !== undefined),
    );

  constructor(
    private firebaseService: FirebaseService,
    private bokInfoService: BokInformationService,
  ) {
    this.firebaseService
      .getOccupationalProfiles()
      .pipe(
        tap((profiles) => {
          const formattedProfiles = this.formatOccupationalProfiles(profiles);
          const map = new Map(formattedProfiles.map((p) => [p._id, p]));
          this.profilesMap.next(map);
        }),
      )
      .subscribe();
  }

  getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return this.profiles$.pipe(map((map) => Array.from(map.values())));
  }

  getOccupationalProfile(
    id: string,
  ): Observable<OccupationalProfile | undefined> {
    return this.profiles$.pipe(map((map) => map.get(id)));
  }

  getProfilesOrganizations(): Observable<string[]> {
    return this.profiles$.pipe(
      map((map) => [
        ...new Set(
          Array.from(map.values())
            .filter((p) => !!p.orgName)
            .map((p) => p.orgName!),
        ),
      ]),
    );
  }

  validateOccupationalProfile(
    profile: OccupationalProfile,
  ): Map<string, string | undefined> {
    const errors: Map<string, string | undefined> = new Map();

    const setError = (field: string, condition: boolean, message: string) => {
      errors.set(field, condition ? message : undefined);
    };

    setError('title', !profile.title.trim(), 'Title is required.');
    setError(
      'description',
      !profile.description.trim(),
      'Description is required.',
    );
    setError('eqf', !profile.eqf.trim(), 'EQF level is required.');
    setError(
      'organization',
      !profile.orgId?.trim(),
      'Organization is required.',
    );
    setError(
      'knowledge',
      profile.knowledge.length === 0,
      'At least one concept is required.',
    );
    setError(
      'skills',
      profile.skills.length === 0 && profile.customSkills.length === 0,
      'At least one skill is required.',
    );

    return errors;
  }

  submitOccupationalProfile(
    profile: OccupationalProfile,
    update: boolean = false,
  ): Observable<string> {
    const newProfile = new OccupationalProfile(profile);
    newProfile.eqf = newProfile.eqf.replace('EQF', '').trim();

    const conceptObservables =
      newProfile.knowledge.length > 0
        ? forkJoin(
            newProfile.knowledge.map((concept) =>
              this.bokInfoService.getConceptName(concept).pipe(
                take(1),
                map((conceptName) => `[${concept}] ${conceptName}`),
              ),
            ),
          )
        : of([]);
    return conceptObservables.pipe(
      concatMap((formattedConcepts) => {
        newProfile.knowledge = formattedConcepts;
        if (update)
          return this.firebaseService.updateOccupationalProfile(newProfile);
        return this.firebaseService.setOccupationalProfile(newProfile);
      }),
    );
  }

  deleteOccupationalProfile(profile: OccupationalProfile): Observable<void> {
    return this.firebaseService.deleteOccupationalProfile(profile);
  }

  private formatOccupationalProfiles(
    profiles: OccupationalProfile[],
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
