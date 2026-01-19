import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideProtractorTestingSupport } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Routes } from '@angular/router';
import {
  AuthGuard,
  exitWithoutSavingGuard,
  NotFoundPageComponent,
  OrganizationPageComponent,
  UserPageComponent,
} from '@eo4geo/ngx-bok-utils';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { EditProfilePageComponent } from './app/components/editProfilePage/editProfilePage.component';
import { ProfileExplorerComponent } from './app/components/profileExplorer/profileExplorer.component';
import { ProfileFormComponent } from './app/components/profileForm/profileForm.component';
import { ProfilePageComponent } from './app/components/profilePage/profilePage.component';
import { environment } from './environments/environment';

const routes: Routes = [
  { path: '', component: ProfileExplorerComponent },
  {
    path: 'userProfile',
    component: UserPageComponent,
    canMatch: [AuthGuard],
  },
  {
    path: 'organizations',
    component: OrganizationPageComponent,
    canMatch: [AuthGuard],
  },
  { path: 'profile', redirectTo: '', pathMatch: 'full' },
  {
    path: 'profile/new',
    component: ProfileFormComponent,
    canMatch: [AuthGuard],
    canDeactivate: [exitWithoutSavingGuard],
  },
  {
    path: 'profile/new/:profileId',
    component: EditProfilePageComponent,
    canMatch: [AuthGuard],
    canDeactivate: [exitWithoutSavingGuard],
  },
  {
    path: 'profile/edit/:profileId',
    component: EditProfilePageComponent,
    canMatch: [AuthGuard],
    canDeactivate: [exitWithoutSavingGuard],
  },
  { path: 'profile/:profileId', component: ProfilePageComponent },
  { path: 'not_found', component: NotFoundPageComponent },
  { path: '**', component: NotFoundPageComponent },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.FIREBASE)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideProtractorTestingSupport(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          prefix: 'p',
          darkModeSelector: false,
          cssLayer: false,
        },
      },
    }),
  ],
};
