/*-----------------------------------------------------------------------------
Pocket Change bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var azure = require('botbuilder-azure');
var builder = require('botbuilder');
var restify = require('restify');
var Promise = require('bluebird');
var request = require('request-promise').defaults({ encoding: null });
var btoa = require('btoa');

var stateProperty = 'state';
var depositIdProperty = 'depositId';
var withdrawIdProperty = 'withdrawId';

var SessionState = {
    START : 0,
    HOMEPROMPT : 1,
    WITHDRAW : 2,
    DEPOSIT: 3,
    MEET: 4,
    RATE: 5
};

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);

var storageTableName = 'sessionstate';
var storageAccountName = process.env.StorageAccountName;
var storageAccountKey = process.env.StorageAccountKey;

var azureTableClient = new azure.AzureTableClient(storageTableName, storageAccountName, storageAccountKey);
var tableStorage = new azure.AzureBotStorage({gzipData: false}, azureTableClient);

// Set custom store
bot.set('storage', tableStorage);

// Enable conversation data persistence
bot.set('persistConversationData', true);

var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';
var LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.onDefault((session) => {
    // If the user requests a reset at any time go back to start
    if (session.message.text.toUpperCase() == 'RESET') {
        endSession(session);
    }
    
    var state = getSessionState(session);
    
    // session.send('Name: \'%s\'\n, Id: \'%s\'\n, Input: \'%s\'\n, Channel: \'%s\'\n, State: \'%s\'',
    //     session.message.user.name,
    //     session.message.user.id,
    //     session.message.text,
    //     session.message.source,
    //     state);
    
    switch (state) {
        case SessionState.HOMEPROMPT:
            handleHomePromptState(session);
            break;
        
        case SessionState.WITHDRAW:
            handleWithdrawState(session);
            break;

        case SessionState.DEPOSIT:
            handleDepositState(session);
            break;

        case SessionState.MEET:
            handleMeetState(session);
            break;
            
        case SessionState.RATE:
            handleRateState(session);
            break;

        case SessionState.START:   
        default:
            handleStartState(session);
            break;
    }
});

bot.dialog('/', intents);

/*----------------------------------------------------------------------------------------
* HELPER FUNCTIONS
* Used to manage session state for a conversation
* ---------------------------------------------------------------------------------------- */

function getSessionState(session) {
    var state = session.conversationData[stateProperty];
    if (state == null) {
        setSessionState(session, SessionState.START);
        return SessionState.START;
    }
    
    return state;
}

function setSessionState(session, state) {
    session.conversationData[stateProperty] = state;
}

function getSessionDepositId(session) {
    return session.conversationData[depositIdProperty];
}

function getSessionWithdrawId(session) {
    return session.conversationData[withdrawIdProperty];
}

function setSessionDepositId(session, depositId) {
    session.conversationData[depositIdProperty] = depositId;
}

function setSessionWithdrawId(session, withdrawId) {
    session.conversationData[withdrawIdProperty] = withdrawId;
}

function endSession(session) {
    session.conversationData = {};
}

/*----------------------------------------------------------------------------------------
* HELPER FUNCTIONS
* Used to respond to a request given a session state
* ---------------------------------------------------------------------------------------- */

function handleStartState(session) {
    // Ensure the user exists
    createOrUpdateUser(session);
    
    session.send(new builder.Message(session).addAttachment(createWelcomeCard(session, session.message.user.name)));  
    session.send(new builder.Message(session).addAttachment(createHomeCard(session)));  
    setSessionState(session, SessionState.HOMEPROMPT);
}

function handleHomePromptState(session) {
    var message = session.message.text;

    if (message.toUpperCase() == 'WITHDRAW') {
        session.send(new builder.Message(session).addAttachment(createWithdrawCard(session)));
        setSessionState(session, SessionState.WITHDRAW);
        return;
    } else if (message.toUpperCase() == 'DEPOSIT') {
        session.send(new builder.Message(session).addAttachment(createDepositCard(session)));
        setSessionState(session, SessionState.DEPOSIT);
        return;
    } else if (message.toUpperCase() == 'HISTORY') {
        // TODO: handle displaying of history
    }

    handleStartState(session);
}

function handleDepositState(session) {
    if (session.message.attachments && session.message.attachments.length > 0) {
        var attachment = session.message.attachments[0];
        var fileDownload = checkRequiresToken(session.message)
            ? requestWithToken(attachment.contentUrl)
            : request(attachment.contentUrl);

        fileDownload.then(function (response) {                
            var image = btoa(response);
        
            createDepositRequest(session.message.user.id, image).then(function (parsedBody) {
                console.log('create deposit request success');
                
                // Notify the user that we are looking for matches and will let them know
                session.send('Thank you, we are currently looking for withdrawers and will notify you when we have a match!');
     
                // Set the session state to rate
                setSessionState(session, SessionState.RATE);
            })
            .catch(function (err) {
                console.log('create deposit request failed');
            });
        });
    }
    else {
        session.send('Ok great, please upload an image of your cash. We will match you with someone who can give you %s in digital.', session.message.text);
    }
}

