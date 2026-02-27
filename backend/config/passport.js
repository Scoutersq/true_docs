const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Look for existing user by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if a user with the same email already exists (local account)
          user = await User.findOne({
            email: profile.emails?.[0]?.value,
          });

          if (user) {
            // Link Google account to existing local user
            user.googleId = profile.id;
            user.provider = 'google';
            user.avatar = user.avatar || profile.photos?.[0]?.value;
            await user.save();
          } else {
            // Create brand-new user
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
              avatar: profile.photos?.[0]?.value,
              provider: 'google',
            });
          }
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = { passport };
