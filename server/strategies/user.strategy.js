const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const SpotifyStrategy = require('passport-spotify').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');
const { response } = require('express');

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

let localStrategyCallback = async (email, password, done) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "user" 
        JOIN "login" ON "login"."user_id"="user"."id"
        WHERE "user"."email" = $1;`,
      [email]
    );

    const user = result && result.rows && result.rows[0];

    if (user && encryptLib.comparePassword(password, user.password)) {
      delete user.password;
      console.log('********>>> ', user);
      done(null, user);
    } else {
      done(null, null);
    }
  } catch (err) {
    console.log('Error with query for user ', err);
    done(err, null);
  }
};

passport.use('local', new LocalStrategy(localStrategyCallback));

// **** GOOGLE STRATEGY **** \\

let googleStrategyCallback = async (accessToken, refreshToken, profile, cb) => {
  try {
    // PASSWORD IN THIS INSTANCE, IS THE ID PROVIDED BY GOOGLE
    const qs_googleId = `SELECT * FROM "login" WHERE password=$1;`;
    const googleIdResult = await pool.query(qs_googleId, [profile.id]);

    if (googleIdResult.rows.length > 0) {
      // IF THAT GOOGLE ID IS ALREADY SAVED IN LOGIN TABLE
      const userQuery = `SELECT * FROM "user" WHERE "id"=$1;`;
      const userResult = await pool.query(userQuery, [
        googleIdResult.rows[0]['user_id'],
      ]);
      const user = userResult.rows[0];
      cb(null, user);
    } else {
      // IF NOT, LETS SAVE IT AND A NEW USER
      // BUT WE ALSO NEED TO SEE IF THE EMAIL IS IN THE USER TABLE
      const qs_emailCheck = `SELECT * FROM "user" WHERE email=$1;`;
      const resultOfEmailCheck = await pool.query(qs_emailCheck, [
        profile.emails[0].value,
      ]);

      // IF THE USER USED ANOTHER SERVICE TO CREATE AN ACCOUNT
      // TELL THEM THEY SHOULD LOG IN WITH THAT SERVICE
      if ((await resultOfEmailCheck).rows.length > 0)
        cb('Email already in database. Sign in using your provider', null);

      const qs_createNewUser = `INSERT INTO "user" ("display_name", "first_name", "last_name", "email", "picture") VALUES ($1,$2,$3,$4,$5) RETURNING *;`;

      const userObject = {
        display_name: profile.displayName ? profile.displayName : 'undefined',
        first_name: profile.name.givenName
          ? profile.name.givenName
          : 'undefined',
        last_name: profile.name.familyName
          ? profile.name.familyName
          : 'undefined',
        email: profile.emails[0].value ? profile.emails[0].value : 'undefined',
        picture: profile.photos[0].value
          ? profile.photos[0].value
          : 'undefined',
      };

      const resultOfNewUserSave = await pool.query(qs_createNewUser, [
        userObject.display_name,
        userObject.first_name,
        userObject.last_name,
        userObject.email,
        userObject.picture,
      ]);

      const qs_createNewLogin = `INSERT INTO "login" ("provider", "password", "user_id") VALUES ($1,$2,$3);`;

      const resultOfLoginSave = await pool.query(qs_createNewLogin, [
        profile.provider,
        profile.id,
        resultOfNewUserSave.rows[0].id,
      ]);

      console.log('\nThis should be the user:');
      console.log(resultOfNewUserSave.rows[0]);
      console.log('\n');

      cb(null, resultOfNewUserSave.rows[0]);
    }
  } catch (err) {
    cb(`Error with Google User: ${err}`, null);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    googleStrategyCallback
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
