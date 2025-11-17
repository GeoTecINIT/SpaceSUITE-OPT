import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginatorState } from 'primeng/paginator';
import { BehaviorSubject, map, Observable, switchMap, take, tap } from 'rxjs';
import { FilterOption } from '../models/filterOption';
import { OccupationalProfile } from '../models/occupationalProfile';
import { OccupationalProfileService } from './occupationalProfile.service';

@Injectable({
  providedIn: 'root',
})
export class CardFilterService {
  bokConcepts: string[] = [];
  paginatorState: PaginatorState = {};
  searchOption: string = 'Title';
  searchValue: string = '';
  userFilter: boolean = false;

  private filterOptionsSubject = new BehaviorSubject<FilterOption[]>([]);

  constructor(
    private http: HttpClient,
    private profileService: OccupationalProfileService
  ) {
    this.http
      .get<FilterOption[]>('/assets/filters.json')
      .pipe(
        take(1),
        switchMap((filters) =>
          this.profileService.getProfilesOrganizations().pipe(
            tap((orgs) => {
              const orgsFilter = filters.find(
                (f) => f.label === 'Organizations'
              );

              if (orgsFilter) orgsFilter.values = orgs;

              this.filterOptionsSubject.next(filters);
            })
          )
        )
      )
      .subscribe();
  }

  checkProfile(profile: OccupationalProfile, filter: FilterOption): boolean {
    switch (filter.label) {
      case 'EQF Level':
        return filter.selection.some(
          (selection) => profile.eqf.toString() === selection.slice(-1)
        );

      case 'Organizations':
        return filter.selection.some(
          (selection) =>
            profile.orgName?.trim().toLowerCase() ===
            selection.trim().toLowerCase()
        );

      default:
        return true;
    }
  }

  getFilterOptions(): Observable<FilterOption[]> {
    return this.filterOptionsSubject.asObservable().pipe(
      map((filters) => {
        return filters.map((f) => ({
          ...f,
          values: f.values ?? [],
          selection: f.selection ?? [],
        }));
      })
    );
  }

  updateFilterOptions(filters: FilterOption[]) {
    this.filterOptionsSubject.next(filters);
  }
}
