(function () {
    "use strict";

    var runScriptInPageContext = function (func, args) {
        var actualCode, script, i;

        actualCode =  '(' + func + ')(';
        if (Array.isArray(args)) {
            for (i = 0; i < args.length; ++i) {
                actualCode += (i > 0 ? ',' : '') + JSON.stringify(args[i]);
            }
        }
        actualCode += ');'

        script = document.createElement('script');
        script.textContent = actualCode;
        (document.head || document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    };

    var getJson = function (url) {
        var promise = new RSVP.Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === xhr.DONE) {
                    if (xhr.status === 200) { resolve(JSON.parse(xhr.responseText)); } else { reject(xhr); }
                }
            };
            xhr.send();
        });

        return promise;
    };

    var injectMessagesToCardBuilderData = function (cardTypesMessages, cardsMessages) {
        window.addEventListener('load', function () {
            var cardTypes = FS.Dominion.CardBuilder.Data.cardTypes,
                cards = FS.Dominion.CardBuilder.Data.cards,
                cardBuilder = FS.Dominion.CardBuilder.getInstance();

            var eachMessage = function (messages, cb) {
                Object.keys(messages).forEach(function (key) {
                    cb(key, messages[key].message);
                });
            };

            function findCardObject(nameId) {
                var cardObj;
                cards.forEach(function (v) {
                    if (v.nameId === nameId) { cardObj = v; }
                });
                return cardObj;
            }

            eachMessage(cardTypesMessages, function (key, message) {
                cardTypes[key]['0'] = [message];
            });

            eachMessage(cardsMessages, function (key, message) {
                var keyPair = key.split('.'),
                    nameId = keyPair[0],
                    propName = keyPair[1],
                    cardObj = findCardObject(nameId);

                if (cardObj === undefined) { return; }

                cardObj[propName]['0'] = message;
            });

            cardBuilder.clearAllCardCache();
        }, false);
    };

    var messageJsonPromises = [
        getJson(chrome.extension.getURL('/_locales/ja/cardTypes.json')),
        getJson(chrome.extension.getURL('/_locales/ja/cards.json'))
    ];

    RSVP.all(messageJsonPromises).then(function (results) {
        runScriptInPageContext(injectMessagesToCardBuilderData, [results[0], results[1]]);
    });
}());
