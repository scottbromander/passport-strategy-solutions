const SpotifyStrategy = require('passport-spotify').Strategy;
const pool = require('../modules/pool');

const spotifyStrategyCallback = async (
  accessToken,
  refreshToken,
  expires_in,
  profile,
  cb
) => {
  try {
    console.log('Data from Spotify: ', profile);
    // PASSWORD IN THIS INSTANCE, IS THE ID PROVIDED BY SPOTIFY
    const qs_spotifyId = `SELECT * FROM "login" WHERE password=$1;`;
    const spotifyIdResult = await pool.query(qs_spotifyId, [profile.id]);

    if (spotifyIdResult.rows.length > 0) {
      //   // IF THAT SPOTIFY ID IS ALREADY SAVED IN LOGIN TABLE
      const userQuery = `SELECT * FROM "user" WHERE "id"=$1;`;
      const userResult = await pool.query(userQuery, [
        spotifyIdResult.rows[0]['user_id'],
      ]);
      const user = userResult.rows[0];
      cb(null, user);
    } else {
      // CHECK TO ACTUALLY SEE IF THERE IS AN EMAIL KEY AND IF THERE IS AN EMAIL IN THE PROFILE
      // NOTE THAT THIS ONLY HANDLES IF 'EMAILS' IS AN ARRAY WITH AN OBJECT INSIDE
      // TYPICAL FOR OAUTH SOLUTIONS TO HAVE `emails: [{value:'email@email.com}]`
      const profileEmail =
        profile.emails && Array.isArray(profile.emails)
          ? profile.emails[0]
          : null;

      if (profile.emails && profile.emails.length > 0) {
        // IF NOT, LETS SAVE IT AND A NEW USER
        // BUT WE ALSO NEED TO SEE IF THE EMAIL IS IN THE USER TABLE
        const qs_emailCheck = `SELECT * FROM "user" WHERE email=$1;`;
        const resultOfEmailCheck = await pool.query(qs_emailCheck, [
          profile.emails[0].value,
        ]);
        // IF THE USER USED ANOTHER SERVICE TO CREATE AN ACCOUNT
        // TELL THEM THEY SHOULD LOG IN WITH THAT SERVICE
        if (resultOfEmailCheck.rows.length > 0)
          cb('Email already in database. Sign in using your provider', null);
      }

      const qs_createNewUser = `INSERT INTO "user" ("display_name", "first_name", "last_name", "email", "picture") VALUES ($1,$2,$3,$4,$5) RETURNING *;`;

      const userObject = {
        display_name: profile.displayName ? profile.displayName : null,
        first_name: null, // SPOTIFY DOES NOT HAVE FIRST NAME
        last_name: null, // SPOTIFY DOES NOT HAVE LAST NAME
        email: profile.emails[0].value ? profile.emails[0].value : null,
        picture: profile.photos[0].value ? profile.photos[0].value : null,
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

      cb(null, resultOfNewUserSave.rows[0]);
    }
  } catch (err) {
    cb(`Error with Facebook User: ${err}`, null);
  }
};

module.exports = (passport, callbackURL) => {
  passport.use(
    new SpotifyStrategy(
      {
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        callbackURL: callbackURL,
      },
      spotifyStrategyCallback
    )
  );
};
