var moment = require("moment"); // current time
var mailgun = require("mailgun"); // sending emails

// initialze mailgun with domain and API key
mailgun.initialize("sandbox6d7935d6b6fa46cb830bde2511060cc8.mailgun.org", "key-6bc3fad9806ac814453c3dcb3704dd99");

Parse.Cloud.define("sendEmail", function(request, response) {
    mailgun.sendEmail({
        to: request.params.to,
        from: "BarLift <mailgun@sandbox6d7935d6b6fa46cb830bde2511060cc8.mailgun.org>",
        subject: request.params.subject,
        text: request.params.text
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

Parse.Cloud.job("afterDealEmails", function(request, status) {
    // Set up to modify data
    Parse.Cloud.useMasterKey();

    // query for all deals including users
    var deal_query = new Parse.Query("Deal");
    deal_query.include("user");

    // time var
    var current_time = moment().valueOf();
    var all_recipients = "divir94@gmail.com, oskarmelking2015@u.northwestern.edu, matsjohansen2015@u.northwestern.edu, shikhar@u.northwestern.edu, ZacharyAllen2016@u.northwestern.edu, nikhilpai2016@u.northwestern.edu, Dominicwong2014@gmail.com"
    var test_recipients = "Divir Gupta <divir94@gmail.com>"

    deal_query.each(function(deal) {
        var end_time = moment(deal.get("end_utc")).valueOf();
        var email_sent = deal.get("email_sent");
        var num_pushes;

        // send email if deal ended and email not already sent
        if (current_time > end_time && email_sent === undefined) {
            var bar_name = deal.get("user").get("bar_name");

            // send message
            Parse.Cloud.run('sendEmail', {
                to: "divir94@gmail.com, oskarmelking2015@u.northwestern.edu, matsjohansen2015@u.northwestern.edu, shikhar@u.northwestern.edu, ZacharyAllen2016@u.northwestern.edu, nikhilpai2016@u.northwestern.edu, Dominicwong2014@gmail.com",
                subject: "Hello from BarLift!",
                text: "Hey " + bar_name + ",\n\nYou recently ran a deal with BarLift. It was titled '" + deal.get("name") + "'. We sent the deal to 768 students and " + deal.get("num_accepted") + " students accepted it. That's great news!\n\n Stay tuned for more information!\n\n Cheers,\nBarLift Team"
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
        return;
    }).then(function() {
        // Set the job's success status
        status.success("Sent post-deal emails!");
    }, function(error) {
        // Set the job's error status
        status.error("Uh oh, something went wrong.");
    });
});
