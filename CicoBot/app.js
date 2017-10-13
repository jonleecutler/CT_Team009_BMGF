/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var azure = require('botbuilder-azure');
var builder = require('botbuilder');
var restify = require('restify');

var stateProperty = 'state';
var matchProperty = 'match';

var SessionState = {
    START : 0,
    HOMEPROMPT : 1,
    WITHDRAW : 2,
    DEPOSIT: 3,
    MATCHES: 4,
    MEET: 5
};

var users = {
    "Sunil" : 'https://cicostorage.blob.core.windows.net/bot-images/User%201.png',
    "Nikita" : 'https://cicostorage.blob.core.windows.net/bot-images/User%202.png',
    "Raj" : 'https://cicostorage.blob.core.windows.net/bot-images/User%203.png',
    "Amitabh" : 'https://cicostorage.blob.core.windows.net/bot-images/User%204.png',
    "Arjun" : 'https://cicostorage.blob.core.windows.net/bot-images/User%205.png'
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
            // TODO: handle depost, for now go back to start
            handleStartState(session);
            break;

        case SessionState.MATCHES:
            handleMatchesState(session);
            break;
            
        case SessionState.MEET:
            handleMeetState(session);
            break;

        case SessionState.START:   
        default:
            handleStartState(session);
            break;
    }
    
    //session.send("What would you like to do? [temp]");
    // var homePrompt = createHomePrompt(session);
    // var homeMsg = new builder.Message(session).addAttachment(homePrompt);
    // session.send(homeMsg);    

    //session.send('How much do you want to withdraw?');
    //session.send('Are you sure you want to withraw $_?');
    
    // var loadMatches = createLoadMatches(session);
    // var loadMatchesMsg = new builder.Message(session).addAttachment(loadMatches);
    //session.send('Finding Matches...');

    //var mapMatches = createMapMatches(session);
    //var mapMatchesMsg = new builder.Message(session).addAttachment(mapMatches);
    //session.send(mapMatchesMsg);

    //var matchCards = getMatchCards(session);
    //var matchCardsMsg = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(matchCards)
    //session.send(matchCardsMsg);

    //session.send('You have 24 hours to meet up to complete the cash exchange.');
    
    //var qrCode = createQRCode(session);
    //var qrCodeMsg = new builder.Message(session).addAttachment(qrCode);
    //session.send(qrCodeMsg);
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

function getSessionMatch(session) {
    return session.conversationData[matchProperty];
}

function setSessionMatch(session, match) {
    session.conversationData[matchProperty] = match;
}

function endSession(session) {
    session.conversationData = {};
}

/*----------------------------------------------------------------------------------------
* HELPER FUNCTIONS
* Used to respond to a request given a session state
* ---------------------------------------------------------------------------------------- */

function handleStartState(session) {
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

function handleWithdrawState(session) {
    session.send('Ok, finding matches who can give you %s in cash. Please wait...', session.message.text);
    
    // Display Map of Matches
    session.send(new builder.Message(session).addAttachment(createMapMatches(session)));
    // Display Carousel of Matches
    session.send(new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments((createMatchCards(session))));
    
    setSessionState(session, SessionState.MATCHES);
}

function handleMatchesState(session) {
    var match = session.message.text;
    
    // Set the match for the session
    setSessionMatch(session, match);
    
    session.send(new builder.Message(session).addAttachment(createConfirmMatch(session)));
    session.send(new builder.Message(session).addAttachment(createRateMatch(session)));
    setSessionState(session, SessionState.MEET);
}

function handleMeetState(session) {
    var match = getSessionMatch(session);
    
    session.send('Thank you for using Money Jadoo!');
    endSession(session);
}

/*----------------------------------------------------------------------------------------
* HELPER FUNCTIONS
* Used to create rich cards and other dynamic messages
* ---------------------------------------------------------------------------------------- */

function createWelcomeCard(session, name) {
    return new builder.HeroCard(session)
        .title('Welcome back to Money Jadoo, ' + name + '.')
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

function createMapMatches(session) {
    return new builder.HeroCard(session)
        .title('Here are your top 5 matches.')
        .subtitle('')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/Map%20Image.png')
        ])
        .buttons([
        ]);
}

function createMatchCards(session) {
    return [
      new builder.HeroCard(session)
        .title('Sunil S 🏆')
        .subtitle('0.5km | ⭐️⭐️⭐️⭐️⭐️ | Verified Agent')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/User%201.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, "Sunil", "Select Sunil")
      ]), 

      new builder.HeroCard(session)
        .title('Nikita P')
        .subtitle('0.7km | ⭐️⭐️⭐️⭐️⭐️')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/User%202.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, "Nikita", "Select Nikita")
      ]), 
      
      new builder.HeroCard(session)
        .title('Raj K')
        .subtitle('1.2km | ⭐️⭐️⭐️⭐️')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/User%203.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, "Raj", "Select Raj")
      ]), 
      
      new builder.HeroCard(session)
        .title('Amitabh B')
        .subtitle('3km | ⭐️⭐️⭐️')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/User%204.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, "Amitabh", "Select Amitabh")
      ]), 
      
      new builder.HeroCard(session)
        .title('Arjun K')
        .subtitle('5km | ⭐️⭐⭐⭐⭐')
        .text('')
        .images([
            builder.CardImage.create(session, 'https://cicostorage.blob.core.windows.net/bot-images/User%205.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, "Arjun", "Select Arjun")
      ]),      
    ];
}


function createConfirmMatch(session) {
    var match = getSessionMatch(session);
    
    return new builder.HeroCard(session)
        .title('You have two hours to meet ' + match + '.')
        .subtitle('Your digital amount is on hold.')
        .text('')
        .images([
            builder.CardImage.create(session, users[match])
        ])
        .buttons([
            builder.CardAction.postBack(session, "Call", "Call"),
            builder.CardAction.postBack(session, "Cancel", "Cancel")
        ]);
}

function createRateMatch(session) {
    var match = getSessionMatch(session);
        
    return new builder.HeroCard(session)
        .title('Rate ' + match + ' once you complete your exchange.')
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
        .title('How much do you want to depost?')
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

// function createQRCode(session) {
//     return new builder.HeroCard(session)
//         .title("Please scan your match's QR Code.")
//         .subtitle('Let your match scan this QR Code on their device. We use this to authenticate your meetup.')
//         .text('')
//         .images([
//             builder.CardImage.create(session, 'https://media.giphy.com/media/pwy82UN1wMJnq/giphy.gif')
//         ])
//         .buttons([
//         ]);
// }

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

// function createAudioCard(session) {
//     return new builder.AudioCard(session)
//         .title('I am your father')
//         .subtitle('Star Wars: Episode V - The Empire Strikes Back')
//         .text('The Empire Strikes Back (also known as Star Wars: Episode V – The Empire Strikes Back) is a 1980 American epic space opera film directed by Irvin Kershner. Leigh Brackett and Lawrence Kasdan wrote the screenplay, with George Lucas writing the film\'s story and serving as executive producer. The second installment in the original Star Wars trilogy, it was produced by Gary Kurtz for Lucasfilm Ltd. and stars Mark Hamill, Harrison Ford, Carrie Fisher, Billy Dee Williams, Anthony Daniels, David Prowse, Kenny Baker, Peter Mayhew and Frank Oz.')
//         .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg'))
//         .media([
//             { url: 'http://www.wavlist.com/movies/004/father.wav' }
//         ])
//         .buttons([
//             builder.CardAction.openUrl(session, 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back', 'Read More')
//         ]);
// }
