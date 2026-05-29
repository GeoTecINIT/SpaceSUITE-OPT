import { Injectable } from '@angular/core';
import { OccupationalProfile } from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class CardSortingService {
  sortOption: string = 'Title';
  sortAsc: boolean = false;

  sortProfiles(inputProfiles: OccupationalProfile[]): OccupationalProfile[] {
    let sortedProfiles = [...inputProfiles];

    switch (this.sortOption) {
      case 'Title':
        if (this.sortAsc) {
          sortedProfiles = sortedProfiles.sort((a, b) =>
            b.title.localeCompare(a.title),
          );
        } else {
          sortedProfiles = sortedProfiles.sort((a, b) =>
            a.title.localeCompare(b.title),
          );
        }

        break;

      case 'Last updated':
        if (this.sortAsc) {
          sortedProfiles = sortedProfiles.sort(
            (a, b) =>
              new Date(a.lastModified).getTime() -
              new Date(b.lastModified).getTime(),
          );
        } else {
          sortedProfiles = sortedProfiles.sort(
            (a, b) =>
              new Date(b.lastModified).getTime() -
              new Date(a.lastModified).getTime(),
          );
        }

        break;
    }

    return sortedProfiles;
  }
}
