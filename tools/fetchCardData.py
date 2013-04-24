import urllib2
import json
import collections


class ChromeMessageCatalog(object):
    def __init__(self):
        self.catalog = collections.OrderedDict()

    def add(self, id, message):
        self.catalog[id] = {'message': message}

    def dumps(self, *args, **kwargs):
        return json.dumps(self.catalog, *args, **kwargs)


def dumpCardTypes(dataObj):
    catalog = ChromeMessageCatalog()

    for cardType, typeObj in dataObj['cardTypes'].items():
        catalog.add(cardType, typeObj['0'][0])

    return catalog


def dumpCards(dataObj):
    catalog = ChromeMessageCatalog()

    for cardObj in dataObj['cards']:
        id = cardObj['nameId']
        name = cardObj['name']['0']
        text = cardObj['text']['0']

        catalog.add(id + '.name', name)
        catalog.add(id + '.text', text)

    return catalog


def main():
    data = urllib2.urlopen('http://play.goko.com/Dominion/CardBuilder/FS.CardBuilder.Data.js').read()
    jsonStr = data.replace('FS.Dominion.CardBuilder.Data = ', '').replace('};', '}')
    dataObj = json.loads(jsonStr)

    file('cardTypes.json', 'w').write(dumpCardTypes(dataObj).dumps())

    file('cards.json', 'w').write(dumpCards(dataObj).dumps())

if __name__ == '__main__':
    main()
