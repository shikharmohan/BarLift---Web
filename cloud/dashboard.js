var moment = require("moment");

Parse.Cloud.define("hello2", function(request, response) {
    response.success("Hello 2!");
});

Parse.Cloud.define("hello3", function(request, response) {
    response.success("Hello 3!");
});