function handleWithdrawState(session) {
    createWithdrawRequest(session.message.user.id).then(function (parsedBody) {
        console.log('create withdraw request success');
        
        // Send action message to self
        session.send(`We found a match! when you meet with ${parsedBody.matchUserName} upload a picture of the cash you are accepting to confirm the transaction. You must accept the bill with serial number ${parsedBody.serialNumber}.`);
        
        // Display match to self
        session.send(new builder.Message(session).addAttachment(createMatchCard(session, parsedBody.matchUserName, parsedBody.matchUserImageUri)));

        // Send action message to peer 
        // Display match to peer
        sendProactiveCard(
            createMatchCard(session, parsedBody.userName, parsedBody.userImageUri),
            `We found a match! when you meet with ${parsedBody.userName} they will need to upload a picture of the cash you are delivering to confirm the transaction. You must provide the bill with serial number ${parsedBody.serialNumber}.`,
            parsedBody.matchUserAddress);

        // Set the session deposit and withdraw ids
        setSessionDepositId(session, parsedBody.depositId);
        setSessionWithdrawId(session, parsedBody.withdrawId);

        // Set the session state to meet
        setSessionState(session, SessionState.MEET);
    })
    .catch(function (err) {
        console.log('create withdraw request failed');
    });
}

function handleMeetState(session) {
    
    console.log('handleMeetState start');
    
    if (session.message.attachments && session.message.attachments.length > 0) {
        
        console.log('handleMeetState got attachment');
        
        var attachment = session.message.attachments[0];
        var fileDownload = checkRequiresToken(session.message)
            ? requestWithToken(attachment.contentUrl)
            : request(attachment.contentUrl);

        fileDownload.then(function (response) {                
            var image = btoa(response);
            var depositId = getSessionDepositId(session);
            var withdrawId = getSessionWithdrawId(session);
        
            createVerifyRequest(depositId, withdrawId, image).then(function (parsedBody) {
                console.log('create verify request success');
                
                // Send action notice to self
                session.send(`Withdrawal complete! cash has been successfully accepted from ${parsedBody.matchUserName}, and your account has been debited.`);
        
                // Display match to self
                session.send(new builder.Message(session).addAttachment(createRateCard(session, parsedBody.matchUserName)));
        
                // Send action notice to peer
                // Display rating prompt to peer
                sendProactiveCard(
                    createRateCard(session, parsedBody.userName),
                    `Deposit complete! cash has been successfully accepted by ${parsedBody.userName}, and your account has been credited.`,
                    parsedBody.matchUserAddress);
     
                // Set the session state to rate
                setSessionState(session, SessionState.RATE);
            })
            .catch(function (err) {
                console.log('create verify request failed');
                
                // The serial number is incorrect
                if (err.response.statusCode == 401) {
                    session.send('The cash you have scanned does not have the expected serial number.');
                }
                
                // The image is not cash
                else if (err.response.statusCode == 400) {
                    session.send('The image you have scanned is not cash.');
                }
            });
        });
    }
    else {
        session.send('Please upload an image of the cash you are accepting.');
    }
}

function handleRateState(session) {
    session.send('Thank you for using Pocket Change!');
    endSession(session);
}

/*----------------------------------------------------------------------------------------
* HELPER FUNCTIONS
* Used to create rich cards and other dynamic messages
* ---------------------------------------------------------------------------------------- */

function createWelcomeCard(session, name) {
    return new builder.HeroCard(session)
        .title('Namaste, ' + name + '!')
        .subtitle('')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/Money%20Jadoo.png')
        ])
        .buttons([
        ]);
}

function createHomeCard(session) {
    return new builder.HeroCard(session)
        .title('What would you like to do?')
        .subtitle('')
        .text('')
        .images([])
        .buttons([
            builder.CardAction.postBack(session, "Withdraw", "Withdraw"),
            builder.CardAction.postBack(session, "Deposit", "Deposit"),
            builder.CardAction.postBack(session, "History", "History")
        ]);
}

// function createMapOfSafeMeetup(session) {
//     return new builder.HeroCard(session)
//         .title('Meetup Site - Verified Secure')
//         .subtitle('')
//         .text('')
//         .images([
//             builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/02%20map.png')
//         ])
//         .buttons([
//         ]);
// }

function createMatchCard(session, name, imageUri) {
      return new builder.HeroCard(session)
        .title(name)
        .subtitle('0.5km | ⭐️⭐️⭐️⭐️ | Verified')
        .text('')
        .images([
            builder.CardImage.create(session, imageUri)
        ])
        .buttons([
            builder.CardAction.postBack(session, "Call", "Call"),
            builder.CardAction.postBack(session, "Message", "Message")
      ]);
}

