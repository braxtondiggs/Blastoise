import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-auth-dialog',
  templateUrl: './auth-dialog.component.html',
  styleUrls: ['./auth-dialog.component.scss'],
})

export class AuthDialogComponent {
  error?: string;
  isLoading = false;
  hidePassword = true;

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  constructor(
    public auth: AngularFireAuth,
    private dialogRef: MatDialogRef<AuthDialogComponent>
  ) { }

  async login(): Promise<void> {
    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;
      this.error = undefined;

      try {
        const email = this.form.value.email;
        const password = this.form.value.password;

        if (email && password) {
          const response = await this.auth.signInWithEmailAndPassword(email, password);
          if (response) {
            this.dialogRef.close();
          }
        }
      } catch (e: any) {
        this.error = this.getErrorMessage(e);
      } finally {
        this.isLoading = false;
      }
    }
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return error.message || 'An error occurred during sign in.';
    }
  }
}
