import json,httplib

connection = httplib.HTTPSConnection('api.parse.com', 443)
connection.connect()
connection.request('POST', '/1/functions/afterDealEmails', json.dumps({
     }), {
       "X-Parse-Application-Id": "5DZi1FrdZcwBKXIxMplWsqYu3cEEumlmFDB1kKnC",
       "X-Parse-REST-API-Key": "pMT9AefpMkJfbcJ5fTA2uOGxwpitMII7hpCt8x4O",
       "Content-Type": "application/json"
     })

result = json.loads(connection.getresponse().read())
print result