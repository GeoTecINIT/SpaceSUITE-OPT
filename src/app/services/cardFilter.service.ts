import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginatorState } from 'primeng/paginator';
import { combineLatest, map, Observable, ReplaySubject } from 'rxjs';
import { Filter } from '../models/filter';
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
  showPrivate: boolean = false;
  visibilityFilter: string = 'all';

  private filtersSubject: ReplaySubject<Filter[]> = new ReplaySubject<Filter[]>(
    1,
  );

  constructor(
    private readonly http: HttpClient,
    private readonly profileService: OccupationalProfileService,
  ) {
    combineLatest([
      this.http.get<Filter[]>('/assets/filters.json'),
      this.profileService.getOrganizations(),
    ])
      .pipe(
        map(([filters, organizations]) => {
          const updatedFilters = [...filters];
          updatedFilters[updatedFilters.length - 1].values = organizations;

          return updatedFilters;
        }),
      )
      .subscribe(this.filtersSubject);
  }

  checkProfile(profile: OccupationalProfile, filter: Filter): boolean {
    switch (filter.label) {
      case 'EQF Level':
        return filter.selection.some((s) => profile.eqf === s.slice(-1));

      case 'Organizations':
        return filter.selection.some(
          (s) =>
            profile.orgName?.trim().toLowerCase() === s.trim().toLowerCase(),
        );

      default:
        return true;
    }
  }

  getFilters(): Observable<Filter[]> {
    return this.filtersSubject.asObservable();
  }

  getFilter(label: string): Observable<Filter> {
    return this.filtersSubject.asObservable().pipe(
      map(
        (filters) =>
          filters.find((f) => f.label === label) ?? {
            label,
            values: [],
            selection: [],
          },
      ),
    );
  }
}
