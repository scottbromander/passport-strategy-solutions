const express = require('express');
require('dotenv').config();
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const sessionMiddleware = require('./modules/session-middleware');
const passport = require('./strategies/_root.strategy');
const crypto = require('crypto');

app.use(cors());

// Route includes
const userRouter = require('./routes/user.router');

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Passport Session Configuration //
app.use(sessionMiddleware);

// start up passport sessions
app.use(passport.initialize());
app.use(passport.session());

// ---- GOOGLE OAUTH ---- \\

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/#/admin');
  }
);

// ---- LINKEDIN OAUTH ---- \\

app.get('/auth/linkedin', passport.authenticate('linkedin'), () => {});

app.get(
  '/auth/linkedin/callback',
  passport.authenticate('linkedin', {
    successRedirect: '/#/admin',
    failureRedirect: '/',
  })
);

// ---- GITHUB OAUTH ---- \\

app.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// ---- SPOTIFY OAUTH ---- \\

app.get(
  '/auth/spotify',
  passport.authenticate('spotify', {
    scope: ['user-read-email', 'user-read-private'],
  }),
  function (req, res) {}
);

app.get(
  '/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/#/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

// ---- FACEBOOK OAUTH ---- \\

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/#/admin',
    failureRedirect: '/#/login',
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/#/home');
  }
);

// ---- REDDIT OAUTH ---- \\
app.get('/auth/reddit', (req, res, next) => {
  req.session.state = crypto.randomBytes(32).toString('hex');
  passport.authenticate('reddit', {
    state: req.session.state,
  })(req, res, next);
});

app.get(
  '/auth/reddit/callback',
  passport.authenticate('reddit', { failureRedirect: '/#/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/#/home');
  }
);

/* Routes */
app.use('/api/user', userRouter);

// Serve static files
app.use(express.static('build'));

// App Set //
const PORT = process.env.PORT || 5000;

/** Listen * */
app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
