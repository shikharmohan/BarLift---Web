require('cloud/app.js');
require('cloud/newsletter.js');
require('cloud/dashboard.js');
require('cloud/deals.js');
require('cloud/payments.js');
var _ = require('underscore');
var moment = require("cloud/moment");

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

    // request.object.set("community_v2", []);
    if(request.object.get("newVersion") == undefined || request.object.get("newVersion") == false){
        request.object.set("newVersion", false);
    }
    if(request.object.get("profile")){
        var name = request.object.get("profile");
        request.object.set("full_name", name["name"]);
        if (request.object.get("nudges_left") >= 0 && request.object.get("nudges_left") <= 10) {
            response.success();
        } else if (request.object.get("nudges_left") < 0) {
            request.object.set("nudges_left", 0);
            request.object.save();
            response.success();
        } else {
            request.object.set("times_nudged", 0);
            request.object.set("nudges_left", 10);
            request.object.set("community_name", "Northwestern");
            request.object.save();
            response.success();
        }
    } else {
        request.object.save();
        response.success();
    }
});

Parse.Cloud.afterSave(Parse.User, function(request) {
    Parse.Cloud.useMasterKey();
    if(request.object.get('Role') !==  undefined){
        query = new Parse.Query(Parse.Role);
        query.get(request.object.get('Role').id, {
            success: function(object) {
                console.log("role found");
                console.log(object);
                object.relation("users").add(request.object);
                object.save();
            },
            error: function(error) {
            }
        });
    } 
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
    //query.limit(1);
    var profile = request.user.get("profile");
    console.log(profile);
    var first = profile['first_name'];
    var string = "Nudge! " + first + " wants to see you out!"
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
              
        user.set("nudges_left", 10);      
        user.save();
        return;
    }).then(function() {
        // Set the job's success status
        status.success("Reloaded nudges!");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });
});

//set new columns
Parse.Cloud.job("v2_columnUpdate", function(request, status){
    Parse.Cloud.useMasterKey();   // Query for all users
      
    var query = new Parse.Query(Parse.User);  
    query.each(function(user) {       // Set and save the changes 
        user.set("newVersion", false);
        user.set("community_v2", []);
        user.save();
        return;
    }).then(function(){
        status.success("Set community & version");
    }, function(error){
                status.error("Uh oh, something went wrong.");

    })
});

Parse.Cloud.job("addUserRoles", function(request, status){
    Parse.Cloud.useMasterKey();   // Query for all users
      
    var query = new Parse.Query(Parse.User);  
    query.each(function(user) {       // Set and save the changes 
        if(user.get('profile')){
            user.set("Role", {__type: "Pointer", className: "_Role", objectId: "uGBZhZM8LM"});
            user.save();
            return;
        }
    }).then(function(){
        status.success("Set community & version");
    }, function(error){
        status.error("Uh oh, something went wrong.");

    })
});


Parse.Cloud.job("splitGender", function(request, status) {   // Set up to modify user data
      
    Parse.Cloud.useMasterKey();   // Query for all users
      
    var query = new Parse.Query(Parse.User);  
    query.each(function(user) {       // Set and save the changes 
        if(user.get('profile') != undefined){
            var gender = user.get('profile').gender;
            user.set("gender", gender);      
            user.save();
        }
        return;
    }).then(function() {
        // Set the job's success status
        status.success("Gender split!");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });
});

