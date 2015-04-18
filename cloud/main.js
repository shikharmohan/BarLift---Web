require('cloud/app.js');
require('cloud/newsletter.js');
require("underscore");

Parse.Cloud.define("hello", function(request, response) {
    response.success("Hello world!");
});

// Users
Parse.Cloud.define("getUsers", function(request, response) {  
    Parse.Cloud.useMasterKey();   // Query for all users
      
    var query = new Parse.Query(Parse.User);
    var result = [];
    query.limit(500);
    query.descending("createdAt");
    query.find({
        success: function(results) {
            for (var i = 0; i < results.length; i++) {
                var object = results[i];
                var profile = results[i].get('profile');
                if (profile != undefined) {
                    if (profile["gender"] === 'female') {
                        var obj = {};
                        obj['fb_id'] = results[i].get('fb_id');
                        obj['name'] = profile['name'];
                        obj['team'] = results[i].get('dm_team');
                        obj['friends'] = results[i].get('friends').length;
                        obj['made'] = results[i].get('createdAt');
                        result.push(obj)
                    }
                }

            }

            function compare(a, b) {
                if (a.friends > b.friends)
                    return -1;
                if (a.friends < b.friends)
                    return 1;
                return 0;
            }

            result.sort(compare);
            response.success(result);
        },
        error: function(error) {
            response.error("Error: " + error.code + " " + error.message);
        }
    });
});

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
    if (request.object.get("nudges_left") >= 0 && request.object.get("nudges_left") <= 10) {
        response.success();
    } else if (request.object.get("nudges_left") < 0) {
        request.object.set("nudges_left", 0);
        response.success();
    } else {
        request.object.set("times_nudged", 0);
        request.object.set("nudges_left", 10);
        request.object.set("community_name", "Northwestern");
        request.object.save();
        response.success();
    }
});

// Deals
Parse.Cloud.define("getCurrentDeal", function(request, response) {
    var query = new Parse.Query("Deal");
    query.equalTo("community_name", request.params.location);
    var time = new Date();
    var ms = time.valueOf();
    console.log("Now : " + ms);
    query.greaterThanOrEqualTo("end_utc", ms);
    query.lessThanOrEqualTo("start_utc", ms);
    query.limit(1);
    query.include('user');
    query.find({
        success: function(deal) {
            response.success(deal);
        },
        error: function(error) {
            response.error("Search failed, no results.");
        }
    });
});

Parse.Cloud.define("getDeals", function(request, response) {
    var query = new Parse.Query("Deal");
    query.equalTo("community_name", request.params.location);
    query.lessThan("createdAt", request.params.date);
    query.include('user');
    query.include('social');
    query.first({
        success: function(object) {
            // Successfully retrieved the object.
            if (object) {
                response.success(object);
            } else {
                response.error("No object found");
            }
        },
        error: function(error) {
            response.error("Query failed.");
        }
    });
});

// Nudges
Parse.Cloud.define("loadNudges", function(request, response) {
    var user = request.user;
    response.success(request.user.get("nudges_left"));
});

Parse.Cloud.define("loadNudgeData", function(request, response) {
    Parse.Cloud.useMasterKey();
    var user = request.user;
    var dealID = request.dealID;
    var nudge = Parse.Object.extend("Nudge");
    var query = new Parse.Query(nudge);
    var loc = user.get('community_name');
    var result = [];
    Parse.Cloud.run('getCurrentDeal', {
        'location': loc
    }, {
        success: function(deal) {
            console.log(request.user.object.id);
            query.equalTo("from", request.user.object.id);
            query.equalTo("deal", deal.id);
            query.descending("createdAt");
            query.include('to');
            query.find({
                success: function(list) {
                    console.log(JSON.stringify(list));
                    for (var i = 0; i < list.length; i++) {
                        result.push(list['to']);
                    }
                    response.success(result);
                },
                error: function(error, object) {
                    response.error(object);
                }

            })
        },
        error: function(error) {}
    });
});

