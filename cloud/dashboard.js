var moment = require("moment");

Parse.Cloud.define("getNudgesByHour", function(request, response){
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

