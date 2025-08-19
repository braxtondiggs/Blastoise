import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { User } from '@firebase/auth-types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);

  constructor() {
    this.user$ = this.afAuth.authState
  }

  uid(): Promise<any> {
    return this.user$.pipe(take(1), map(u => u && u.uid)).toPromise();
  }

  async signOut() {
    await this.afAuth.signOut();
    this.router.navigate(['/']);
  }

  async isAdmin(user: User) {
    const idTokenResult = await user.getIdTokenResult();
    return !!idTokenResult.claims['admin'];
  }
}
