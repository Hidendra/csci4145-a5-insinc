'use strict';

let Promise = require('promise');
let request = require('request');
let Quote = require('../models/quote.js');

let MBR_BASE_URL = 'http://54.175.15.171:3000/api';
let MUN_BASE_URL = 'http://127.0.0.1:3000/v1';

/**
 * Gets a mortgage from the MBR. Returns a promise.
 */
let getMortgageFromMBR = (mortId) => {
    let url = MBR_BASE_URL + '/MortgageApplications?filter[where][mortgageID]=' + mortId;

    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }

            if (response.statusCode != 200) {
                reject('Status is ' + response.statusCode);
                return;
            }

            let json = JSON.parse(body);

            if (json === null || json.length != 1) {
                reject('Not found');
                return;
            }

            let mortgage = json[0];
            resolve(mortgage);
        });
    });
};

/**
 * Gets the service codes for a given MLS ID from MUN. Returns a promise.
 */
let getServiceCodesFromMUN = (mlsId) => {
    let url = MUN_BASE_URL + '/service-codes?mlsId=' + mlsId;

    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }

            if (response.statusCode != 200) {
                reject('Status is ' + response.statusCode);
                return;
            }

            let json = JSON.parse(body);

            if (json === null) {
                reject('Not found');
                return;
            }

            let services = json.services;

            if (services === null) {
                reject('Not found');
                return;
            }

            resolve(services);
        });
    });
};

module.exports.getQuote = (req, res) => {
    let mortId = req.query.mortId || null;

    if (mortId === null) {
        res.sendStatus(400);
        return;
    }

    Quote.findOne({mortId: mortId}, (err, result) => {
        if (result === null) {
            res.sendStatus(404);
        } else {
            res.json(result);
        }
    });
};

/**
 * Creates an insurance quote and sends it to MBR.
 * This does not return anything and can run in the background.
 */
let createAndSendInsuranceQuoteToMBR = (mortgage) => {
    getServiceCodesFromMUN(mortgage.houseID)
        .then((serviceCodes) => {
            calculateInsuranceQuote(mortgage, serviceCodes)
                .then((quote) => {
                    Quote.create(quote);

                    // Send back to MBR
                    mortgage.insuranceQuote = quote;
                    delete mortgage.insuranceQuote.mortId;

                    request({
                        method: 'PUT',
                        uri: MBR_BASE_URL + '/MortgageApplications',
                        headers: {
                            'Content-type': 'application/json'
                        },
                        body: JSON.stringify(mortgage)
                    });
                })
                .catch((error) => {
                    console.error('Failed to create insurance quote: ' + error);
                });
        })
        .catch((error => {
            res.sendStatus(500);
        }));
};

/**
 * Calculates an insurance quote for a given mortgage.
 */
let calculateInsuranceQuote = (mortgage, serviceCodes) => {
    return new Promise((resolve, reject) => {
        // Check for an existing quote
        Quote.findOne({mortId: mortgage.mortgageID}, (err, result) => {
            if (result !== null) {
                // TODO already found -- do what?
                console.error('Trying to calculate insurance quote for mortgage that already has a quote');
            } else {
                // TODO do some magic to calculate the insurance quote ...
                let insuranceQuote = {
                    'mortId': mortgage.mortgageID,
                    'deductibleValue': 5000,
                    'insuredValue': 695000
                };

                resolve(insuranceQuote);
            }
        });
    });
};

module.exports.postQuote = (req, res) => {
    let mortId = req.body.mortId || null;
    let value = parseInt(req.body.value) || null;

    if (mortId === null || value === null || value < 0) {
        res.sendStatus(404);
        return;
    }

    getMortgageFromMBR(mortId)
        .then((mortgage) => {
            createAndSendInsuranceQuoteToMBR(mortgage);

            res.json({
                'message': 'Insurance quote received. MBR will be notified when it is completed.'
            });
        })
        .catch((error) => {
            res.sendStatus(500);
        });
};
