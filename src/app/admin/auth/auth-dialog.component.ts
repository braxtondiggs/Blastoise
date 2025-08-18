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
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  constructor(public auth: AngularFireAuth, private dialogRef: MatDialogRef<AuthDialogComponent>) { }

  async login() {
    if (this.form.valid) {
      try {
        const email = this.form.value.email;
        const password = this.form.value.password;

        if (email && password) {
          const response = await this.auth.signInWithEmailAndPassword(email, password);
          if (response) this.dialogRef.close();
        }
      } catch (e: any) {
        this.error = e.message
      }
    }
  }
}
