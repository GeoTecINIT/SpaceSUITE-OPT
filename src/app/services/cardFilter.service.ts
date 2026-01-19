import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginatorState } from 'primeng/paginator';
import { concatMap, map, Observable, ReplaySubject, take } from 'rxjs';
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
  visibilityFilter: string = 'all';

  private filterOptionsSubject: ReplaySubject<FilterOption[]> =
    new ReplaySubject<FilterOption[]>(1);

  constructor(
    private readonly http: HttpClient,
    private readonly profileService: OccupationalProfileService,
  ) {
    this.http
      .get<FilterOption[]>('/assets/filters.json')
      .pipe(
        take(1),
        concatMap((filters: FilterOption[]) => {
          return this.profileService
            .getProfilesOrganizations()
            .pipe(map((organizations) => ({ filters, organizations })));
        }),
      )
      .subscribe(({ filters, organizations }) => {
        const updatedFilters = [...filters];
        updatedFilters[updatedFilters.length - 1].values = organizations;
        this.filterOptionsSubject.next(updatedFilters);
      });
  }

  checkProfile(profile: OccupationalProfile, filter: FilterOption): boolean {
    switch (filter.label) {
      case 'EQF Level':
        return filter.selection.some(
          (selection) => profile.eqf === selection.slice(-1),
        );

      case 'Organizations':
        return filter.selection.some(
          (selection) =>
            profile.orgName?.trim().toLowerCase() ===
            selection.trim().toLowerCase(),
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
      }),
    );
  }

  getOptionByLabel(label: string): Observable<FilterOption> {
    return this.filterOptionsSubject.pipe(
      map((filterOptions) => {
        const option = filterOptions.filter((option) => option.label === label);

        if (option.length > 0) return option[0];

        return {
          label: label,
          values: [],
          selection: [],
        };
      }),
    );
  }
}
