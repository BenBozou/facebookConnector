"use strict";

var express = require('express'),
    bodyParser = require('body-parser'),
    processor = require('./modules/processor'),
    handlers = require('./modules/handlers'),
    postbacks = require('./modules/postbacks'),
    uploads = require('./modules/uploads'),
    request = require('request'),
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
    console.log('Entered the webhook with ID : ' + req.body.entry[0].id);
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

    startSession();



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


let startSession = () => {

    var options = {
        url: 'https://d.la1-c1cs-par.salesforceliveagent.com/chat/rest/System/SessionId?SessionId.ClientType=chasitor',
        method: 'GET',
        headers: {
            "X-LIVEAGENT-AFFINITY" : null,
            "X-LIVEAGENT-API-VERSION" : 41
        }
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var info = JSON.parse(body);
            console.log('Session Key: ' + info.key);
            console.log('Session id: ' + info.id);
            console.log('Session affinityToken: ' + info.affinityToken);
            console.log('Session clientPollTimeout: ' + info.clientPollTimeout);
            startVisitorChat(info.affinityToken, info.key, info.id);
        }
    }

    request(options, callback);

}

let startVisitorChat = (affinityToken, sessionKey, sessionId) => {
    var options = {
        url: 'https://d.la1-c1cs-par.salesforceliveagent.com/chat/rest/Chasitor/ChasitorInit',
        method: 'POST',
        headers: {
            "X-LIVEAGENT-AFFINITY" : affinityToken,
            "X-LIVEAGENT-API-VERSION" : 41,
            "X-LIVEAGENT-SESSION-KEY" : sessionKey,
            "X-LIVEAGENT-SEQUENCE" : 1
        }
        /*json:true,
        body: {
            organizationId:"00D20000000ou8W",
            deploymentId:"5720J000000TP0Z",
            buttonId:"5730J000000TPOD",
            sessionId:sessionId,
            userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
            language:"en-US",
            screenResolution:"1680x1050",
            visitorName:"",
            prechatDetails:[{"label":"CaseRecordType","value":"01220000000VDiF","entityMaps":[],"transcriptFields":[],"displayToAgent":"true","doKnowledgeSearch":false},{"label":"ContactSSN","value":"asdfasdfasfd","entityMaps":[],"transcriptFields":[],"displayToAgent":"true","doKnowledgeSearch":false},{"label":"CaseStatus","value":"New","entityMaps":[],"transcriptFields":[],"displayToAgent":"true","doKnowledgeSearch":false},{"label":"CaseOrigin","value":"Web","entityMaps":[],"transcriptFields":[],"displayToAgent":"true","doKnowledgeSearch":false}],
            receiveQueueUpdates:true,
            prechatEntities:[{"entityName":"Contact","showOnCreate":"false","linkToEntityName":"Case","linkToEntityField":"ContactId","saveToTranscript":"ContactId","entityFieldsMaps":[{"fieldName":"LastName","label":"ContactLastName","doFind":"false","isExactMatch":"false","doCreate":"false"},{"fieldName":"FirstName","label":"ContactFirstName","doFind":"false","isExactMatch":"false","doCreate":"false"},{"fieldName":"SSN__c","label":"ContactSSN","doFind":"true","isExactMatch":"true","doCreate":"false"}]}],
            isPost:true
        }*/
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('result: ' + body);
        } else {
            console.log('Error in Chasitor: ' + response.statusCode);
            console.log('result: ' + body);
            console.log(error);
        }
    }

    request(options, callback);
}


app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});