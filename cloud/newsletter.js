var moment = require("moment"); // current time
var mailgun = require("mailgun"); // sending emails
var _ = require('underscore');  // email templating
var fs = require('fs');

// initialze mailgun with domain and API key
mailgun.initialize("sandbox6d7935d6b6fa46cb830bde2511060cc8.mailgun.org", "key-6bc3fad9806ac814453c3dcb3704dd99");

// compile template
var template = fs.readFileSync("cloud/views/deal_email.js","utf8");
var compiled = _.template(template);

Parse.Cloud.define("sendEmail", function(request, response) {
    mailgun.sendEmail({
        to: request.params.to,
        from: "BarLift <mailgun@sandbox6d7935d6b6fa46cb830bde2511060cc8.mailgun.org>",
        subject: request.params.subject,
        html: request.params.html
    }, {
        success: function(httpResponse) {
            response.success("Email sent!");
        },
        error: function(httpResponse) {
            response.error(httpResponse);
        }
    });
});

Parse.Cloud.define("pushesSent", function(request, response) {
    Parse.Cloud.useMasterKey();

    var query = new Parse.Query(Parse.Installation);
    var numPushes = 0;

    query.each(function(device) {
        var deviceToken = device.get('deviceToken');
        if (deviceToken) numPushes += 1;
    }).then(function() {     // Set the job's success status
        response.success(numPushes);  
    }, function(error) {     // Set the job's error status
        response.error("Error: " + error.code + " " + error.message);
    });

});


Parse.Cloud.define("afterDealEmails", function(request, response) {
    // Set up to modify data
    Parse.Cloud.useMasterKey();

    // query for all deals including users
    var deal_query = new Parse.Query("Deal");
    deal_query.include("user");

    // time var
    var current_time = moment().valueOf();
    var all_recipients = "divir94@gmail.com, oskarmelking2015@u.northwestern.edu, matsjohansen2015@u.northwestern.edu, shikhar@u.northwestern.edu, ZacharyAllen2016@u.northwestern.edu, nikhilpai2016@u.northwestern.edu, Dominicwong2014@gmail.com";
    var test_recipients = "Divir Gupta <divir94@gmail.com>";

    deal_query.each(function(deal) {
        var end_time = moment(deal.get("end_utc")).valueOf();
        var email_sent = deal.get("email_sent");
        var num_pushes;

        // send email if deal ended and email not already sent
        // if (current_time > end_time && email_sent === undefined) {
        if (deal.id == "bbX4swPeGA") {
            // fill in template
            var html = compiled(
                {
                   "bar_name": deal.get("user").get("bar_name"),
                   "deal_name": deal.get("name"),
                   "deal_start_date": moment(deal.get("deal_start_date").toString()).local().format("dddd, MMMM Do YYYY"),
                   "deal_start_time": moment(deal.get("deal_start_date").toString()).local().format("ha, MMMM Do YYYY"),
                   "deal_url": 'http://barliftdev.herokuapp.com/#/bar_feedback/' + deal.id,
                   "pushes_sent": 672
                }
            );

            // send message
            Parse.Cloud.run('sendEmail', {
                to: "divir94@gmail.com",
                subject: "Hello from BarLift!",
                html: html
            }, {
                success: function() {
                    console.log("email sent for deal");
                },
                error: function(error) {
                    console.log("failed to send email :(");
                }
            });

            // update email sent for deal 
            deal.set("email_sent", true);
            deal.save();
        }

    }).then(function(success) {
        // Set the job's success status
        response.success("success");
    }, function(error) {
        // Set the job's error status
        response.error("Uh oh, something went wrong.");
    });

});

Parse.Cloud.define("getDeal", function(request, response) {
    Parse.Cloud.useMasterKey();

    var query = new Parse.Query("Deal");
    query.equalTo("objectId", request.params.dealId);
    query.include('feedback');

    query.find({
        success: function(deal) {
            response.success(deal);
        },
        error: function(error) {
            response.error("Query failed.");
        }
    });
});
