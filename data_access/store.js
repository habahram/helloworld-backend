const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();


const connectionString =
    `postgres://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.DATABASEPORT}/${process.env.DATABASE}`;


console.log(connectionString);
const connection = {
    connectionString: process.env.DATABASE_URL ? process.env.DATABASE_URL : connectionString,
    ssl: { rejectUnauthorized: false }
}
const pool = new Pool(connection);


let store = {

    addCustomer: (name, email, password) => {
        const hash = bcrypt.hashSync(password, 10);
        return pool.query('insert into imagequiz.customer (name, email, password) values ($1 , $2, $3)', [name, email, hash]);
        //customers.push({id: 1, name: name, email: email, password: hash});
    },
    findNonLocalCustomer: (email, provider) => {
        return pool.query('select * from imagequiz.customer where local = $1 and email = $2 and provider = $3', ['f', email, provider])
        .then(x => {
            if(x.rows.length == 1) {
             return { found: true, user: {id: x.rows[0].id, username: x.rows[0].email, name: x.rows[0].name} };
            } else {
                return {found: false};
            }
        })
     },

    findOrCreateNonLocalCustomer: async (name, email, password, provider) => {
        console.log('in findOrCreateNonLocalCustomer');
      console.log(name, email, password, provider);
      search = await store.findNonLocalCustomer(email, provider);
      if(search.found) {
          return search.user;
      }
      return pool.query('insert into imagequiz.customer (name, email, password, local, provider) values ($1 , $2, $3, $4, $5)', [name, email, password, 'f', provider])
      .then(x => {
        return { done: true, user: {id: name, username: email, name: name} };
      });
    },

    login: (email, password) => {
        console.log(`${email} - ${password}`);
        console.log(typeof(password));
        return pool.query('select id, name, email, password from imagequiz.customer where email = $1', [email])
            .then(x => {
                if (x.rows.length == 1) {
                    let valid = bcrypt.compareSync(password, x.rows[0].password);
                    if (valid) {
                        return { valid: true, user: {id: x.rows[0].id, username: x.rows[0].email} };
                    } else {
                        return { valid: false, message: 'Credentials are not valid.' }
                    }
                } else {
                    return { valid: false, message: 'Email not found.' }
                }
            });

    },

    getQuiz: (name) => {
        let sqlQuery = `select q.id as quiz_id, q2.*  from imagequiz.quiz q join imagequiz.quiz_question qq on q.id = qq.quiz_id 
        join imagequiz.question q2 on qq.question_id = q2.id 
        where lower(q.name) =  $1`;
        return pool.query(sqlQuery, [name.toLowerCase()])
            .then(x => {
                //console.log(x);
                let quiz = {};
                if (x.rows.length > 0) {
                    quiz = {
                        id: x.rows[0].quiz_id,
                        questions: x.rows.map(y => {
                            return { id: y.id, picture: y.picture, choices: y.choices, answer: y.answer }
                        })
                    };
                }
                return quiz;
            });
    },

    getScores: () => {
        return scores;
    },

    getFlowers: () => {
        return pool.query('select name, picture from imagequiz.flowers')
        .then(x => {
            return x.rows;
        });
    }

}

module.exports = { store }