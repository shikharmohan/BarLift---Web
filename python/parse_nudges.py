import requests, lxml.html, pickle
import re
from bs4 import BeautifulSoup
from pprint import pprint

# s = requests.Session()
#
# response = s.get("https://parse.com")
# doc = lxml.html.fromstring(response.content)
# csrf = doc.cssselect("meta[name=csrf-token]")[0].get('content')
#
# data = {
# 	"authenticity_token": csrf,
# 	"user_session[email]": "barliftapp@gmail.com",
# 	"user_session[password]": "TurnUp2Nite!"
# }
#
# x = s.post("https://parse.com/user_session", data=data)
#
# pickle.dump(s, open('parse_session.pickle', 'wb'))

def find_tags(html, tag_name, class_name=False):
   soup = BeautifulSoup(html)
   if class_name: tags = soup.findAll(tag_name, { "class" : class_name })
   else: tags = soup.findAll(tag_name)
   return tags

def strip_tags(html):
    p = re.compile(r'<.*?>')
    return p.sub('', html)

def get_nudges(page_num, session, d):
    response = session.get("https://parse.com/apps/barlift--3/push_notifications?page=%d" % page_num)
    html = response.content

    targets = find_tags(html, 'span', 'has_tooltip')
    times = find_tags(html, 'td', 'push_time')

    for target, time in zip(targets, times):
        target = strip_tags(str(target)).strip().split()[0]    # target type (segment, everyone, or channels)
        date = strip_tags(str(time)).strip()[:10]    # ignore time, just get the date
        if target == 'Segment': d[date] = d.setdefault(date, 0) + 1

    print date, d
    return d

def get_all_nudges(num_pages):
    session = pickle.load(open('parse_session.pickle', 'rb'))
    d = {}
    for i in range(1, num_pages):
        d = get_nudges(i, session, d)
    pickle.dump(d, open('nudges_data.pickle', 'wb'))
    return d

d = get_all_nudges(160)
#d = pickle.load(open('nudges_data.pickle', 'rb'))
nudges_data = [(date, nudges) for date, nudges in sorted(d.items(), key=lambda p: p[0], reverse=True)]
pprint(nudges_data)
