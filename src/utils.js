(function () {

   var global = window;
   if (!global.sense)
      global.sense = {};

   var ns = {};
   global.sense.utils = ns;

   var sense = global.sense;

   ns.isEmptyToken = function (token) {
      return token && token.type == "whitespace"
   };

   ns.nextNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepForward();
      while (t && ns.isEmptyToken(t)) t = tokenIter.stepForward();
      return t;
   };

   ns.prevNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepBackward();
      while (t && ns.isEmptyToken(t)) t = tokenIter.stepBackward();
      return t;
   };

   ns.prevRequestStart = function (tokenIter) {
      var t = tokenIter.getCurrentToken();
      if (!t) t = ns.prevNonEmptyToken(tokenIter); // deal with empty lines
      while (t && t.type != 'method') t = tokenIter.stepBackward();
      return t;
   };

   ns.nextRequestEnd = function (tokenIter) {
      var t = tokenIter.stepForward();
      while (t && t.type != 'method') t = tokenIter.stepForward();
      t = tokenIter.stepBackward(); // back one.
      if (ns.isEmptyToken(t))
         return ns.prevNonEmptyToken(tokenIter);
      return t;
   };


   ns.getCurrentRequestRange = function () {
      var editor = sense.editor;
      var pos = editor.getCursorPosition();
      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      var reqStartToken = ns.prevRequestStart(tokenIter);
      if (!reqStartToken) return null;
      var reqStartRow = tokenIter.getCurrentTokenRow();
      var reqStartColumn = tokenIter.getCurrentTokenColumn();
      var reqEndToken = ns.nextRequestEnd(tokenIter);
      return new (ace.require("ace/range").Range)(
         reqStartRow, reqStartColumn, tokenIter.getCurrentTokenRow(),
         tokenIter.getCurrentTokenColumn() + reqEndToken.value.length
      );
   };

   ns.getCurrentRequest = function () {
      var request = {
         method: "",
         data: null,
         endpoint: null
      };

      var editor = sense.editor;
      var pos = editor.getCursorPosition();
      var session = editor.getSession();

      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(session, pos.row, pos.column);
      var t = ns.prevRequestStart(tokenIter);
      if (!t) return null;
      request.method = t.value;
      t = ns.nextNonEmptyToken(tokenIter);
      if (!t) return null;
      request.endpoint = t.value;
      var bodyStartRow = tokenIter.getCurrentTokenRow();
      var bodyStartColumn = tokenIter.getCurrentTokenColumn() + t.value.length;
      var reqEndToken = ns.nextRequestEnd(tokenIter);
      var bodyRange = new (ace.require("ace/range").Range)(
         bodyStartRow, bodyStartColumn, tokenIter.getCurrentTokenRow(),
         tokenIter.getCurrentTokenColumn() + reqEndToken.value.length
      );
      request.data = session.getTextRange(bodyRange);
      request.data = request.data.trim();
      return request;
   };

   ns.textFromRequest = function (request) {
      return request.method + " " + request.endpoint + "\n" + request.data;
   };

   ns.replaceCurrentRequest = function (newRequest, curRequestRange) {
      if (!curRequestRange)  curRequestRange = ns.getCurrentRequestRange();
      var text = ns.textFromRequest(newRequest);
      if (curRequestRange) {
         sense.editor.getSession().replace(curRequestRange, text);
      }
      else {
         // just insert where we are
         sense.editor.insert(text);
      }
   }


})();