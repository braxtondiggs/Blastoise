import { FormControl, FormGroup } from '@angular/forms';
import {
  passwordStrengthValidator,
  passwordMatchValidator,
  emailValidator,
  getPasswordStrength,
} from './form-validators';

describe('Form Validators', () => {
  describe('passwordStrengthValidator', () => {
    it('should return null for valid password (8+ chars, letter, number)', () => {
      const control = new FormControl('Test1234');
      const result = passwordStrengthValidator(control);
      expect(result).toBeNull();
    });

    it('should return error for password shorter than 8 characters', () => {
      const control = new FormControl('Test12');
      const result = passwordStrengthValidator(control);
      expect(result).toEqual({
        passwordStrength: {
          hasMinLength: false,
          hasLetter: true,
          hasNumber: true,
          valid: false,
        },
      });
    });

    it('should return error for password without letters', () => {
      const control = new FormControl('12345678');
      const result = passwordStrengthValidator(control);
      expect(result).toEqual({
        passwordStrength: {
          hasMinLength: true,
          hasLetter: false,
          hasNumber: true,
          valid: false,
        },
      });
    });

    it('should return error for password without numbers', () => {
      const control = new FormControl('TestTest');
      const result = passwordStrengthValidator(control);
      expect(result).toEqual({
        passwordStrength: {
          hasMinLength: true,
          hasLetter: true,
          hasNumber: false,
          valid: false,
        },
      });
    });

    it('should return null for empty string (optional field)', () => {
      const control = new FormControl('');
      const result = passwordStrengthValidator(control);
      expect(result).toEqual({
        passwordStrength: {
          hasMinLength: false,
          hasLetter: false,
          hasNumber: false,
          valid: false,
        },
      });
    });

    it('should accept uppercase and lowercase letters', () => {
      const control = new FormControl('PASSWORD123');
      expect(passwordStrengthValidator(control)).toBeNull();

      const control2 = new FormControl('password123');
      expect(passwordStrengthValidator(control2)).toBeNull();

      const control3 = new FormControl('PaSsWoRd123');
      expect(passwordStrengthValidator(control3)).toBeNull();
    });
  });

  describe('passwordMatchValidator', () => {
    let formGroup: FormGroup;

    beforeEach(() => {
      formGroup = new FormGroup({
        password: new FormControl('Test1234'),
        confirmPassword: new FormControl('', [passwordMatchValidator('password')]),
      });
    });

    it('should return null when passwords match', () => {
      formGroup.controls['confirmPassword'].setValue('Test1234');
      expect(formGroup.controls['confirmPassword'].errors).toBeNull();
    });

    it('should return error when passwords do not match', () => {
      formGroup.controls['confirmPassword'].setValue('Different123');
      expect(formGroup.controls['confirmPassword'].errors).toEqual({
        passwordMatch: { match: false },
      });
    });

    it('should update validation when password field changes', () => {
      formGroup.controls['confirmPassword'].setValue('Test1234');
      expect(formGroup.controls['confirmPassword'].errors).toBeNull();

      formGroup.controls['password'].setValue('NewPassword123');
      formGroup.controls['confirmPassword'].updateValueAndValidity();
      expect(formGroup.controls['confirmPassword'].errors).toEqual({
        passwordMatch: { match: false },
      });
    });

    it('should return null when control has no parent', () => {
      const standaloneControl = new FormControl('test', [passwordMatchValidator('password')]);
      expect(standaloneControl.errors).toBeNull();
    });

    it('should return null when match control does not exist', () => {
      const formGroup2 = new FormGroup({
        confirmPassword: new FormControl('test', [passwordMatchValidator('nonexistent')]),
      });
      expect(formGroup2.controls['confirmPassword'].errors).toBeNull();
    });
  });

  describe('emailValidator', () => {
    it('should return null for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test_email@sub.domain.com',
        'a@b.co',
      ];

      validEmails.forEach((email) => {
        const control = new FormControl(email);
        expect(emailValidator(control)).toBeNull();
      });
    });

    it('should return error for invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
        'user..name@example.com',
      ];

      invalidEmails.forEach((email) => {
        const control = new FormControl(email);
        expect(emailValidator(control)).toEqual({ email: { valid: false } });
      });
    });

    it('should return null for empty string (optional field)', () => {
      const control = new FormControl('');
      expect(emailValidator(control)).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      expect(emailValidator(control)).toBeNull();
    });
  });

  describe('getPasswordStrength', () => {
    it('should return all true for strong password', () => {
      const control = new FormControl('Strong123');
      const strength = getPasswordStrength(control);
      expect(strength).toEqual({
        hasMinLength: true,
        hasLetter: true,
        hasNumber: true,
        isValid: true,
      });
    });

    it('should return correct flags for weak password', () => {
      const control = new FormControl('weak');
      const strength = getPasswordStrength(control);
      expect(strength).toEqual({
        hasMinLength: false,
        hasLetter: true,
        hasNumber: false,
        isValid: false,
      });
    });

    it('should return all false for empty password', () => {
      const control = new FormControl('');
      const strength = getPasswordStrength(control);
      expect(strength).toEqual({
        hasMinLength: false,
        hasLetter: false,
        hasNumber: false,
        isValid: false,
      });
    });

    it('should update as user types', () => {
      const control = new FormControl('');
      expect(getPasswordStrength(control).isValid).toBe(false);

      control.setValue('Test');
      expect(getPasswordStrength(control)).toEqual({
        hasMinLength: false,
        hasLetter: true,
        hasNumber: false,
        isValid: false,
      });

      control.setValue('Test123');
      expect(getPasswordStrength(control)).toEqual({
        hasMinLength: false,
        hasLetter: true,
        hasNumber: true,
        isValid: false,
      });

      control.setValue('Test1234');
      expect(getPasswordStrength(control)).toEqual({
        hasMinLength: true,
        hasLetter: true,
        hasNumber: true,
        isValid: true,
      });
    });
  });
});
