import json, httplib, urllib
from pprint import pprint

config = {
    "X-Parse-Application-Id": "5DZi1FrdZcwBKXIxMplWsqYu3cEEumlmFDB1kKnC",
    "X-Parse-REST-API-Key": "pMT9AefpMkJfbcJ5fTA2uOGxwpitMII7hpCt8x4O"
}
params = urllib.urlencode({
    "keys":"deals_redeemed,dm_team,num_nights,pay_interest,profile,times_nudged",
    "where":json.dumps({
        "$relatedTo": {
            "object": {
                "__type": "Pointer",
                "className": "Deal",
                "objectId": "cBlCoCNQDo"
            },
            "key": "social"
        }
    })
})

# create
connection = httplib.HTTPSConnection('api.parse.com', 443)
# connect
connection.connect()
# request
connection.request('GET', '/1/users?%s' % params, '', config)
# response
result = json.loads(connection.getresponse().read())

pprint(result)
# pprint([x['dm_team'] for x in result['results']])
