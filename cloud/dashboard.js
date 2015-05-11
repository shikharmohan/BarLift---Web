var moment = require("moment");

Parse.Cloud.define("hello2", function(request, response) {
    response.success("Hello 2!");
});

Parse.Cloud.define("hello3", function(request, response) {
    response.success("Hello 3!");
});

Parse.Cloud.define("getAllDeals", function(request, response) {
    // master key
    Parse.Cloud.useMasterKey();

    // variables
    var userObj = Parse.User.current();

    // get all deals if admin, otherwise only that of the user
    var dealQuery = new Parse.Query("Deal");
    if (userObj.bar_name != "Admin") {
        dealQuery.equalTo("user", userObj.objectId);
    }
    dealQuery.find({
        success: function(results) {
          response.success(results);
        },
        error: function() {
          response.error("Couldn't get deals");
        }
    });
});

