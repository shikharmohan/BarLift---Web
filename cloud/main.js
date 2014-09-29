require('cloud/app.js');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("sendPush", function(request, response){
				channel = []
				channel.push(request.params.obj.get("community_name"));
				Parse.Push.send({
				  push_time: request.params.obj.get("deal_start_date"),
				  channels: channel,
				  data: {
				    alert: request.params.obj.get("name") + " at " + request.params.obj.get("location_name"),
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
				    alert: "Only " + request.params.obj.get("deal_qty") + " deals left! " + "\n"+request.params.obj.get("deal_name") + " at " + request.params.obj.get("location_name"),
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