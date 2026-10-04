export type AuthErrorType = 'network' | 'suspended' | 'credentials' | 'accountNotFound' | 'emailExists' | 'validation' | 'server' | 'unknown';

export interface AuthErrorDetails {
  type: AuthErrorType;
  title: string;
  message: string;
}

export const getAuthErrorDetails = (error: any, fallback = 'Something went wrong. Please try again.') : AuthErrorDetails => {
  const status = error?.response?.status;
  const responseMessage = error?.response?.data?.message;
  const code = error?.response?.data?.code;
  const message = typeof responseMessage === 'string' ? responseMessage : '';

  if (error?.message === 'Network Error' || !error?.response) {
    return {
      type: 'network',
      title: 'Connection problem',
      message: 'We could not reach the server. Check your connection and try again.'
    };
  }

  if (code === 'ACCOUNT_SUSPENDED' || status === 403 || /suspend/i.test(message)) {
    return {
      type: 'suspended',
      title: 'Account suspended',
      message: 'Your account is suspended. You cannot sign in until support restores access.'
    };
  }

  if (code === 'EMAIL_ALREADY_EXISTS' || /already exists|already registered/i.test(message)) {
    return {
      type: 'emailExists',
      title: 'Email already in use',
      message: 'An account already uses this email address. Sign in instead, or use a different email.'
    };
  }

  if (code === 'ACCOUNT_NOT_FOUND' || /could not find an account|no account found/i.test(message)) {
    return {
      type: 'accountNotFound',
      title: 'Account not found',
      message: 'No account was found for this email address. Check the spelling or create an account.'
    };
  }

  if (code === 'INCORRECT_PASSWORD' || status === 401 || /invalid credentials|incorrect password/i.test(message)) {
    return {
      type: 'credentials',
      title: 'Sign-in details not recognized',
      message: 'The email or password is incorrect. Check both fields and try again.'
    };
  }

  if (status === 400 || status === 409) {
    return {
      type: 'validation',
      title: 'Please check your details',
      message: message || fallback
    };
  }

  if (status >= 500) {
    return {
      type: 'server',
      title: 'Service temporarily unavailable',
      message: 'Our server could not complete that request. Please try again shortly.'
    };
  }

  return { type: 'unknown', title: 'Request could not be completed', message: message || fallback };
};

export const getAuthErrorMessage = (error: any, fallback?: string) => getAuthErrorDetails(error, fallback).message;
