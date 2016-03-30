'use strict';

let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/insinc');

let app = express();

app.use(bodyParser.urlencoded({extended: true})); // support x-www-form-urlencoded
app.use(bodyParser.json());
app.use(cors());

app.set('mongoose', mongoose);

const LISTEN_PORT = 4000;

let api = require('./controllers/v1.js');
app.get('/v1/quote', api.getQuote);
app.post('/v1/quote', api.postQuote);

app.listen(LISTEN_PORT, () => {
    console.log('Listening on port ' + LISTEN_PORT);
});
