import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, take } from 'rxjs';
import { Field } from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class FieldsService {
  private fieldsSubject: ReplaySubject<Field[]> = new ReplaySubject<Field[]>(1);

  constructor(private readonly http: HttpClient) {
    this.http
      .get<Field[]>('/assets/fields.json')
      .pipe(take(1))
      .subscribe((fields) => {
        this.fieldsSubject.next(fields);
      });
  }

  getFields(): Observable<Field[]> {
    return this.fieldsSubject.asObservable();
  }
}
