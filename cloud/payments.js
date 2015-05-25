var Stripe = require('stripe');
Stripe.initialize('sk_test_76F3sfjMWNDAjAbb66hD0vNo');
var _ = require('underscore');
var moment = require("cloud/moment");


Parse.Cloud.define("subscribe", function(request, response) {
    Parse.Cloud.useMasterKey();
    var card = request.params;
    var user = request.user;
    console.log(user);
    Stripe.Customers.create({
      email: user.email,
      source: card.token,
      plan: card.plan,
    },{
      success: function(httpResponse) {
        user.set('stripe', httpResponse);
        user.save();
        response.success("Purchase made!");
      },
      error: function(httpResponse) {
        console.log(httpResponse.message);
        response.error(httpResponse.message);
      }
    });
});

Parse.Cloud.define("buyPush", function(request, response) {
    Parse.Cloud.useMasterKey();
    var user = request.user;
    var Deal = Parse.Object.extend("Deal");
    var deal = new Deal();
    deal.id =  request.params.deal;
    Stripe.InvoiceItems.create({
      customer: user.get('stripe').id,
      amount: request.params.amount *100,
      currency: "usd",
      description: request.params.description
    }, {
      success: function(httpResponse) {
        deal.set('main',true);
        deal.set('main_price',request.params.amount);
        deal.save();
        response.success("Purchase made!");
      },
      error: function(httpResponse) {
        response.error(httpResponse.message);
      }
    });
});


Parse.Cloud.define("getUpComingInvoice", function(request, response) {
    var user = request.user;
    if(user.get('stripe')){
      var stripe = user.get('stripe');
      Parse.Cloud.httpRequest({
        url: 'https://api.stripe.com/v1/invoices/upcoming',
        params: {customer: stripe.id},
        headers: {
          'Authorization': 'Bearer sk_test_76F3sfjMWNDAjAbb66hD0vNo'
        }
      }).then(function(res) {
        response.success(res);
      }, function(res) {
        response.error(res);
      });
    } else {
      response.error('Missing payment info');
    }
});

Parse.Cloud.job("billMonth", function(request, status) {   // Set up to modify user data
    if(moment().dayOfYear() === moment().startOf('month').dayOfYear()){
      Parse.Cloud.useMasterKey();   // Query for all users
      var Invoice = Parse.Object.extend("Invoice");
      var query = (new Parse.Query(Parse.Role));
      query.equalTo("name", "Bar");
      query.first({ success: function(role) {
        role.relation('users').query().find({
          success: function(users) {
            _.each(users, function(user){
              if(user.get('sub_price')){
                var inv = new Invoice();
                inv.set('amount', user.get('sub_price'));
                inv.set('user', user);
                inv.set('type', 'subscription');
                inv.set('description', {text: "Subscription for "+ moment().format("MMMM")});
                var invACL = new Parse.ACL();
                invACL.setPublicReadAccess(false);
                invACL.setPublicWriteAccess(false);
                invACL.setRoleReadAccess('Admin', true);
                invACL.setRoleWriteAccess('Admin', true);
                invACL.setReadAccess(user, true);
                invACL.setWriteAccess(user, false);
                inv.setACL(invACL);
                inv.save();
              }
            });
            status.success("Month billed");
          },
          error: function(error){
            status.error("Uh oh, something went wrong.");
          }
        })
      }});
    } else {
      status.success("Not start of month");
    }
});

