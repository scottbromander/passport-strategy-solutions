const TwitterStrategy = require('passport-twitter').Strategy;
const pool = require('../modules/pool');

const twitterStrategyCallback = async (token, tokenSecret, profile, cb) => {};

module.exports = (passport, callbackURL) => {
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: TWITTER_CONSUMER_KEY,
        consumerSecret: TWITTER_CONSUMER_SECRET,
        callbackURL: callbackURL,
      },
      twitterStrategyCallback
    )
  );
};
