require('cloud/app.js');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("getpics", function(request, response){
	var Deal = Parse.Object.extend("Deal");
  var picquery = new Parse.Query(Deal);
  picquery.select("location_name","image_url", "bar_logo");
  picquery.find({
  	success: function(results){
  		console.log(JSON.stringify(results));
  		for(var i = 0; i < results.length; i++){
  			if(!results[i].hasOwnProperty("bar_logo")){
  				var request = Parse.Cloud.httpRequest({
  					headers:{
  						    'Content-Type': 'image/png'
  					},
  					url: results[i].image_url,
  					success: function(httpResponse) {
  					    console.log(httpResponse.data);
  					    var img = new Parse.File(results[i].location_name+".png",httpResponse.data);
  					    img.save();
  					    var objquery = new Parse.Query(Deal);
  					    objquery.get(results[i].objectID, {
  					      success: function(deal) {
  					        // The object was retrieved successfully.
  					        deal.bar_logo = img;
  					      },
  					      error: function(object, error) {
  					        // The object was not retrieved successfully.
  					        // error is a Parse.Error with an error code and message.
  					      }
  					    });

  					},
  					error: function(httpResponse) {
  					   console.error('Request failed with response code ' + httpResponse.status);
  					}
  				});
  				
  			}
  		}
  	},
  	error: function(error){
  		  	console.log("err cold not retrive objects " + error);
  	}

  });
});