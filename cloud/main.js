require('cloud/app.js');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("getCurrentDeal", function(request, response){
	var query = new Parse.Query("Deal");
	query.equalTo("community_name", request.params.location);
	var now = new Date();
	// query.greaterThan("deal_start_date", now);
	// query.lessThan("deal_end_date", now);
	query.limit(1);
	query.include('user');
	query.find({
		success: function(result){
			response.success(result);
		},
		error: function(error){
			response.error("Search failed, no results.")
		}
	});
});

