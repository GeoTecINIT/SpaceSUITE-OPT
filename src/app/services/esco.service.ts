import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TreeNode } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class ESCOService {
  private baseUrl = 'https://ec.europa.eu/esco/api';
  private transversalSchemeUri =
    'http://data.europa.eu/esco/concept-scheme/skill-transversal-groups';

  private cacheTransversalSkills$?: Observable<string[]>;

  constructor(private http: HttpClient) {}

  getAllTransversalSkills(
    lang: string = 'en',
    offset = 0,
    limit = 200
  ): Observable<string[]> {
    if (!this.cacheTransversalSkills$) {
      const params = new HttpParams()
        .set('isInScheme', this.transversalSchemeUri)
        .set('language', lang)
        .set('offset', `${offset}`)
        .set('limit', `${limit}`)
        .set('selectedVersion', 'v1.2.0')
        .set('viewObsolete', 'false');

      this.cacheTransversalSkills$ = this.http
        .get<any>(`${this.baseUrl}/resource/skill`, { params })
        .pipe(
          map((resp) => {
            const embedded = resp._embedded || {};
            return Object.values(embedded).map((skill: any) => skill.title);
          }),
          catchError((err) => {
            console.error('Error fetching transversal skills', err);
            return of([]);
          })
        );
    }
    return this.cacheTransversalSkills$;
  }

  searchTransversalSkills(
    query: string,
    lang: string = 'en'
  ): Observable<string[]> {
    const params = new HttpParams()
      .set('text', query)
      .set('isInScheme', this.transversalSchemeUri)
      .set('language', lang)
      .set('selectedVersion', 'v1.2.0')
      .set('viewObsolete', 'false');

    const similarTransversalSkills$ = this.http
      .get<any>(`${this.baseUrl}/suggest2`, { params })
      .pipe(
        map((resp) => {
          const results = resp._embedded.results || [];
          return results.map((skill: any) => skill.title);
        }),
        catchError((err) => {
          console.error('Error fetching transversal skills', err);
          return of([]);
        })
      );
    return similarTransversalSkills$;
  }

  getTransversalSkillsFromJson(): Observable<TreeNode[]> {
    return this.http
      .get('assets/transversalSkills.json')
      .pipe(map((data) => data as TreeNode<any>[]));
  }
}
