import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { combineLatest, filter } from 'rxjs';
import { FilterOption } from '../../models/filterOption';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { CardFilterService } from '../../services/cardFilter.service';
import { FirebaseService } from '../../services/firebase.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { FiltersComponent } from '../filters/filters.component';
import { ProfileCardComponent } from '../profileCard/profileCard.component';

@Component({
  standalone: true,
  selector: 'profile-explorer',
  templateUrl: './profileExplorer.component.html',
  styleUrls: ['./profileExplorer.component.css'],
  imports: [
    CommonModule,
    DividerModule,
    PaginatorModule,
    SkeletonModule,
    FiltersComponent,
    ProfileCardComponent,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ProfileExplorerComponent implements OnInit, AfterViewInit {
  loading: boolean = true;
  skeletonElements: number[] = [];

  first: number = 0;
  rows: number = 6;
  paginatedProfiles: OccupationalProfile[] = [];

  bokConcepts: string[] = [];
  filterOptions: FilterOption[] = [];
  searchOption: string = 'Title';
  searchValue: string = '';
  visibilityFilter: string = 'all';
  filteredProfiles: OccupationalProfile[] = [];

  private profiles: OccupationalProfile[] = [];
  private organizations: string[] = [];

  constructor(
    private occupationalProfileService: OccupationalProfileService,
    private filterService: CardFilterService,
    private firebaseService: FirebaseService,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.skeletonElements = Array(this.rows);
  }

  ngOnInit() {
    const profiles$ = this.occupationalProfileService
      .getOccupationalProfiles()
      .pipe(filter((p) => !!p));
    combineLatest([
      this.firebaseService.getUserOrganizationList(),
      this.filterService.getFilterOptions(),
      profiles$,
    ]).subscribe(([orgs, filters, profiles]) => {
      this.organizations = orgs.map((o) => o._id);
      this.filterOptions = filters;
      this.profiles = profiles;

      this.searchOption = this.filterService.searchOption;
      this.searchValue = this.filterService.searchValue;
      this.visibilityFilter = this.filterService.visibilityFilter;

      this.filterPipeline();
      this.loading = false;
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe((params) => {
      const submitted: boolean = params['submitted'];
      const mode: string = params['mode'];
      if (submitted) {
        switch (mode) {
          case 'delete':
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Profile deleted without problems.`,
              life: 3000,
              closable: true,
            });
            break;
        }
      }
    });
  }

  isLogged(): boolean {
    return this.firebaseService.getUserData() != null;
  }

  trackById(index: number, item: any): string | number {
    return item._id ?? item.id ?? index;
  }

  onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 6;
    this.filterService.paginatorState = event;

    this.updatePaginatedProfiles();
  }

  setBoKConcepts(concepts: string[]): void {
    this.bokConcepts = concepts;
    this.filterService.bokConcepts = concepts;

    this.filterPipeline();
  }

  setSearchOption(option: string): void {
    this.searchOption = option;
    this.filterService.searchOption = option;

    this.filterPipeline();
  }

  setSearchValue(value: string): void {
    this.searchValue = value;
    this.filterService.searchValue = value;

    this.filterPipeline();
  }

  setVisibilityFilter(filter: string): void {
    this.visibilityFilter = filter;
    this.filterService.visibilityFilter = filter;

    this.filterPipeline();
  }

  filterPipeline(): void {
    this.first = 0;

    const searched = this.searchProfiles(this.profiles);
    const filtered = this.filterProfiles(searched);
    this.filteredProfiles = this.filterByBoKConcept(filtered);

    this.updatePaginatedProfiles();
  }

  private updatePaginatedProfiles(): void {
    this.paginatedProfiles = this.filteredProfiles.slice(
      this.first,
      this.first + this.rows
    );
  }

  private searchProfiles(
    profiles: OccupationalProfile[]
  ): OccupationalProfile[] {
    const searchedProfiles: OccupationalProfile[] = [];
    const value = this.searchValue.trim().toLowerCase();

    switch (this.searchOption) {
      case 'Title':
        profiles.forEach((profile) => {
          if (profile.title.trim().toLowerCase().includes(value))
            searchedProfiles.push(profile);
        });

        break;

      case 'Description':
        profiles.forEach((profile) => {
          if (profile.description.trim().toLowerCase().includes(value))
            searchedProfiles.push(profile);
        });

        break;

      case 'Skills':
        profiles.forEach((profile) => {
          if (
            profile.skills.some((skill) =>
              skill.trim().toLowerCase().includes(value)
            ) ||
            profile.customSkills.some((skill) =>
              skill.trim().toLowerCase().includes(value)
            )
          )
            searchedProfiles.push(profile);
        });

        break;

      case 'Transversal Skills':
        profiles.forEach((profile) => {
          if (
            profile.competences.some((competence) =>
              competence.preferredLabel.trim().toLowerCase().includes(value)
            ) ||
            profile.customCompetences.some((competence) =>
              competence.trim().toLowerCase().includes(value)
            )
          )
            searchedProfiles.push(profile);
        });

        break;

      default:
        console.log('Invalid Search Option');
    }

    return searchedProfiles;
  }

  private filterProfiles(
    profiles: OccupationalProfile[]
  ): OccupationalProfile[] {
    const userId = this.firebaseService.getUserData()?.uid;

    let filteredProfiles = profiles.filter((profile) => {
      switch (this.visibilityFilter) {
        case 'mine':
          return userId ? profile.userId === userId : false;

        case 'organization':
          return this.organizations.includes(profile.orgId);

        case 'all':
        default:
          if (userId) return profile.isPublic || profile.userId === userId;
          return profile.isPublic;
      }
    });

    filteredProfiles = filteredProfiles.filter((profile) =>
      this.filterOptions.every(
        (filter) =>
          !filter.selection ||
          filter.selection.length === 0 ||
          this.filterService.checkProfile(profile, filter)
      )
    );

    return filteredProfiles;
  }

  private filterByBoKConcept(
    profiles: OccupationalProfile[]
  ): OccupationalProfile[] {
    if (this.bokConcepts.length === 0) return profiles;

    return profiles.filter((profile) =>
      this.bokConcepts.some((concept) => profile.knowledge.includes(concept))
    );
  }
}
