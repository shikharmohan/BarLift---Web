var Stripe = require('stripe');
Stripe.initialize('sk_test_76F3sfjMWNDAjAbb66hD0vNo');


Parse.Cloud.define("subscribe", function(request, response) {
    Parse.Cloud.useMasterKey();
    var card = request.params;
    var user = request.user;
    Stripe.Customers.create({
      source: card.token,
      plan: card.plan,
      email: user.email
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