'use strict';

let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let Quote = new Schema({
    mortId: {
        type: String,
        unique: true,
        index: true
    },
    deductibleValue: Number,
    clientName: String,
    insuredValue: Number
});

module.exports = mongoose.model('Quote', Quote);
