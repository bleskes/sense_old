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
   '{ "hello": 1 }',
   'curl up like a ball',
   'curlly hair'
];


// stringify an object, with random indentation (or none) and quotes.
function stringify(obj) {
   var q = Math.random() * 100 > 50 ? "'" : '"';
   var qRE = new RegExp(q, 'g');
   var indent = Array(Math.floor(Math.random() * 6)).join(' ') || undefined;
   return q + JSON.stringify(obj, null, indent).replace(qRE, '\\' + q) + q;
}

function giveLeadingNewLine(quotedStr) {
   return quotedStr.charAt(0) + '\n' + quotedStr.substring(1);
}

function unwrapQuotes(str) {
   if (str[0] === '"' || str[0] === "'") {
      var quote = str[0];
      str = str.substring(1, str.length-1).replace(new RegExp('\\'+quote, 'g'), quote);
   }
   return str;
}

var tweetsJSON = [
   {
      user: 'kimchy',
      post_date: '2009-11-15T14:12:12',
      message: 'trying out Elastic Search'
   },
   {
      message: 'elasticsearch now has versioning support, double cool!'
   }
].map(stringify);

var mappingJSON = stringify({
   mappings: {
   }
});

var queryJSON = stringify({
   query: {
   }
});

var CURLS = [
   {
      curl: "curl -XPUT 'http://localhost:9200/twitter/tweet/1' -d " + tweetsJSON[0],
      ret: [
         {
            server: "http://localhost:9200",
            method: "PUT",
            url: "/twitter/tweet/1",
            data: tweetsJSON[0]
         }
      ]
   },
   {
      curl: "curl -XGET \"localhost/twitter/tweet/1?version=2\" -d=" + tweetsJSON[1],
      ret: [
         {
            server: "http://localhost",
            method: "GET",
            url: "/twitter/tweet/1?version=2",
            data: tweetsJSON[1]
         }
      ]
   },
   {
      curl: "curl -XPOST https://localhost/twitter/tweet/1?version=2 -d " + tweetsJSON[1],
      ret: [
         {
            server: "https://localhost",
            method: "POST",
            url: "/twitter/tweet/1?version=2",
            data: tweetsJSON[1]
         }
      ]
   },
   {
      curl: "curl -XPOST https://localhost/twitter",
      ret: [
         {
            server: "https://localhost",
            method: "POST",
            url: "/twitter",
            data: ""
         }
      ]
   },
   {
      curl: "curl -X POST https://localhost/twitter/",
      ret: [
         {
            server: "https://localhost",
            method: "POST",
            url: "/twitter/",
            data: ""
         }
      ]
   },
   {
      curl: "curl -s -XPOST localhost:9200/missing-test -d" + mappingJSON,
      ret: [
         {
            server: "http://localhost:9200",
            method: "POST",
            url: "/missing-test",
            data: mappingJSON
         }
      ]
   },
   {
      curl: "curl 'localhost:9200/missing-test/doc/_search?pretty' -d" + giveLeadingNewLine(queryJSON),
      ret: [
         {
            server: "http://localhost:9200",
            method: "",
            url: "/missing-test/doc/_search?pretty",
            data: queryJSON
         }
      ]
   },
   {
      // complex example copied from chrome's network inspector
      curl: 'curl \'http://demo.kibana.org/logstash-2013.10.25/_search\' -H \'Pragma: no-cache\' -H \'Origin: http://demo.kibana.org\' -H \'Accept-Encoding: gzip,deflate,sdch\' -H \'Host: demo.kibana.org\' -H \'Accept-Language: en-US,en;q=0.8\' -H \'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36\' -H \'Content-Type: application/json;charset=UTF-8\' -H \'Accept: application/json, text/plain, */*\' -H \'Cache-Control: no-cache\' -H \'Referer: http://demo.kibana.org/\' -H \'Connection: keep-alive\' --data-binary \'{"facets":{"0":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"html"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717617,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"1":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"php"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"2":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"css"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"3":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"png"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"4":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"gif"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}}},"size":0}\' --compressed\'',
      ret: [
         {
            server: 'http://demo.kibana.org',
            url: '/logstash-2013.10.25/_search',
            method: '',
            data: '{"facets":{"0":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"html"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717617,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"1":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"php"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"2":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"css"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"3":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"png"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}},"4":{"date_histogram":{"field":"@timestamp","interval":"10m"},"facet_filter":{"fquery":{"query":{"filtered":{"query":{"query_string":{"query":"gif"}},"filter":{"bool":{"must":[{"match_all":{}},{"range":{"@timestamp":{"from":1382651717619,"to":"now"}}},{"bool":{"must":[{"match_all":{}}]}}]}}}}}}}},"size":0}'
         }
      ]
   },
   {
      curl: [
         "# shell comment",
         "// js comment",
         "git status",
         "curl 'localhost:9200/missing-test/doc/_search?pretty' -d=" + queryJSON,
         "curl localhost:9200 -d=" + queryJSON,
         "curl //localhost:9200 -d=" + queryJSON,
         "curl -XPOST https://localhost/twitter/tweet/1?version=2 -d " + tweetsJSON[1]
      ].join('\n'),
      ret: [
         {
            server: "http://localhost:9200",
            method: "",
            url: "/missing-test/doc/_search?pretty",
            data: queryJSON
         },
         {
            server: "http://localhost:9200",
            method: "",
            url: "/",
            data: queryJSON
         },
         {
            server: "http://localhost:9200",
            method: "",
            url: "/",
            data: queryJSON
         },
         {
            server: "https://localhost",
            method: "POST",
            url: "/twitter/tweet/1?version=2",
            data: tweetsJSON[1]
         }
      ]
   }
];

function compareCURL(results, expecteds) {
   ok(results.length === expecteds.length, "expected " + expecteds.length + " results, got " + results.length);
   expecteds.forEach(function (expected, i) {
      var result = results[i] || {};
      deepEqual(result.server, expected.server);
      deepEqual(result.method, expected.method);
      deepEqual(result.url, expected.url);
      deepEqual(result.data, unwrapQuotes(expected.data));
   });
}

notCURLS.forEach(function (notCURL, i) {
   test("cURL Detection - broken strings " + i, function () {
      ok(!global.sense.curl.detectCURL(notCURL), "marked as curl while it wasn't:" + notCURL);
   });
});

CURLS.forEach(function (CURL, i) {
   test("cURL Detection - correct strings " + i, function () {
      ok(global.sense.curl.detectCURL(CURL.curl), "marked as not curl while it was:" + CURL.curl);
      var r = global.sense.curl.parseAll(CURL.curl);
      compareCURL(r, CURL.ret);
   });
});
