import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { map, take } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

export const UserOrgsGuard: CanMatchFn = () => {
  const orgService = inject(FirebaseService);
  return orgService.getUserOrganizationList().pipe(
    take(1),
    map(orgs => orgs.length > 0)
  );
};