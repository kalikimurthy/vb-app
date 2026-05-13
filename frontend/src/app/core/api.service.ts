import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api';

  list<T>(path: string, params?: Record<string, string | number | boolean>): Observable<Paginated<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<Paginated<T>>(`${this.baseUrl}/${path}/`, { params: httpParams });
  }

  create<T>(path: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}/`, payload);
  }

  get<T>(path: string, id: number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}/${id}/`);
  }

  update<T>(path: string, id: number, payload: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${path}/${id}/`, payload);
  }

  remove(path: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${path}/${id}/`);
  }

  action<T>(path: string, action: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}/${action}/`, payload);
  }
}
