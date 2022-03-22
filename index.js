const express = require('express');
const customers = require('./temporarily-store/customers');




const application = express();
const port = 4002;

application.get('/', (request, response) => {
    response.status(200).json({done: true, message: 'Fine!'});
});

application.post('/register', (request, response) => {
    let name = request.body.name;
    let email = request.body.email;
    let password = request.body.password;
    customers.push({id: 1, name: name, email: email, password: password});
    response.status(200).json({done: true, message: 'The customer was added successfully!'});
});

application.listen(port, () => {
    console.log(`Listening to the port ${port} `);
})
