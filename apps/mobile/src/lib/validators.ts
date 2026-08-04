import type { TranslationKey } from '@/context/LanguageContext';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

type Translate = (key: TranslationKey) => string;

export function passwordError(password: string, t: Translate): string | null {
  if (!PASSWORD_REGEX.test(password)) {
    return t('validatorPasswordRequirements');
  }
  return null;
}

export function usernameError(username: string, t: Translate): string | null {
  if (username.length < 3 || username.length > 30) return t('validatorUsernameLength');
  if (!USERNAME_REGEX.test(username)) return t('validatorUsernameChars');
  return null;
}

export function oldestAllowedBirthday(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 120);
  return date;
}

export function thirteenYearsAgo(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 13);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function birthdayError(birthday: Date | null, t: Translate): string | null {
  if (!birthday) return t('validatorBirthdayRequired');
  if (birthday > thirteenYearsAgo()) return t('validatorAgeMinimum');
  if (birthday < oldestAllowedBirthday()) return t('validatorBirthdayInvalid');
  return null;
}
