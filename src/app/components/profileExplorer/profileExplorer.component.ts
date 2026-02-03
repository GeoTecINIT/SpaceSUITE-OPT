import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { combineLatest, filter, map, Subscription, take } from 'rxjs';
import { Filter } from '../../models/filter';
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
    ButtonModule,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ProfileExplorerComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  loading: boolean = true;
  skeletonElements: number[] = [];

  first: number = 0;
  rows: number = 6;
  paginatedProfiles: OccupationalProfile[] = [];

  bokConcepts: string[] = [];
  filterOptions: Filter[] = [];
  searchOption: string = 'Title';
  searchValue: string = '';
  visibilityFilter: string = 'all';
  filteredProfiles: OccupationalProfile[] = [];

  @ViewChild('container') containerRef!: ElementRef;
  buttonBottom = 32;

  private profiles: OccupationalProfile[] = [];
  private organizations: string[] = [];

  private occupationalProfilesSubscription!: Subscription;

  constructor(
    private occupationalProfileService: OccupationalProfileService,
    private filterService: CardFilterService,
    private firebaseService: FirebaseService,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.skeletonElements = Array(this.rows);
  }

  ngOnInit() {
    this.occupationalProfilesSubscription = combineLatest([
      this.firebaseService
        .getUserOrganizationList()
        .pipe(map((orgs) => orgs.map((o) => o._id))),
      this.filterService.getFilters(),
      this.occupationalProfileService
        .getOccupationalProfiles()
        .pipe(filter((p) => p !== undefined)),
    ]).subscribe(([orgs, filters, profiles]) => {
      this.organizations = orgs;
      this.filterOptions = filters;
      this.profiles = profiles;

      this.searchOption = this.filterService.searchOption;
      this.searchValue = this.filterService.searchValue;
      this.bokConcepts = this.filterService.bokConcepts;
      if (!this.isLogged()) {
        this.visibilityFilter = 'all';
        this.filterService.visibilityFilter = 'all';
      } else {
        this.visibilityFilter = this.filterService.visibilityFilter;
      }

      this.filterPipeline();

      if (this.filterService.paginatorState) {
        this.onPageChange(this.filterService.paginatorState);
      }

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

    window.addEventListener('scroll', this.updateButtonPosition);
    window.addEventListener('resize', this.updateButtonPosition);
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.updateButtonPosition);
    window.removeEventListener('resize', this.updateButtonPosition);
    this.occupationalProfilesSubscription.unsubscribe();
  }

  isLogged(): boolean {
    return this.firebaseService.getUserData() !== null;
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
    setTimeout(() => {
      this.visibilityFilter = filter;
      this.filterService.visibilityFilter = filter;
      this.filterService.paginatorState.first = 0;

      this.filterPipeline();
    });
  }

  filterPipeline(): void {
    this.first = 0;

    const searched = this.searchProfiles(this.profiles);
    const filtered = this.filterProfiles(searched);
    this.filteredProfiles = this.filterByBoKConcept(filtered);

    this.updatePaginatedProfiles();
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.updateButtonPosition();
    });
  }

  createOccupationalProfile() {
    this.router.navigate(['profile/new'], {
      queryParams: { origin: 'explorer' },
    });
  }

  private updateButtonPosition = () => {
    const element = this.containerRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const bottomOverlap = window.innerHeight - rect.bottom;
    const newButtonBottom = Math.max(bottomOverlap, 32);
    if (this.buttonBottom !== newButtonBottom) {
      this.buttonBottom = newButtonBottom;
    }
  };

  private updatePaginatedProfiles(): void {
    this.paginatedProfiles = this.filteredProfiles.slice(
      this.first,
      this.first + this.rows,
    );
  }

  private searchProfiles(
    profiles: OccupationalProfile[],
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
              skill.trim().toLowerCase().includes(value),
            ) ||
            profile.customSkills.some((skill) =>
              skill.trim().toLowerCase().includes(value),
            )
          )
            searchedProfiles.push(profile);
        });

        break;

      case 'Transversal Skills':
        profiles.forEach((profile) => {
          if (
            profile.competences.some((competence) =>
              competence.preferredLabel.trim().toLowerCase().includes(value),
            ) ||
            profile.customCompetences.some((competence) =>
              competence.trim().toLowerCase().includes(value),
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
    profiles: OccupationalProfile[],
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
          if (userId)
            return (
              profile.isPublic ||
              profile.userId === userId ||
              this.organizations.includes(profile.orgId)
            );
          return profile.isPublic;
      }
    });

    filteredProfiles = filteredProfiles.filter((profile) =>
      this.filterOptions.every(
        (filter) =>
          !filter.selection ||
          filter.selection.length === 0 ||
          this.filterService.checkProfile(profile, filter),
      ),
    );

    return filteredProfiles;
  }

  private filterByBoKConcept(
    profiles: OccupationalProfile[],
  ): OccupationalProfile[] {
    if (this.bokConcepts.length === 0) return profiles;

    return profiles.filter((profile) =>
      this.bokConcepts.some((concept) => profile.knowledge.includes(concept)),
    );
  }
}
