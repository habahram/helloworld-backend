//dependencies
const express = require('express');
var cors = require('cors');
const { store } = require('./data_access/store');


const application = express();
const port = process.env.PORT || 4002 ;

//middlewares
application.use(cors());
application.use(express.json());


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
        response.status(500).json({done: false, message: 'The customer was not added due to an error.'});
    });
    
});

application.post('/login', (request, response) => {
    let email = request.body.email;
    let password = request.body.password;
    store.login(email, password)
    .then(x => {
        if(x.valid) {
            response.status(200).json({ done: true, message: 'The customer logged in successfully!' });
        } else {
            response.status(401).json({ done: false, message: x.message });
        }
    })
    .catch(e => {
        console.log(e);
        response.status(500).json({done: false, message: 'Something went wrong.'});
    });
    
});

application.get('/quiz/:id', (request, response) => {
    let id = request.params.id;
    let result = store.getQuiz(id);
    if (result.done) {
        response.status(200).json({ done: true, result: result.quiz });
    } else {
        response.status(404).json({ done: false, message: result.message });
    }
});


application.get('/scores/:quiztaker/:quizname', (request, response) => {
    let quizTaker = request.params.quiztaker;
    let quizName = request.params.quizName;
    let scores = store.getScores(quizTaker, quizName);
    response.status(200).json({ done: true, result: scores });
    
});

application.listen(port, () => {
    console.log(`Listening to the port ${port} `);
})
