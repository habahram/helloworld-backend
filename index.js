//dependencies
const express = require('express');
var cors = require('cors');
var passport = require('passport');
var LocalStrategy = require('passport-local');
const GoogleStrategy = require("passport-google-oauth2").Strategy;

var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
const { store } = require('./data_access/store');
let backendURL = "http://localhost:4002";
let frontEndUrl = "http://localhost:3000";


const application = express();
const port = process.env.PORT || 4002;

//middlewares
application.use(cors({
  origin: frontEndUrl,
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
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${backendURL}/auth/google/callback`,
  passReqToCallback: true
},
  function (request, accessToken, refreshToken, profile, done) {
    console.log('in Google strategy:');
    //console.log(profile);
    store.findOrCreateNonLocalCustomer(profile.displayName, profile.email, profile.id, profile.provider)
      .then(x => done(null, x))
      .catch(e => {
        console.log(e);
        return done('Something went wrong.');
      });

  }));



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

application.get('/auth/google',
  passport.authenticate('google', {
    scope:
      ['email', 'profile']
  }
  ));

application.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/auth/google/success',
    failureRedirect: '/auth/google/failure'
  }));

  application.get('/auth/google/success', (request, response) => {
    console.log('/auth/google/success');
    console.log(request.user);
    response.redirect(`${frontEndUrl}/#/google/${request.user.username}/${request.user.name}`);
  
  });
  application.get('/auth/google/failure', (request, response) => {
    console.log('/auth/google/failure');
    response.redirect(`${frontEndUrl}/#/google/failed`);
  });

  application.get('/isloggedin', (request, response) => {
    if(request.isAuthenticated()) {
      response.status(200).json({ done: true, result: true });
    } else {
      response.status(410).json({ done: false, result: false });
    }  
    
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
