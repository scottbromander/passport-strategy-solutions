const passport = require('passport');
const pool = require('../modules/pool');
const useLocalStrategy = require('./local.strategy');
const useGoogleStrategy = require('./google.strategy');

// STRATEGIES
useLocalStrategy(passport);
useGoogleStrategy(passport, '/auth/google/callback');

passport.serializeUser((user, done) => {
  console.log('serializing user: ', user);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = pool.query('SELECT * FROM "user" WHERE id = $1;', [id]);
    const user = result && result.rows && result.rows[0];
    if (user) {
      delete user.password;
      done(null, user);
    } else {
      done(null, null);
    }
  } catch (err) {
    console.log('Error with query during deserializing user ', err);
    done(err, null);
  }
});

module.exports = passport;
