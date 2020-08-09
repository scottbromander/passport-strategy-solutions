const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../modules/pool');

// WHAT HAPPENS AFTER GOOGLE HAS CONFIRMED THE USER
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
      if (resultOfEmailCheck.rows.length > 0)
        cb('Email already in database. Sign in using your provider', null);

      const qs_createNewUser = `INSERT INTO "user" ("display_name", "first_name", "last_name", "email", "picture") VALUES ($1,$2,$3,$4,$5) RETURNING *;`;

      const userObject = {
        display_name: profile.displayName ? profile.displayName : null,
        first_name: profile.name.givenName ? profile.name.givenName : null,
        last_name: profile.name.familyName ? profile.name.familyName : null,
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
    cb(`Error with Google User: ${err}`, null);
  }
};

module.exports = (passport, callbackURL) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      googleStrategyCallback
    )
  );
};
