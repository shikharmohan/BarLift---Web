var Stripe = require('stripe');
Stripe.initialize('sk_test_76F3sfjMWNDAjAbb66hD0vNo');


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
      Stripe.InvoiceItems.list(stripe.id).then(
        function(res){
          console.log(res);
          response.success(res);
        },
        function(res){
          console.log(res);
          response.error(res);
        }
      );
    } else {
      response.error('Missing payment info');
    }
});