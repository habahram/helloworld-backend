//dependencies
const express = require('express');
var cors = require('cors');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var GoogleStrategy = require('passport-google-oidc');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
const { store } = require('./data_access/store');


const application = express();
const port = process.env.PORT || 4002;

//middlewares
application.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
application.use(express.json());


application.use((request, response, next) => {
  console.log(`request url: ${request.url}`);
  console.log(`request method: ${request.method}`);
  //only for development. Remove the next two lines when you deploy your final version.
  console.log(`request body:`);
  console.log(request.body);
  next();
})

passport.use(
  new LocalStrategy({ usernameField: 'email' }, function verify(username, password, cb) {
    store.login(username, password)
      .then(x => {
        if (x.valid) {
          return cb(null, x.user);
        } else {
          return cb(null, false, { message: 'Incorrect username or password.' });
        }
      })
      .catch(e => {
        console.log(e);
        cb('Somethign went wrong!');
      });

  }));

passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: 'https://www.example.com/oauth2/redirect/google'
},
  function (issuer, profile, cb) {
    db.get('SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?', [
      issuer,
      profile.id
    ], function (err, cred) {
      if (err) { return cb(err); }
      if (!cred) {
        // The Google account has not logged in to this app before.  Create a
        // new user record and link it to the Google account.
        db.run('INSERT INTO users (name) VALUES (?)', [
          profile.displayName
        ], function (err) {
          if (err) { return cb(err); }

          var id = this.lastID;
          db.run('INSERT INTO federated_credentials (user_id, provider, subject) VALUES (?, ?, ?)', [
            id,
            issuer,
            profile.id
          ], function (err) {
            if (err) { return cb(err); }
            var user = {
              id: id.toString(),
              name: profile.displayName
            };
            return cb(null, user);
          });
        });
      } else {
        // The Google account has previously logged in to the app.  Get the
        // user record linked to the Google account and log the user in.
        db.get('SELECT * FROM users WHERE id = ?', [cred.user_id], function (err, user) {
          if (err) { return cb(err); }
          if (!user) { return cb(null, false); }
          return cb(null, user);
        });
      }
    })
  }
));

application.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './sessions' })
}));
application.use(passport.authenticate('session'));

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//methods
application.get('/', (request, response) => {
  response.status(200).json({ done: true, message: 'Welcome to hello world backend API!' });
});

application.post('/register', (request, response) => {
  let name = request.body.name;
  let email = request.body.email;
  let password = request.body.password;

  store.addCustomer(name, email, password)
    .then(x => response.status(200).json({ done: true, message: 'The customer was added successfully!' }))
    .catch(e => {
      console.log(e);
      response.status(500).json({ done: false, message: 'The customer was not added due to an error.' });
    });

});

application.post('/login', passport.authenticate('local', {
  successRedirect: '/login/succeeded',
  failureRedirect: '/login/failed'
}));

application.get('/login/succeeded', (request, response) => {
  response.status(200).json({ done: true, message: 'The customer logged in successfully.' });
});

application.get('/login/failed', (request, response) => {
  response.status(401).json({ done: false, message: 'The credentials are not valid.' });
});

application.post('/logout', function (request, response) {
  request.logout();
  response.json({ done: true, message: 'The customer signed out successfully.' });
});

application.get('/quiz/:name', (request, response) => {
  if (!request.isAuthenticated()) {
    response.status(401).json({ done: false, message: 'Please sign in first.' })
  }
  let name = request.params.name;
  store.getQuiz(name)
    .then(x => {
      if (x.id) {
        response.status(200).json({ done: true, result: x });
      } else {
        response.status(404).json({ done: false, message: result.message });
      }
    })
    .catch(e => {
      console.log(e);
      response.status(500).json({ done: false, message: 'Something went wrong.' });
    })
});


application.get('/scores/:quiztaker/:quizname', (request, response) => {
  let quizTaker = request.params.quiztaker;
  let quizName = request.params.quizName;
  let scores = store.getScores(quizTaker, quizName);
  response.status(200).json({ done: true, result: scores });

});

application.get('/flowers', (request, response) => {

  store.getFlowers()
    .then(x => {
      response.status(200).json({ done: true, result: x });
    })
    .catch(e => {
      console.log(e);
      response.status(500).json({ done: false, message: 'Something went wrong.' });
    })


});

application.listen(port, () => {
  console.log(`Listening to the port ${port} `);
})
