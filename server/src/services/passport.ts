import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';

const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  'http://localhost:3001/api/auth/google/callback';

// Google login is optional. Only register the strategy when credentials are
// present, otherwise the OAuth2Strategy constructor throws and crashes boot.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email provided by Google'));

        // 1. Try to find by googleId first (returning user)
        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

        if (!user) {
          // 2. Check if an email/password account exists, if so, link it
          const existing = await prisma.user.findUnique({ where: { email } });

          if (existing) {
            user = await prisma.user.update({
              where: { id: existing.id },
              data: { googleId: profile.id },
            });
          } else {
            // 3. Brand new user, create account
            user = await prisma.user.create({
              data: {
                email,
                googleId: profile.id,
                name: profile.displayName || undefined,
                // Don't auto-set Google photo, let user pick their avatar
              },
            });
          }
        }

        const token = signToken(user.id);
        return done(null, { userId: user.id, token });
      } catch (err) {
        return done(err as Error);
      }
    }
    )
  );
}

export default passport;
