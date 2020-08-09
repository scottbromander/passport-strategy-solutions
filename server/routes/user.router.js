const express = require('express');
const {
  rejectUnauthenticated,
} = require('../modules/authentication-middleware');
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');
const userStrategy = require('../strategies/user.strategy');
const e = require('express');

const router = express.Router();

// Handles Ajax request for user information if user is authenticated
router.get('/', rejectUnauthenticated, (req, res) => {
  // Send back user object from the session (previously queried from the database)
  res.send(req.user);
});

// Handles POST request with new user data
// The only thing different from this and every other post we've seen
// is that the password gets encrypted before being inserted
router.post('/register', async (req, res, next) => {
  try {
    const email = req.body.username;
    const password = encryptLib.encryptPassword(req.body.password);
    const normalizedEmail = email.toLowerCase();

    const existingEmailArray = await pool.query(
      `SELECT "email" from "user" WHERE "email"=$1`,
      [normalizedEmail]
    );

    if (!existingEmailArray.rows.length) {
      const queryTextCreateUser = `INSERT INTO "user" ("email") VALUES ($1) RETURNING id`;
      const newUser = await pool.query(queryTextCreateUser, [normalizedEmail]);

      const newUserId = newUser.rows[0].id;

      const queryTextCreateLogin = `INSERT INTO "login" ("provider", "password", "user_id") VALUES ($1,$2, $3);`;
      const newLogin = await pool.query(queryTextCreateLogin, [
        'local',
        password,
        newUserId,
      ]);

      res.send(201);
    } else {
      console.log(
        `Error, email already in database. Use the correct provider to login.`
      );
      res.sendStatus(500);
    }
  } catch (err) {
    console.log(`Error saving new local user: ${err}`);
    res.sendStatus(500);
  }
});

// Handles login form authenticate/login POST
// userStrategy.authenticate('local') is middleware that we run on this route
// this middleware will run our POST if successful
// this middleware will send a 404 if not successful
router.post('/login', userStrategy.authenticate('local'), (req, res) => {
  res.sendStatus(200);
});

// clear all server session information about this user
router.post('/logout', (req, res) => {
  // Use passport's built-in method to log out the user
  req.logout();
  res.sendStatus(200);
});

module.exports = router;
