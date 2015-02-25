require('cloud/app.js');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
var _ = require("underscore");
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});
  
Parse.Cloud.define("getCurrentDeal", function(request, response){
    var query = new Parse.Query("Deal");
    query.equalTo("community_name", request.params.location);
    var time = new Date();
    var ms = time.valueOf();
    console.log("Now : "+ ms);
    query.greaterThanOrEqualTo("end_utc", ms);
    query.lessThanOrEqualTo("start_utc", ms);
    query.limit(1);
    query.include('user');
    query.find({
        success: function(deal){
            response.success(deal);
        },
        error: function(error){
            response.error("Search failed, no results.");
        }
    });
});
  
Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  if (request.object.get("nudges_left") <= 10) {
    response.success();
  } else {
    request.object.set("times_nudged", 0);
    request.object.set("nudges_left", 10);
    request.object.set("community_name", "Northwestern");
    request.object.save();
    response.success();
  }
});
 
Parse.Cloud.define("loadNudgeData", function(request, response){
    Parse.Cloud.useMasterKey();
    var user = request.user;
    var dealID = request.dealID;
    var nudge = Parse.Object.extend("Nudge");
    var query = new Parse.Query(nudge);
    var loc = user.get('community_name');
    var result = [];
    Parse.Cloud.run('getCurrentDeal', { 'location': loc }, {
      success: function(deal) {
        console.log(request.user.object.id);
        query.equalTo("from", request.user.object.id);
        query.equalTo("deal", deal.id);
        query.descending("createdAt");
        query.include('to');
        query.find({
            success: function(list){
                console.log(JSON.stringify(list));
                for(var i = 0; i < list.length; i++){
                    result.push(list['to']);
                }
                response.success(result);
            },
            error: function(error, object){
                response.error(object);
            }
 
        })
      },
      error: function(error) {
      }
    });
 
 
 
});
 
 
Parse.Cloud.define("newNudge", function(request, response){
    Parse.Cloud.useMasterKey();
    var toUser = request.params.receipient;
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('fb_id', toUser);
    var profile = request.user.get("profile");
    console.log(profile);
    var first = profile['first_name'];
    var string = "Nudge! " + first + " wants to see you out tonight."
    var currentDeal;
    var loc = "Northwestern";
    Parse.Cloud.run('getCurrentDeal', { 'location': loc }, {
        success: function(deal){
            currentDeal = deal;
            if(request.user.get("nudges_left") > 0){
                Parse.Push.send({ 
                  where: query,
                  data: {
                    alert: string
                  }
                }, {
                  success: function() {
                    console.log("Push was successful");
                    var Nudge = Parse.Object.extend("Nudge");
                    var nudge = new Nudge();
                    nudge.set("to_fb_id", toUser);
                    nudge.set("from_fb_id", request.user.get("fb_id"));
                    nudge.set("deal", deal);
                    nudge.save();
                    request.user.increment("nudges_left", -1);
                    request.user.save();
                    response.success(request.user.get("nudges_left"));
                  },
                  error: function(error) {
                    console.error(error);
                    response.error(-1);
                  }
                });     
                }
                else{
                    response.success(0);
                }
        },
        error: function(error){
 
        }
    });
 
 
 
});
 
 
Parse.Cloud.define("nudge", function(request, response){
    Parse.Cloud.useMasterKey();
    var toUser = request.params.receipient;
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('fb_id', toUser);
    var profile = request.user.get("profile");
    console.log(profile);
    var first = profile['first_name'];
    var string = "Nudge! " + first + " wants to see you out tonight."
    if(request.user.get("nudges_left") > 0){
    Parse.Push.send({ 
      where: query,
      data: {
        alert: string
      }
    }, {
      success: function() {
        console.log("Push was successful");
        request.user.increment("times_nudged",1);
        request.user.increment("nudges_left", -1);
        request.user.save();
        response.success(request.user.get("nudges_left"));
      },
      error: function(error) {
        console.error(error);
        response.error(-1);
      }
    });     
    }
    else{
        response.success(0);
    }
 
  
  
});
  
Parse.Cloud.define("getScores", function(request, response) {
  var query = new Parse.Query("User");
  query.find({
    success: function(users) {
      var score = {}
      users.forEach(function(user) {
        var team = user.get('dm_team');
        score[team] ? score[team]++ : score[team]=1;
      });
      response.success(score);
    },
    error: function() {
      response.error("Can't get scores");
    }
  });
});
  
Parse.Cloud.define("imGoing", function(request, response){
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var User;
    var Deal;
    deal_query.get(dealID, {
        success: function(deal){
            deal.increment("num_accepted");
            deal.save();
            user_query.get(userID, {
                success: function(user){
                    console.log("Got user");
                    console.log(user);
                    user.increment("deals_redeemed", 1);
                    user.save();
                    var relation = deal.relation("social");
                    relation.add(user);
                    deal.save();
                    response.success(1);
                },
                error: function(object, error){
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error){
            response.error("Search failed, no deal query failed.");
        }
    });
});
  
Parse.Cloud.define("notGoing", function(request, response){
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var User;
    var Deal;
    deal_query.get(dealID, {
        success: function(deal){
            deal.increment("num_accepted", -1);
            deal.save();
            user_query.get(userID, {
                success: function(user){
                    console.log("Got user");
                    console.log(user);
                    user.increment("deals_redeemed", -1);
                    user.save();
                    var relation = deal.relation("social");
                    relation.remove(user);
                    deal.save();
                    response.success(1);
                },
                error: function(object, error){
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error){
            response.error("Search failed, no deal query failed.");
        }
    });
  
  
  
});
  
  
Parse.Cloud.define("getFriends", function(request, response){
    Parse.Cloud.useMasterKey();
    var dealID = request.params.deal_objectId;
    console.log(dealID);
    var userID = request.params.user_objectId;
    var deal_query = new Parse.Query("Deal");
    var user_query = new Parse.Query("_User");
    var fb_ids = [];
    var result = [];
    deal_query.get(dealID, {
        success: function(deal){
            user_query.get(userID, {
                success: function(user){
                    var friends = user.get("friends");
                    var dealGoers = deal.relation("social");
                    fb_ids.push(user.get("fb_id"));
                    for(var i = 0; i < friends.length; i++){
                        fb_ids.push(friends[i]["fb_id"]);
                    }
                    var query = dealGoers.query();
                    query.descending("createdAt");
                    query.containedIn("fb_id", fb_ids);
                    query.find({
                        success:function(list){
                            for (var i =0; i < list.length; i++){
                                var profile = list[i].get("profile");
                                result.push([profile["name"],list[i].get("fb_id")]);
                            }
                            response.success(result);
                        }
                    });
  
                },
                error: function(object, error){
                    response.error("Search failed, user failed.");
                }
            });
        },
        error: function(object, error){
            response.error("Can't get deal");
        }
  
  
    });
  
  
});