function createRateCard(session, name) {
    return new builder.HeroCard(session)
        .title(`Rate ${name} based on your recent transaction.`)
        .subtitle('')
        .text('')
        .images([
        ])
        .buttons([
            builder.CardAction.postBack(session, 'positive', '👍'),
            builder.CardAction.postBack(session, 'negative', '👎'),
            builder.CardAction.postBack(session, 'report', 'Report ⚠'),
        ]);
}

function createWithdrawCard(session) {
    return new builder.HeroCard(session)
        .title('How much do you want to withdraw?')
        .subtitle('')
        .text('Select an option below or type an amount (e.g. $4.50).')
        .images([])
        .buttons([
            builder.CardAction.postBack(session, "$1.00", "$1.00"),
            builder.CardAction.postBack(session, "$2.00", "$2.00"),
            builder.CardAction.postBack(session, "$3.00", "$3.00"),
        ]);
}

function createDepositCard(session) {
    return new builder.HeroCard(session)
        .title('How much do you want to deposit?')
        .subtitle('')
        .text('Select an option below or type an amount (e.g. $4.50).')
        .images([])
        .buttons([
            builder.CardAction.postBack(session, "$1.00", "$1.00"),
            builder.CardAction.postBack(session, "$2.00", "$2.00"),
            builder.CardAction.postBack(session, "$3.00", "$3.00"),
            builder.CardAction.postBack(session, "Other", "Other")
        ]);
}

// Request file with Authentication Header
var requestWithToken = function (url) {
    return obtainToken().then(function (token) {
        return request({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            }
        });
    });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var checkRequiresToken = function (message) {
    return message.source === 'skype' || message.source === 'msteams';
};

var getUserRequest = function (id) {
    var uri = `https://cicoservice.azurewebsites.net/api/users/${id}`;
    
    var options = {
        method: 'GET',
        uri: uri,
        json: true // Automatically stringifies the body to JSON
    };
 
    return request(options);
};

var createOrUpdateUserRequest = function (message) {
    var uri = `https://cicoservice.azurewebsites.net/api/users`;
    
    var options = {
        method: 'POST',
        uri: uri,
        body: {
            id: message.user.id,
            name: message.user.name,
            address: JSON.stringify(message.address)
        },
        json: true // Automatically stringifies the body to JSON
    };
 
    return request(options);
};
 
function createOrUpdateUser(session) {
    createOrUpdateUserRequest(session.message).then(function (parsedBody) {
        console.log('user updated');
    })
    .catch(function (err) {
        console.log('failed to update user');
    });
};

var createDepositRequest = function (userId, image) {
    var uri = `https://cicoservice.azurewebsites.net/api/requests`;
    
    var options = {
        method: 'POST',
        uri: uri,
        body: {
            userId: userId,
            currency: 'USD',
            amount: 1,
            type: 'deposit',
            image: image
        },
        json: true // Automatically stringifies the body to JSON
    };
 
    return request(options);
};

var createWithdrawRequest = function (userId) {
    var uri = `https://cicoservice.azurewebsites.net/api/requests`;
    
    var options = {
        method: 'POST',
        uri: uri,
        body: {
            userId: userId,
            currency: 'USD',
            amount: 1,
            type: 'withdraw'
        },
        json: true // Automatically stringifies the body to JSON
    };
 
    return request(options);
};

var createVerifyRequest = function (depositId, withdrawId, image) {
    var uri = `https://cicoservice.azurewebsites.net/api/requests/verify`;
    
    var options = {
        method: 'POST',
        uri: uri,
        body: {
            depositId: depositId,
            withdrawId: withdrawId,
            image: image
        },
        json: true // Automatically stringifies the body to JSON
    };
 
    return request(options);
};

// function sendProactiveMessage(message, address) {
//     var msg = new builder.Message().address(JSON.parse(address));
//     msg.text(message);
//     msg.textLocale('en-US');
//     bot.send(msg);
// }

function sendProactiveCard(card, message, address) {
    var msg = new builder.Message().address(JSON.parse(address));
    msg.text(message);
    msg.addAttachment(card);
    msg.textLocale('en-US');
    bot.send(msg);
}

// var order = 1234;
// function createReceiptCard(session) {
//     return new builder.ReceiptCard(session)
//         .title('John Doe')
//         .facts([
//             builder.Fact.create(session, order++, 'Order Number'),
//             builder.Fact.create(session, 'VISA 5555-****', 'Payment Method')
//         ])
//         .items([
//             builder.ReceiptItem.create(session, '$ 38.45', 'Data Transfer')
//                 .quantity(368)
//                 .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png')),
//             builder.ReceiptItem.create(session, '$ 45.00', 'App Service')
//                 .quantity(720)
//                 .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png'))
//         ])
//         .tax('$ 7.50')
//         .total('$ 90.95')
//         .buttons([
//             builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/pricing/', 'More Information')
//                 .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/microsoft-azure.png')
//         ]);
// }