Parse.Cloud.define("newNudge", function(request, response) {
    Parse.Cloud.useMasterKey();
    var toUser = request.params.receipient;
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('fb_id', toUser);
    var profile = request.user.get("profile");
    console.log(profile);
    var first = profile['first_name'];
    var string = "Nudge! " + first + " wants to see you at La Macchina tomorrow for brunch."
    var currentDeal;
    var loc = "Northwestern";
    Parse.Cloud.run('getCurrentDeal', {
        'location': loc
    }, {
        success: function(deal) {
            currentDeal = deal[0];
            if (request.user.get("nudges_left") > 0) {
                Parse.Push.send({
                    where: query,
                    data: {
                        alert: string,
                        badge: 0
                    }
                }, {
                    success: function() {
                        console.log("Push was successful");
                        var Nudge = Parse.Object.extend("Nudge");
                        var nudge = new Nudge();
                        nudge.set("to_fb_id", toUser);
                        nudge.set("from_fb_id", request.user.get("fb_id"));
                        nudge.set("deal", currentDeal);
                        nudge.save(null, {
                            success: function(nudge) {
                                // Execute any logic that should take place after the object is saved.
                                console.log('New object created with objectId: ' + nudge.id);
                                request.user.increment("nudges_left", -1);
                                request.user.save();
                                response.success(request.user.get("nudges_left"));

                            },
                            error: function(nudge, error) {
                                // Execute any logic that should take place if the save fails.
                                // error is a Parse.Error with an error code and message.
                                console.log('Failed to create new object, with error code: ' + error.message);
                                response.error(-1);
                            }
                        });
                    },
                    error: function(error) {
                        console.error(error);
                        response.error(-1);
                    }
                });
            } else {
                response.success(0);
            }
        },
        error: function(error) {

        }
    });
});

Parse.Cloud.define("nudge", function(request, response) {
    Parse.Cloud.useMasterKey();
    var toUser = request.params.receipient;
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('fb_id', toUser);
    query.limit(1);
    var profile = request.user.get("profile");
    console.log(profile);
    var first = profile['first_name'];
    var string = "Nudge! " + first + " wants to see you at Praire Moon tonight!"
    if (request.user.get("nudges_left") > 0) {
        Parse.Push.send({
            where: query,
            data: {
                alert: string,
                badge: 0
            }
        }, {
            success: function() {
                console.log("Push was successful");
                request.user.increment("times_nudged", 1);
                request.user.increment("nudges_left", -1);
                request.user.save();
                response.success(request.user.get("nudges_left"));
            },
            error: function(error) {
                console.error(error);
                response.error(-1);
            }
        });
    } else {
        response.success(0);
    }
});

Parse.Cloud.job("reloadNudges", function(request, status) {   // Set up to modify user data
      
    Parse.Cloud.useMasterKey();   // Query for all users
      
    var query = new Parse.Query(Parse.User);  
    query.each(function(user) {       // Set and save the changes 
              
        user.set("nudges_left", 30);      
        return user.save();
        status.success("success");  
    }).then(function() {     // Set the job's success status
          }, function(error) {     // Set the job's error status
            
        status.error("Uh oh, something went wrong.");  
    });
});

