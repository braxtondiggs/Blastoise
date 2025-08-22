import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-auth-dialog',
  templateUrl: './auth-dialog.component.html',
  styleUrls: ['./auth-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatProgressSpinnerModule]
})

export class AuthDialogComponent {
  error?: string;
  isLoading = false;
  hidePassword = true;

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  public auth = inject(Auth);
  private dialogRef = inject(MatDialogRef<AuthDialogComponent>);

  async login(): Promise<void> {
    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;
      this.error = undefined;

      try {
        const email = this.form.value.email;
        const password = this.form.value.password;

        if (email && password) {
          const response = await signInWithEmailAndPassword(this.auth, email, password);
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
