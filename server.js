"use strict";

var express = require('express'),
    bodyParser = require('body-parser'),
    processor = require('./modules/processor'),
    handlers = require('./modules/handlers'),
    postbacks = require('./modules/postbacks'),
    uploads = require('./modules/uploads'),
    request = require('request'),
    messenger = require('./modules/messenger'),
    //salesforce = require('./modules/salesforce'),
    FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN,
    app = express();

var mapIdSession = {};

var endpoint = "https://d.la4-c1-phx.salesforceliveagent.com/chat/rest/";

let addValueToList = (key, value) => {
    mapIdSession[key] = mapIdSession[key] || [];
    mapIdSession[key].push(value);
}

app.set('port', process.env.PORT || 5000);

app.use(bodyParser.json());

/*app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/webhook', (req, res) => {
    let events = req.body.entry[0].messaging;
    console.log('Entered the webhook with ID : ' + req.body.entry[0].id);
    for (let i = 0; i < events.length; i++) {
        let event = events[i];
        let sender = event.sender.id;
        console.log('------------ SENDER ----------- ' + sender);
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
});*/

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
            if (!mapIdSession[req.body.entry[0].id]) {
                startSession(event.message.text, req.body.entry[0].id);
            }
            else {
                sendMessageSalesforce(event.message.text, req.body.entry[0].id);
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


/*    let test = req.body.test;
    console.log('Salesforce reaches heroku POST with message: ' + JSON.stringify(req.body));
    console.log('Salesforce reaches heroku POST with message: ' + test);
    let handler = handlers['searchHouse'];
    handler('1272907342749383');
    //1272907342749383
    res.sendStatus(200);
});
*/

let sendMessageSalesforce = (text, customerId) => {
    var options = {
        url: endpoint + 'Chasitor/ChatMessage',
        method: 'POST',
        headers: {
            "X-LIVEAGENT-AFFINITY" : mapIdSession[customerId][0].affinityToken,
            "X-LIVEAGENT-SESSION-KEY" : mapIdSession[customerId][0].key,
            "X-LIVEAGENT-API-VERSION" : 40
        },
        json: true,
        body: {
            text: text
        }
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            
        }
    }

    request(options, callback);

}

let startSession = (text, customerId) => {

    var optionsStartSession = {
        url: endpoint + 'System/SessionId',
        method: 'GET',
        headers: {
            "X-LIVEAGENT-AFFINITY" : null,
            "X-LIVEAGENT-API-VERSION" : 40
        }
    };

    function callbackStartSession(error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            console.log(info.affinityToken + ' ' + info.key + ' ' + info.id);
            startVisitorChat(info.affinityToken, info.key, info.id, customerId, text);
            addValueToList(customerId, info);
        }
    }

    request(optionsStartSession, callbackStartSession);

}

let startVisitorChat = (affinityToken, sessionKey, session, customerId, text) => {

    var options = {
        url: endpoint + 'Chasitor/ChasitorInit',
        method: 'POST',
        headers: {
            "X-LIVEAGENT-AFFINITY" : affinityToken,
            "X-LIVEAGENT-API-VERSION" : 40,
            "X-LIVEAGENT-SESSION-KEY" : sessionKey,
            "X-LIVEAGENT-SEQUENCE" : 1
        },
        json: true,
        body: {
            organizationId:"00Df4000003A63E",
            deploymentId:"572f4000000UCmo",
            buttonId:"573f4000000UADt",
            sessionId: session,
            userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
            language:"en-US",
            screenResolution:"1680x1050",
            visitorName:"Ben",
            prechatDetails:[],
            receiveQueueUpdates:true,
            prechatEntities:[],
            isPost:true
        }
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            //sendMessageSalesforce(text, customerId);
            startLongPolling(affinityToken, sessionKey, session, 1, customerId);
        } else {
            console.log('Error in Chasitor: ' + response.statusCode);
            console.log('result: ' + body);
        }
    }

    request(options, callback);
}

let startLongPolling = (affinityToken, sessionKey, session, lastSentRequest, customerId) => {
    var options = {
        url: endpoint + 'System/Messages',
        method: 'GET',
        headers: {
            "X-LIVEAGENT-AFFINITY" : affinityToken,
            "X-LIVEAGENT-API-VERSION" : 40,
            "X-LIVEAGENT-SESSION-KEY" : sessionKey,
        }
    };

    function callback(error, response, body) {
        if (!error && (response.statusCode == 200 || response.statusCode == 204)) {
            if (!(body == '' || body == 'OK')) {
                console.log(body);
                var bodyJson = JSON.parse(body);
                bodyJson.messages.forEach(messageJson => {
                    console.log(messageJson.type);
                    if (messageJson.type == 'ChatMessage') {
                        messenger.send({text: `${messageJson.message.text}`}, '1272907342749383');
                    }
                    if (messageJson.type == 'ChatEnded' || messageJson.type == 'ChatRequestFail' ) {
                        delete mapIdSession[customerId];
                    }
                });
            }
            if (!(mapIdSession[customerId] == undefined)) {
                startLongPolling(affinityToken, sessionKey, session, lastSentRequest+1, customerId);
            }
        } else {
            console.log('Error in Chasitor: ' + response.statusCode);
            console.log('result: ' + body);
        }
    }

    request(options, callback);

}


app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});