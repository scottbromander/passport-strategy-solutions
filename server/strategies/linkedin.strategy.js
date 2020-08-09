const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const pool = require('../modules/pool');

let linkedInStrategyCallback = async (
  accessToken,
  refreshToken,
  profile,
  cb
) => {
  try {
    // PASSWORD IN THIS INSTANCE, IS THE ID PROVIDED BY GOOGLE
    const qs_linkedinId = `SELECT * FROM "login" WHERE password=$1;`;
    const linkedinIdResult = await pool.query(qs_linkedinId, [profile.id]);

    console.log(profile);
    console.log(linkedinIdResult);

    if (linkedinIdResult.rows.length > 0) {
      //   // IF THAT LINKEDIN ID IS ALREADY SAVED IN LOGIN TABLE
      const userQuery = `SELECT * FROM "user" WHERE "id"=$1;`;
      const userResult = await pool.query(userQuery, [
        linkedinIdResult.rows[0]['user_id'],
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
        display_name: profile.displayName ? profile.displayName : 'undefined',
        first_name: profile.name.givenName
          ? profile.name.givenName
          : 'undefined',
        last_name: profile.name.familyName
          ? profile.name.familyName
          : 'undefined',
        email: profile.emails[0].value ? profile.emails[0].value : 'undefined',
        // photos[3] in LinkedIns profile is an 800x800, versus photos[0] is 100x100
        picture: profile.photos[3].value
          ? profile.photos[3].value
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
    cb(`Error with LinkedIn User: ${err}`, null);
  }
};

module.exports = (passport, callbackURL) => {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: callbackURL,
        scope: ['r_emailaddress', 'r_liteprofile'],
      },
      linkedInStrategyCallback
    )
  );
};
