import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, signOut, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;

  private auth = inject(Auth);
  private router = inject(Router);

  constructor() {
    this.user$ = new Observable(subscriber => {
      return onAuthStateChanged(this.auth, subscriber);
    });
  }

  uid(): Promise<string | null> {
    return this.user$.pipe(take(1), map(u => u?.uid || null)).toPromise() as Promise<string | null>;
  }

  async signOut() {
    await signOut(this.auth);
    this.router.navigate(['/']);
  }

  async isAdmin(user: User) {
    const idTokenResult = await user.getIdTokenResult();
    return !!idTokenResult.claims['admin'];
  }
}
