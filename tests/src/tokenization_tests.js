var global = window;

function callWhenEditorIsUpdated(callback) {
   function f() {
      if (global.sense.tests.editor.$highlightPending) {
         setTimeout(f, 150);
      }
      else
         callback();
   }

   f();
}

module("Tokenization", {
   setup: function () {
      if (!global.sense)
         global.sense = {};
      var sense = global.sense;

      sense.tests = {};
      sense.tests.editor_div = $('<div id="editor"></div>').appendTo($('body'));
      sense.tests.editor = ace.edit("editor");
      ace.require("ace/mode/sense");
      sense.tests.editor.getSession().setMode("ace/mode/sense");
      sense.tests.editor.getSession().setValue("hello");

   },

   teardown: function () {
      sense.tests.editor_div.remove();
      sense.tests = {};
   }
});

var utils = sense.utils;

function tokensAsList(editor) {
   var iter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), 0, 0);
   var ret = [];
   var t = iter.getCurrentToken();
   if (utils.isEmptyToken(t)) t = utils.nextNonEmptyToken(iter);
   while (t) {
      ret.push({ value: t.value, type: t.type });
      t = utils.nextNonEmptyToken(iter);
   }

   return ret;
}

var testCount = 0;

function token_test(token_list, prefix, data) {
   if (data && typeof data != "string") data = JSON.stringify(data, null, 3);
   if (data) {
      if (prefix) data = prefix + "\n" + data;
   } else {
      data = prefix;
   }

   QUnit.asyncTest("Token test " + testCount++ + " prefix: " + prefix, function () {
      var editor = global.sense.tests.editor;

      editor.getSession().setValue(data);


      callWhenEditorIsUpdated(function () {
         var tokens = tokensAsList(editor);
         var normTokenList = [];
         for (var i = 0; i < token_list.length; i++) {
            normTokenList.push({ type: token_list[i++], value: token_list[i] });
         }

         deepEqual(tokens, normTokenList, "Doc:\n" + data);
         start();
      });

   });
}

token_test(
   [ "method", "GET", "url.endpoint", "_search" ],
   "GET _search"
);

token_test(
   [ "method", "GET", "url.slash", "/", "url.endpoint", "_search" ],
   "GET /_search"
);

token_test(
   [ "method", "GET", "url.index", "index", "url.slash", "/", "url.endpoint", "_search" ],
   "GET index/_search"
);

token_test(
   [ "method", "GET", "url.index", "index" ],
   "GET index"
);

token_test(
   [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type" ],
   "GET index/type"
);

token_test(
   [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/", "url.endpoint", "_search" ],
   "GET index/type/_search"
);

token_test(
   [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/", "url.endpoint", "_search",
      "url.questionmark", "?", "url.param", "value", "url.equal", "=", "url.value", "1"
   ],
   "GET index/type/_search?value=1"
);


token_test(
   [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/", "url.id", "1" ],
   "GET index/type/1"
);


token_test(
   [ "method", "GET", "url.slash", "/", "url.index", "index1", "url.comma", ",", "url.index", "index2", "url.slash", "/" ],
   "GET /index1,index2/"
);

token_test(
   [ "method", "GET", "url.index", "index1", "url.comma", ",", "url.index", "index2" ],
   "GET index1,index2"
);

token_test(
   [ "method", "POST", "url.endpoint", "_search", "paren.lparen", "{", "variable", '"q"', "punctuation.colon", ":",
      "paren.lparen", "{", "paren.rparen", "}", "paren.rparen", "}",
   ],
   'POST _search\n' +
      '{\n' +
      '   "q": {}\n' +
      '   \n' +
      '}'
);

