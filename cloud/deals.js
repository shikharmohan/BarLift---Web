var moment = require("cloud/moment");
var _ = require('underscore');

Parse.Cloud.beforeSave("Deal", function(request, response) {
    Parse.Cloud.useMasterKey();
    var dayStart = moment(request.object.get('deal_start_date')).startOf('day');
    var dayEnd = moment(request.object.get('deal_start_date')).endOf('day');
    var err = {happened: false, message: ''};

    if(moment().isAfter(dayStart)){
        err.happened = true;
        err.message = "Error: You can't schedule deals in the past";
    }

    if(!err.happened && moment().add(3, 'days').isAfter(dayStart)){
        err.happened = true;
        err.message = "Error: You must schedule 3 days in advance";
    }

    var Deal = Parse.Object.extend("Deal");
    var sameDay = new Parse.Query(Deal);
    sameDay.greaterThanOrEqualTo("deal_start_date", dayStart.toDate());
    sameDay.lessThanOrEqualTo("deal_start_date", dayEnd.toDate());
    sameDay.equalTo('venue',request.object.get('venue'));
    sameDay.equalTo('venue',request.object.get('venue'));
    sameDay.notEqualTo('objectId',request.object.get('objectId'));

    var sameMain = new Parse.Query(Deal);
    sameMain.greaterThanOrEqualTo("deal_start_date", dayStart.toDate());
    sameMain.lessThanOrEqualTo("deal_start_date", dayEnd.toDate());
    sameMain.equalTo('main',true);

    var query = null;
    if(request.object.get('main')){
        query = Parse.Query.or(sameMain,sameDay);
    } else {
        query = sameDay;
    }
    
    query.find({
        success: function(results){
            if(!err.happened){
                console.log(results);
                if(results.length > 0){
                    err.happened = true;
                    err.message = "Error: another deal is scheduled for that day at this venue"
                }

                if(!err.happened){
                    response.success(request.object);
                } else {
                    response.error(err.message);
                }
            } else {
                response.error(err.message);
            }
        },
        error: function(error){
            response.error("Error: " + error.code + " " + error.message);
        }
    });
});


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


Parse.Cloud.define("dealAnalytics", function(request, response) {   // Set up to modify user data
      
    Parse.Cloud.useMasterKey();   // Query for all users


    var Deal = Parse.Object.extend("Deal");
    var query = new Parse.Query(Deal);
    query.get(request.params.dealId, function(deal) {
        var relation = deal.relation("social");
        var query = relation.query();
        query.find({
           success : function(results) {
                response.success(processData(results));
            },
           error : function(error) {
                response.error("Error: " + error.code + " " + error.message);
           }
        });
    });

    function processData(data){
        var gender = {male: 0, female: 0};
        var interestedCount = 0;
        var nightsOut = [0,0,0,0,0,0,0,0];
        var avgDealsRedeemed = 0;
        _.each(data, function(user) {
            if (user.get('profile').gender == 'female'){
                gender.female += 1;
            } else if (user.get('profile') && user.get('profile').gender == 'male'){
                gender.male += 1;
            }
            interestedCount += 1;
            if (user.get('num_nights') && user.get('num_nights') != 'Choose a number...'){
                nightsOut[parseInt(user.get('num_nights'))] += 1;
            }
            if (user.get('deals_redeemed')){
                avgDealsRedeemed += parseInt(user.get('deals_redeemed'));
            }
        });
        avgDealsRedeemed = avgDealsRedeemed / interestedCount;

        return {
            gender: gender,
            interestedCount: interestedCount,
            nightsOut: nightsOut,
            avgDealsRedeemed: avgDealsRedeemed
        };
    }
});

Parse.Cloud.define("possibleMainDeals",function(request,response){
    Parse.Cloud.useMasterKey();
    var Deal = Parse.Object.extend("Deal");
    var query = new Parse.Query(Deal);
    query.greaterThanOrEqualTo("deal_start_date", moment().add(3,'days').endOf('day').toDate());
    query.find({
        success: function(results){
            var out = [];
            _.each(results, function(deal) {
                if(!deal.get('main')){
                    var conflict = false;
                    _.each(results, function(compare) {
                        if(compare.get('main') && compare.get('community_name') === deal.get('community_name')){
                            var dayStart = moment(compare.get('deal_start_date')).startOf('day');
                            var dayEnd = moment(compare.get('deal_start_date')).endOf('day');
                            if(moment(deal.get('deal_start_date')).isBetween(dayStart,dayEnd)){
                                conflict = true;
                            }
                        }
                    });
                    if(!conflict){
                        out.push(deal);
                    }
                };
            });
            return response.success(out);
        },
        error: function(error){
            response.error("Error: " + error.code + " " + error.message);
        }
    });
});