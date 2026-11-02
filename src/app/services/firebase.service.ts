import { inject, Injectable } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  docData,
  Firestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { combineLatest, concatMap, from, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { OccupationalProfile } from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  userId: string = '';

  private orgCollection: CollectionReference;
  private profileCollection: CollectionReference<OccupationalProfile>;

  private userOrganizations$?: Observable<{ _id: string, name: string }[]>


  constructor(
    private auth: Auth = inject(Auth),
    private db: Firestore = inject(Firestore),
  ) {
    this.orgCollection = collection(this.db, 'Organizations');
    this.profileCollection = collection(
      this.db,
      'OcuProfiles',
    ) as CollectionReference<OccupationalProfile>;

    authState(this.auth).subscribe((user) => (this.userId = user?.uid ?? ''));
  }

  getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return collectionData(this.profileCollection, { idField: '_id' }).pipe(
      map((items) =>
        items.map((data) => OccupationalProfile.fromFirestore(data)),
      ),
    );
  }

  getOrganizationDivisions(orgId: string): Observable<string[]> {
    const orgDocRef = doc(this.orgCollection, orgId);
    const organizationUsersSnapshot = docData(orgDocRef) as Observable<{
      divisions: string[];
    }>;

    return organizationUsersSnapshot.pipe(map((data) => data.divisions));
  }

  getUserData(): User | null {
    return this.auth.currentUser;
  }

  getUserOrganizationList(): Observable<{ _id: string, name: string }[]> {
    if (!this.userOrganizations$) {
      this.userOrganizations$ = authState(this.auth).pipe(
        switchMap(user => {
          if (!user) return of([]);
          const regularQuery = query(
            this.orgCollection,
            where('regular', 'array-contains', user.uid)
          );
          const adminQuery = query(
            this.orgCollection,
            where('admin', 'array-contains', user.uid)
          );
          return combineLatest([
            collectionData(regularQuery) as Observable<{ _id: string, name: string }[]>,
            collectionData(adminQuery) as Observable<{ _id: string, name: string }[]>,
          ]).pipe(
            map(([regular, admin]) => {
              const seen = new Set<string>();
              return [...regular, ...admin].filter(org => {
                if (seen.has(org._id)) return false;
                seen.add(org._id);
                return true;
              })
            })
          )
        }),
        shareReplay({bufferSize: 1, refCount: true})
      );
    }
    return this.userOrganizations$;
  }

  updateOccupationalProfile(profile: OccupationalProfile): Observable<string> {
    const newDocRef = doc(this.profileCollection, profile._id);
    profile.updatedAt = serverTimestamp();
    profile.lastModified = new Date().toDateString();

    return from(setDoc(newDocRef, profile.toPlain())).pipe(
      map(() => profile._id),
    );
  }

  setOccupationalProfile(profile: OccupationalProfile): Observable<string> {
    const newDocRef = doc(this.profileCollection);
    profile.createdAt = serverTimestamp();
    profile.updatedAt = serverTimestamp();
    profile.lastModified = new Date().toDateString();
    profile._id = newDocRef.id;

    return of(setDoc(newDocRef, profile.toPlain())).pipe(
      map(() => profile._id),
    );
  }

  deleteOccupationalProfile(profile: OccupationalProfile): Observable<void> {
    const docRef = doc(this.profileCollection, profile._id);
    return from(deleteDoc(docRef)).pipe(
      concatMap(() => {
        return of();
      }),
    );
  }
}