// Social
Parse.Cloud.define("imGoing", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    deal_query.include("venue");
    var user_query = new Parse.Query("_User");
    var User;
    var Deal;
    deal_query.get(dealID, {
        success: function(deal) {
           // deal.increment("num_accepted", 1);
           // deal.save();
            user_query.get(userID, {
                success: function(user) {
                    console.log("Got user");
                    console.log(user);
                    user.increment("deals_redeemed", 1);
                    var newV = user.get("newVersion");
                    if(newV != undefined || newV != false){
                        user.set("bar_visited", deal.get("venue").get("bar_name"));
                    }
                    var dr = user.relation("deal_list");
                    dr.add(deal);
                    user.save();
                    var relation = deal.relation("social");
                    relation.add(user);
                    deal.addUnique("whos_going",request.user.get("fb_id"));
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

Parse.Cloud.define("getNumberNudges", function(request, response){
    Parse.Cloud.useMasterKey();
    var dealID = request.params.dealID;
    var query = new Parse.Query("Nudge");
    query.equalTo("dealID", dealID);
    query.count({
      success: function(count) {
        // The count request succeeded. Show the count
        response.success(count);
      },
      error: function(error) {
        response.error(error);
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
            // if(deal.get("num_accepted") > 1){
            //     deal.increment("num_accepted", -1);
            // }
            deal.save();
            user_query.get(userID, {
                success: function(user) {
                    console.log("Got user");
                    console.log(user);
                    if(user.get("deals_redeemed") > 0){
                        user.increment("deals_redeemed", -1);
                    }
                    var dr = user.relation("deal_list");
                    dr.remove(deal);
                    user.save();
                    var relation = deal.relation("social");
                    relation.remove(user);
                    deal.remove("whos_going", request.user.get("fb_id"));
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
                    if(request.user.get('gender')){

                    }
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
Parse.Cloud.define("getWhosGoing", function(request, response) {
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
                    query.ascending("gender");
                   // query.descending("createdAt");
                    query.find({
                        success: function(list) {
                            myIdx = -1;
                            imInt = false;
                            deal.set("num_accepted", list.length);
                            deal.save();
                            for (var i = 0; i < list.length; i++) {
                                var profile = list[i].get("profile");
                                fb = list[i].get("fb_id");
                                if(fb != request.user.get("fb_id")){
                                    result.push({"name":profile["name"], "fb_id":list[i].get("fb_id")});
                                }
                                else{
                                    myIdx = i;
                                }
                            }
                            if(myIdx != -1){
                                var myProf = list[myIdx].get("profile");
                                result.push({"name":myProf["name"], "fb_id": request.user.get("fb_id")});
                                imInt = true;
                            }
                            var uniqueArray = result.filter(function(elem, pos) {
                                return result.indexOf(elem) == pos;
                            });
                            response.success([uniqueArray, imInt]);
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


//Others who are interested
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

//NudgeV2
Parse.Cloud.define("nudge_v2", function(request, response) {
    Parse.Cloud.useMasterKey();
    var toUser = request.params.fb;
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('fb_id', toUser);
    var profile = request.user.get("profile");
    var first = profile['name'];
    var dealID = request.params.deal_objectId;
    var dealQuery = new Parse.Query("Deal");
    var bdg = 0;
    if(request.user.get('newVersion') != false){
        bdg = "Increment";
    }
    console.log(bdg);
    dealQuery.include("venue");
    dealQuery.get(dealID, {

        success:function(deal){
            
            var string = first + " wants to see you at " + deal.get("venue").get("bar_name");
            var Nudge = Parse.Object.extend("Nudge");
            var nudge = new Nudge();
            nudge.set("to_fb_id", toUser);
            nudge.set("from_user", request.user);
            nudge.set("deal", deal);
            nudge.set("dealID", deal.id);
            nudge.set("text", string)
            Parse.Push.send(
            {
                where: query,
                data: {
                    alert: string,
                    badge: bdg,
                    dealID:deal.id
                }
                
            }, 
            {
                success: function() {
                    console.log("Push was successful");
                    nudge.save(null, {
                        success:function (aFoob) {
                         console.log("Successfully saved a nudge");
                        response.success();
                        },
                         error:function (pointAward, error) {
                          console.log("Could not save a nudge " + error.message);
                         response.error(error.message);

                        }
                    });
                },
                error: function(error) {
                    console.error(error);
                    response.error(-1);
                }
            }); 
        },
        error: function(error){
            response.error(error);
        }

    });

});



//Load nudge history
Parse.Cloud.define("getMyNudges", function(request, response){
    Parse.Cloud.useMasterKey();
    var fb_id = request.user.get("fb_id");
    var query = new Parse.Query("Nudge");
    query.include("deal");
    query.include("from_user");
    query.equalTo("to_fb_id", fb_id);
    query.descending("createdAt");
    query.find({
        success: function(objects){
            response.success(objects);
        },
        error: function(error){
            response.error(error);
        }
    });

});

Parse.Cloud.define("resetBadges", function(request, response) {
    Parse.Cloud.useMasterKey();
    var fb_id = request.user.get("fb_id");
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('fb_id', fb_id);
    query.find({
        success: function(objects){
            for(var i =0; i < objects.length; i++){
                objects[i].set("badge", 0);
                objects[i].save();
            }
            response.success();

        },
        error: function(error){
            response.error(error);
        }


    });
});

Parse.Cloud.define("pushCount",function(request,response){
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('channels', request.params.community);
    query.count({
    success: function(count) {
        // The count request succeeded. Show the count
        response.success(count);
      },
      error: function(error) {
        // The request failed
        response.error(error);
      }
    });
});








