import urllib2
import json
import collections


def transformCardTypes(dataObj):
    cardTypes = {}

    for cardType, typeObj in dataObj['cardTypes'].items():
        cardTypes[cardType] = typeObj['0']

    return cardTypes


def transformCards(dataObj):
    cards = []

    for cardObj in dataObj['cards']:
        id = cardObj['nameId']
        name = cardObj['name']['0']
        text = cardObj['text']['0']

        d = collections.OrderedDict()
        d['nameId'] = id
        d['name'] = name
        d['text'] = text
        cards.append(d)

    return cards


def createMessageCatalog(dataObj):
    catalog = collections.OrderedDict()

    catalog['cardTypes'] = transformCardTypes(dataObj)
    catalog['cards'] = transformCards(dataObj)

    return catalog


def main():
    data = urllib2.urlopen('http://play.goko.com/Dominion/CardBuilder/FS.CardBuilder.Data.js').read()
    jsonStr = data.replace('FS.Dominion.CardBuilder.Data = ', '').replace('};', '}')
    dataObj = json.loads(jsonStr)

    messageCatalog = createMessageCatalog(dataObj)
    catalogJson = json.dumps(messageCatalog, indent=4)

    file('../messageCatalog.en.js', 'w').write('_dominionTranslatorCallback(%s);' % catalogJson)


if __name__ == '__main__':
    main()
