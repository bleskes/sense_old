(function () {

   var global = window;
   if (!global.sense)
      global.sense = {};

   var ns = {};
   global.sense.utils = ns;

   var sense = global.sense;

   ns.iterForCurrentLoc = function (editor) {
      editor = editor || sense.editor;
      var pos = editor.getCursorPosition();
      return new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
   };

   ns.isEmptyToken = function (token) {
      return token && token.type == "whitespace"
   };

   ns.isUrlOrMethodToken = function (token) {
      return token && token.type && (token.type == "method" || token.type.indexOf("url") == 0);
   };


   ns.nextNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepForward();
      while (t && ns.isEmptyToken(t)) t = tokenIter.stepForward();
      return t;
   };

   ns.prevNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepBackward();
      // empty rows return null token.
      while ((t || tokenIter.currentTokenRow() > 0) && ns.isEmptyToken(t)) t = tokenIter.stepBackward();
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
      var tokenIter = ns.iterForCurrentLoc(editor);
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
         url: null
      };

      var editor = sense.editor;
      var tokenIter = ns.iterForCurrentLoc(editor);
      var t = ns.prevRequestStart(tokenIter);
      if (!t) return null;
      request.method = t.value;
      t = ns.nextNonEmptyToken(tokenIter);
      if (!t || t.type == "method") return null;
      request.url = "";
      while (t && t.type && t.type.indexOf("url") == 0) {
         request.url += t.value;
         t = tokenIter.stepForward();
      }

      t = tokenIter.stepBackward(); // back to url for easier body calculations

      var bodyStartRow = tokenIter.getCurrentTokenRow();
      var bodyStartColumn = tokenIter.getCurrentTokenColumn() + t.value.length;
      var reqEndToken = ns.nextRequestEnd(tokenIter);
      var bodyRange = new (ace.require("ace/range").Range)(
         bodyStartRow, bodyStartColumn, tokenIter.getCurrentTokenRow(),
         tokenIter.getCurrentTokenColumn() + reqEndToken.value.length
      );
      request.data = editor.getSession().getTextRange(bodyRange);
      request.data = request.data.trim();
      return request;
   };

   ns.textFromRequest = function (request) {
      return request.method + " " + request.url + "\n" + request.data;
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