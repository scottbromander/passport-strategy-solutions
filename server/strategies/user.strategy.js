// IN THE PROCESS OF BEING DEPRECATED - See _root.strategy

const passport = require('passport');

const SpotifyStrategy = require('passport-spotify').Strategy;

passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: '/auth/spotify/callback',
    },
    function (accessToken, refreshToken, expires_in, profile, done) {
      const candidateEmail = profile.emails[0].value;

      pool
        .query(`SELECT * FROM "user" WHERE username=$1;`, [candidateEmail])
        .then((response) => {
          console.log('USER: ', response.rows);
          if (response.rows.length === 0) {
            // No Users - Create a new one
            pool
              .query(
                `INSERT INTO "user" ("username", "provider") VALUES ($1,$2) RETURNING "id", "username";`,
                [candidateEmail, profile.provider]
              )
              .then((response) => {
                const user = { ...response.rows[0] };
                return done(null, user);
              })
              .catch((err) => {
                console.log(`Error saving new user: ${err}`);
                return done(null, null);
              });
          } else {
            // Found a user with that email!
            const user = response.rows[0];
            return done(null, user);
          }
        })
        .catch((err) => {
          console.log(`Error finding Google User: ${err}`);
          return done(null, null);
        });
    }
  )
);

module.exports = passport;
