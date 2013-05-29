var global = window;

module("CURL", {
   setup: function () {
      if (!global.sense)
         global.sense = {};
      var sense = global.sense;
      sense.tests = {};
   },

   teardown: function () {
      sense.tests = {};
   }
});

var notCURLS = [
   'sldhfsljfhs',
   's;kdjfsldkfj curl -XDELETE ""',
   '{ "hello": 1 }'
];

var CURLS = [
   {
      "curl": "curl -XPUT 'http://localhost:9200/twitter/tweet/1' -d '{ \
            \"user\" : \"kimchy\", \
         \"post_date\" : \"2009-11-15T14:12:12\",\
         \"message\" : \"trying out Elastic Search\"\
         }'",
      "ret": {
         "server": "http://localhost:9200",
         "method": "PUT",
         "endpoint": "/twitter/tweet/1",
         "data": "{ \
            \"user\" : \"kimchy\", \
         \"post_date\" : \"2009-11-15T14:12:12\",\
         \"message\" : \"trying out Elastic Search\"\
         }"
      }
   },
   {
      "curl": "curl -XGET \"localhost/twitter/tweet/1?version=2\" -d '{ \
    \"message\" : \"elasticsearch now has versioning support, double cool!\"\
     }'",
      "ret": {
         "server": "http://localhost",
         "method": "GET",
         "endpoint": "/twitter/tweet/1?version=2",
         "data": "{ \
    \"message\" : \"elasticsearch now has versioning support, double cool!\"\
     }"
      }
   },
   {
      "curl": "curl -XPOST https://localhost/twitter/tweet/1?version=2 -d '{ \n\
    \"message\" : \"elasticsearch now has versioning support, double cool!\"\n\
     }'",
      "ret": {
         "server": "https://localhost",
         "method": "POST",
         "endpoint": "/twitter/tweet/1?version=2",
         "data": "{ \n\
    \"message\" : \"elasticsearch now has versioning support, double cool!\"\n\
     }"
      }
   }
];

for (var i = 0; i < notCURLS.length; i++)

   test("cURL Detection - broken strings "+i, function (c) {
      return function () {
         ok(!global.sense.curl.detectCURL(notCURLS[c]), "marked as curl while it wasn't:" + notCURLS[c]);
      }
   }(i)
   );

for (var i = 0; i < CURLS.length; i++)


   test("cURL Detection - correct strings "+i, function (c) {
      return function () {
         ok(global.sense.curl.detectCURL(CURLS[c].curl), "marked as not curl while it was:" + CURLS[c].curl);
         deepEqual(global.sense.curl.parseCURL(CURLS[c].curl), CURLS[c].ret);
      }
   }(i)
   );

