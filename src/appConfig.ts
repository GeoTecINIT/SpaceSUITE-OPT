import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideProtractorTestingSupport } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Routes, withRouterConfig } from '@angular/router';
import {
  AuthGuard,
  NotFoundPageComponent,
  OrganizationPageComponent,
  UserPageComponent,
} from '@eo4geo/ngx-bok-utils';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { ProfileExplorerComponent } from './app/components/profileExplorer/profileExplorer.component';
import { environment } from './environments/environment';

const routes: Routes = [
  { path: '', component: ProfileExplorerComponent },
  {
    path: 'profile',
    component: UserPageComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'organizations',
    component: OrganizationPageComponent,
    canActivate: [AuthGuard],
    runGuardsAndResolvers: 'always',
  },
  { path: '**', component: NotFoundPageComponent },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      })
    ),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.FIREBASE)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
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
