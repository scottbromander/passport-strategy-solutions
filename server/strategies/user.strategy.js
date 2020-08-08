const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const SpotifyStrategy = require('passport-spotify').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');

passport.serializeUser((user, done) => {
  console.log('serializing user: ', user);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log('------> ', id);
  pool
    .query('SELECT * FROM "user" WHERE id = $1;', [id])
    .then((result) => {
      // Handle Errors
      const user = result && result.rows && result.rows[0];

      if (user) {
        delete user.password;
        done(null, user);
      } else {
        done(null, null);
      }
    })
    .catch((error) => {
      console.log('Error with query during deserializing user ', error);
      done(error, null);
    });
});

// Does actual work of logging in
passport.use(
  'local',
  new LocalStrategy((username, password, done) => {
    pool
      .query('SELECT * FROM "user" WHERE username = $1', [username])
      .then((result) => {
        const user = result && result.rows && result.rows[0];
        console.log(user);
        if (user && encryptLib.comparePassword(password, user.password)) {
          console.log(user);
          done(null, user);
        } else {
          console.log('nada');
          done(null, null);
        }
      })
      .catch((error) => {
        console.log('Error with query for user ', error);
        done(error, null);
      });
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    (accessToken, refreshToken, profile, cb) => {
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
                cb(null, user);
              })
              .catch((err) => {
                console.log(`Error saving new user: ${err}`);
                cb(null, null);
              });
          } else {
            // Found a user with that email!
            const user = response.rows[0];
            cb(null, user);
          }
        })
        .catch((err) => {
          console.log(`Error finding Google User: ${err}`);
          cb(null, null);
        });
    }
  )
);

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: '/auth/linkedin/callback',
      scope: ['r_emailaddress', 'r_liteprofile'],
    },
    function (accessToken, refreshToken, profile, done) {
      console.log(profile);
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
                done(null, user);
              })
              .catch((err) => {
                console.log(`Error saving new user: ${err}`);
                done(null, null);
              });
          } else {
            // Found a user with that email!
            const user = response.rows[0];
            done(null, user);
          }
        })
        .catch((err) => {
          console.log(`Error finding Google User: ${err}`);
          done(null, null);
        });
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
    },
    function (accessToken, refreshToken, profile, done) {
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
                done(null, user);
              })
              .catch((err) => {
                console.log(`Error saving new user: ${err}`);
                done(null, null);
              });
          } else {
            // Found a user with that email!
            const user = response.rows[0];
            done(null, user);
          }
        })
        .catch((err) => {
          console.log(`Error finding Google User: ${err}`);
          done(null, null);
        });
    }
  )
);

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

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: '/auth/facebook/callback',
      profileFields: [
        'id',
        'displayName',
        'first_name',
        'last_name',
        'picture',
        'email',
        'link',
        'location',
      ],
    },
    function (accessToken, refreshToken, profile, done) {
      console.log(profile);
      return done(null, profile);
      // User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      //   return cb(err, user);
      // });
    }
  )
);

module.exports = passport;
