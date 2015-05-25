var moment = require("moment");

Parse.Cloud.define("getNudgesByHour", function(request, response) {
    Parse.Cloud.useMasterKey();

    var dealID = request.params.dealID;
    var query = new Parse.Query("Nudge");
    query.equalTo("dealID", dealID);

    query.find({
        success: function(nudges) {
            response.success(nudges);
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("getDealUsers", function(request, response) {
    Parse.Cloud.useMasterKey();

    var Deal = Parse.Object.extend("Deal");
    var dealQuery = new Parse.Query(Deal);

    dealQuery.get(request.params.dealID, function(deal) {
        var relation = deal.relation("social");
        var userQuery = relation.query();
        // var groupsDict = {};

        userQuery.find(function(users) { 
            // for (var i = 0; i < users.length; i++) {
            //     var user = users[i];
            //     var group = user["affiliation"];
            //     if (groupsDict[group]) {
            //         groupsDict[group] += 1;
            //     } else {
            //         groupsDict[group] = 1;
            //     }
            // };
            response.success(users);
        });
    });

});