// Social
Parse.Cloud.define("imGoing", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var User;
    var Deal;
    deal_query.get(dealID, {
        success: function(deal) {
            deal.increment("num_accepted");
            deal.save();
            user_query.get(userID, {
                success: function(user) {
                    console.log("Got user");
                    console.log(user);
                    user.increment("deals_redeemed", 1);
                    user.save();
                    var relation = deal.relation("social");
                    relation.add(user);
                    deal.save();
                    response.success(1);
                },
                error: function(object, error) {
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error) {
            response.error("Search failed, no deal query failed.");
        }
    });
});

Parse.Cloud.define("notGoing", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var User;
    var Deal;
    deal_query.get(dealID, {
        success: function(deal) {
            deal.increment("num_accepted", -1);
            deal.save();
            user_query.get(userID, {
                success: function(user) {
                    console.log("Got user");
                    console.log(user);
                    user.increment("deals_redeemed", -1);
                    user.save();
                    var relation = deal.relation("social");
                    relation.remove(user);
                    deal.save();
                    response.success(1);
                },
                error: function(object, error) {
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error) {
            response.error("Search failed, no deal query failed.");
        }
    });
});

Parse.Cloud.define("getFriends", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    console.log(dealID);
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var fb_ids = [];
    var result = [];
    deal_query.get(dealID, {
        success: function(deal) {
            user_query.get(userID, {
                success: function(user) {
                    var friends = user.get("friends");
                    var dealGoers = deal.relation("social");
                    fb_ids.push(user.get("fb_id"));
                    for (var i = 0; i < friends.length; i++) {
                        fb_ids.push(friends[i]["fb_id"]);
                    }
                    var query = dealGoers.query();
                    query.descending("createdAt");
                    //query.containedIn("fb_id", fb_ids);
                    query.find({
                        success: function(list) {
                            for (var i = 0; i < list.length; i++) {
                                var profile = list[i].get("profile");
                                result.push([profile["name"], list[i].get("fb_id")]);
                            }
                            var uniqueArray = result.filter(function(elem, pos) {
                                return result.indexOf(elem) == pos;
                            });
                            response.success(uniqueArray);
                        }
                    });

                },
                error: function(object, error) {
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error) {
            response.error("Can't get deal");
        }
    });
});


//Friends who are interested
Parse.Cloud.define("getInterestedFriends", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    console.log(dealID);
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var fb_ids = [];
    var result = [];
    deal_query.get(dealID, {
        success: function(deal) {
            user_query.get(userID, {
                success: function(user) {
                    var friends = user.get("friends");
                    var dealGoers = deal.relation("social");
                    fb_ids.push(user.get("fb_id"));
                    for (var i = 0; i < friends.length; i++) {
                        fb_ids.push(friends[i]["fb_id"]);
                    }
                    var query = dealGoers.query();
                    query.descending("createdAt");
                    query.containedIn("fb_id", fb_ids);
                    query.find({
                        success: function(list) {
                            for (var i = 0; i < list.length; i++) {
                                var profile = list[i].get("profile");
                                result.push([profile["name"], list[i].get("fb_id")]);
                            }
                            var uniqueArray = result.filter(function(elem, pos) {
                                return result.indexOf(elem) == pos;
                            });
                            response.success(uniqueArray);
                        }
                    });

                },
                error: function(object, error) {
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error) {
            response.error("Can't get deal");
        }
    });
});

//Others who are interested
Parse.Cloud.define("getInterestedOthers", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    console.log(dealID);
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var fb_ids = [];
    var result = [];
    deal_query.get(dealID, {
        success: function(deal) {
            user_query.get(userID, {
                success: function(user) {
                    var friends = user.get("friends");
                    var dealGoers = deal.relation("social");
                    fb_ids.push(user.get("fb_id"));
                    for (var i = 0; i < friends.length; i++) {
                        fb_ids.push(friends[i]["fb_id"]);
                    }
                    var query = dealGoers.query();
                    query.descending("createdAt");
                    query.notContainedIn("fb_id", fb_ids);
                    query.find({
                        success: function(list) {
                            for (var i = 0; i < list.length; i++) {
                                var profile = list[i].get("profile");
                                result.push([profile["name"], list[i].get("fb_id")]);
                            }
                            var uniqueArray = result.filter(function(elem, pos) {
                                return result.indexOf(elem) == pos;
                            });
                            response.success(uniqueArray);
                        }
                    });

                },
                error: function(object, error) {
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error) {
            response.error("Can't get deal");
        }
    });
});

// Scoring
Parse.Cloud.define("getScores", function(request, response) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query("User");
    score = {};  
    query.each(function(user) {       // Set and save the change
        var team = user.get('dm_team');
        if (score[team] != undefined) {
            score[team] += 1;
        } else {
            score[team] = 1;
        }  
    }).then(function() {     // Set the job's success status
        response.success(score);  
    }, function(error) {     // Set the job's error status
            
        status.error("Uh oh, something went wrong.");  
    });
});

// Data filtering
Parse.Cloud.job("studentGroup", function(request, status) {   // Set up to modify user data
      
    Parse.Cloud.useMasterKey();   // Query for all users
      
    var query = new Parse.Query(Parse.User);  
    query.each(function(user) {       // Set and save the changes 
              
        team = user.get("dm_team");
        profile = user.get('profile');
        if (profile != undefined) {
            gender = profile["gender"];
        } else {
            gender = "";
        }
        result = [];
        if (team == 'Choose a team...') {
            result = [];
        } else if (team == '') {
            result = [];
        } else if (team == undefined) {
            result = [];
        } else {
            if (team.indexOf("/") > -1) {
                s = team.split("/");
                if (gender == "male") {
                    result.push(s[0]);
                } else if (gender == "female") {
                    result.push(s[1]);
                }
            } else {
                result.push(team);
            }
        }
        user.set("student_groups", result);
        user.save();
        status.success("success");  
    }).then(function() {     // Set the job's success status
          }, function(error) {     // Set the job's error status
            
        status.error("Uh oh, something went wrong.");          
    });
});