import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  collection,
  collectionData,
  CollectionReference,
  Firestore,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { OccupationalProfile } from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private profileCollection: CollectionReference<OccupationalProfile>;

  constructor(
    private auth: Auth = inject(Auth),
    private db: Firestore = inject(Firestore)
  ) {
    this.profileCollection = collection(
      this.db,
      'OcuProfiles'
    ) as CollectionReference<OccupationalProfile>;
  }

  getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return collectionData(this.profileCollection, {
      idField: '_id',
    }) as Observable<OccupationalProfile[]>;
  }

  getUserData() {
    return this.auth.currentUser;
  }
}
