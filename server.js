"use strict";

var express = require('express'),
    bodyParser = require('body-parser'),
    processor = require('./modules/processor'),
    handlers = require('./modules/handlers'),
    postbacks = require('./modules/postbacks'),
    uploads = require('./modules/uploads'),
    //salesforce = require('./modules/salesforce'),
    FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN,
    app = express();

app.set('port', process.env.PORT || 5000);

app.use(bodyParser.json());

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/webhook', (req, res) => {
    let events = req.body.entry[0].messaging;
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let sender = event.sender.id;
        if (process.env.MAINTENANCE_MODE && ((event.message && event.message.text) || event.postback)) {
            sendMessage({text: `Sorry I'm taking a break right now.`}, sender);
        } else if (event.message && event.message.text) {
            let result = processor.match(event.message.text);
            if (result) {
                let handler = handlers[result.handler];
                if (handler && typeof handler === "function") {
                    handler(sender, result.match);
                } else {
                    console.log("Handler " + result.handlerName + " is not defined");
                }
            }
        } else if (event.postback) {
            let payload = event.postback.payload.split(",");
            let postback = postbacks[payload[0]];
            if (postback && typeof postback === "function") {
                postback(sender, payload);
            } else {
                console.log("Postback " + postback + " is not defined");
            }
        } else if (event.message && event.message.attachments) {
            uploads.processUpload(sender, event.message.attachments);
        }
    }
    res.sendStatus(200);
});

app.get('/webhookSalesforce', (req, res) => {
    res.send('Error, wrong validation token test');
    res.sendStatus(200);
});


app.post('/webhookSalesforce', (req, res) => {
    let test = req.body.test;
    console.log('Salesforce reaches heroku POST with message: ' + JSON.stringify(req.body));
    console.log('Salesforce reaches heroku POST with message: ' + test);
    let handler = handlers['searchHouse'];
    handler('1272907342749383');
    //1272907342749383
    res.sendStatus(200);
});





app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});