import { NextResponse } from 'next/server';

import { AUTH_CONFIG } from '@/lib/auth';
import { isEmailDeliveryConfigured } from '@/lib/mailer';

export const runtime = 'nodejs';

export function GET() {
  const emailDelivery = isEmailDeliveryConfigured();
  return NextResponse.json({
    passwordReset: emailDelivery,
    // Email OTP (sign-up verification + password reset) is usable only when emails can be sent.
    emailOtp: emailDelivery,
    google: Boolean(AUTH_CONFIG.googleEnabled),
  });
}
