require('cloud/app.js');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

var scarce = true;
Parse.Cloud.afterSave("Deal", function(request, response){
			channel = []
			channel.push(request.object.get("community_name"));
			Parse.Push.send({
			  push_time: request.object.get("deal_start_date"),
			  channels: channel,
			  data: {
			    alert: request.object.get("name") + " at " + request.object.get("location_name"),
			    title: "BarLift New Deal"
			  }, 
			  success: function() {
				console.log(JSON.stringify(object));
			  },
			  error: function(error) {
				console.log("Error" + JSON.stringify(object));
			  }
				
			});
			if(request.object.get("deal_qty") < 10 && scarce){
				Parse.Push.send({
				  channels: channel,
				  data: {
				    alert: "Only " + request.object.get("deal_qty") + " deals left! " + "\n"+request.object.get("deal_name") + " at " + request.object.get("location_name"),
				    title: "Hurry Only A Few Deals Left"
				  }, 
				  success: function() {
				    scarce = false; //prevent many push from being sent
				    console.log("Success" + JSON.stringify(object));

				  },
				  error: function(error) {
				console.log("Error Push" + JSON.stringify(object));
				  }
					
				});
			}
});