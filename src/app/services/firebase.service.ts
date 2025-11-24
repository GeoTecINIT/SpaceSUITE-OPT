import { inject, Injectable } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  Firestore,
} from '@angular/fire/firestore';
import { concatMap, from, Observable, of } from 'rxjs';
import { OccupationalProfile } from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  userId: string = '';

  private profileCollection: CollectionReference<OccupationalProfile>;

  constructor(
    private auth: Auth = inject(Auth),
    private db: Firestore = inject(Firestore)
  ) {
    this.profileCollection = collection(
      this.db,
      'OcuProfiles'
    ) as CollectionReference<OccupationalProfile>;

    authState(this.auth).subscribe((user) => (this.userId = user?.uid ?? ''));
  }

  getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return collectionData(this.profileCollection, {
      idField: '_id',
    }) as Observable<OccupationalProfile[]>;
  }

  getUserData(): User | null {
    return this.auth.currentUser;
  }

  deleteOccupationalProfile(profile: OccupationalProfile): Observable<void> {
    const docRef = doc(this.profileCollection, profile._id);
    return from(deleteDoc(docRef)).pipe(
      concatMap(() => {
        return of();
      })
    );
  }
}
