(function () {

   var global = window;
   if (!global.sense)
      global.sense = {};

   var ns = {};
   global.sense.utils = ns;

   var sense = global.sense;

   ROW_PARSE_MODE = {
      REQUEST_START: 2,
      IN_REQUEST: 4,
      REQUEST_END: 8,
      BETWEEN_REQUESTS: 16
   };

   getRowParseMode = function (row, editor) {
      editor = editor || sense.editor;
      if (typeof row == "undefined") row = editor.getCursorPosition().row;

      var session = editor.getSession();
      if (row >= session.getLength()) return ROW_PARSE_MODE.BETWEEN_REQUESTS;
      var mode = (session.getState(row) || {}).name;
      if (!mode)
         return ROW_PARSE_MODE.BETWEEN_REQUESTS; // shouldn't really happen
      if (mode != "start") return ROW_PARSE_MODE.IN_REQUEST;
      var line = (session.getLine(row) || "").trim();
      if (!line) return ROW_PARSE_MODE.BETWEEN_REQUESTS; // empty line waiting for a new req to start

      if (line.indexOf("}", line.length - 1) >= 0) return ROW_PARSE_MODE.REQUEST_END; // end of request

      // check for single line requests
      row++;
      if (row >= session.getLength() || (session.getState(row) || {}).name == "start") // we had a single line request
      {
         return ROW_PARSE_MODE.REQUEST_START + ROW_PARSE_MODE.REQUEST_END;
      }

      return ROW_PARSE_MODE.REQUEST_START;
   };


   ns.isEndRequestRow = function (row, editor) {
      var mode = getRowParseMode(row, editor);
      return (mode & ROW_PARSE_MODE.REQUEST_END) > 0;

   };

   ns.isRequestEdge = function (row, editor) {
      var mode = getRowParseMode(row, editor);
      return (mode & (ROW_PARSE_MODE.REQUEST_END | ROW_PARSE_MODE.REQUEST_START)) > 0;

   };


   ns.isStartRequestRow = function (row, editor) {
      var mode = getRowParseMode(row, editor);
      return (mode & ROW_PARSE_MODE.REQUEST_START) > 0;
   };

   ns.isInBetweenRequestsRow = function (row, editor) {
      var mode = getRowParseMode(row, editor);
      return (mode & ROW_PARSE_MODE.BETWEEN_REQUESTS) > 0;
   };

   ns.isInRequestsRow = function (row, editor) {
      var mode = getRowParseMode(row, editor);
      return (mode & ROW_PARSE_MODE.IN_REQUEST) > 0;
   };


   ns.iterForCurrentLoc = function (editor) {
      editor = editor || sense.editor;
      var pos = editor.getCursorPosition();
      return ns.iterForPosition(pos.row, pos.column, editor);
   };

   ns.iterForPosition = function (row, column, editor) {
      editor = editor || sense.editor;
      return new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), row, column);
   };

   ns.isEmptyToken = function (tokenOrTokenIter) {
      var token = tokenOrTokenIter && tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
      return !token || token.type == "whitespace"
   };

   ns.isUrlOrMethodToken = function (tokenOrTokenIter) {
      var t = tokenOrTokenIter.getCurrentToken ? tokenOrTokenIter.getCurrentToken() : tokenOrTokenIter;
      return t && t.type && (t.type == "method" || t.type.indexOf("url") == 0);
   };


   ns.nextNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepForward();
      while (t && ns.isEmptyToken(t)) t = tokenIter.stepForward();
      return t;
   };

   ns.prevNonEmptyToken = function (tokenIter) {
      var t = tokenIter.stepBackward();
      // empty rows return null token.
      while ((t || tokenIter.getCurrentTokenRow() > 0) && ns.isEmptyToken(t)) t = tokenIter.stepBackward();
      return t;
   };

   ns.prevRequestStart = function (pos, editor) {
      editor = editor || sense.editor;
      pos = pos || editor.getCursorPosition();
      var curRow = pos.row;
      while (curRow > 0 && !ns.isStartRequestRow(curRow, editor)) curRow--;

      return { row: curRow, column: 0};
   };

   ns.nextRequestEnd = function (pos, editor) {
      editor = editor || sense.editor;
      pos = pos || editor.getCursorPosition();
      var session = editor.getSession();
      var curRow = pos.row;
      var maxLines = session.getLength();
      for (; curRow < maxLines - 1; curRow++) {
         var curRowMode = getRowParseMode(curRow, editor);
         if ((curRowMode & ROW_PARSE_MODE.REQUEST_END) > 0) break;
         if (curRow != pos.row && (curRowMode & ROW_PARSE_MODE.REQUEST_START) > 0) break;
      }

      var column = (session.getLine(curRow) || "").length;

      return { row: curRow, column: column};
   };


   ns.getCurrentRequestRange = function () {
      if (ns.isInBetweenRequestsRow()) return null;

      var reqStart = ns.prevRequestStart();
      var reqEnd = ns.nextRequestEnd(reqStart);
      return new (ace.require("ace/range").Range)(
         reqStart.row, reqStart.column,
         reqEnd.row, reqStart.column
      );
   };

   ns.getCurrentRequest = function () {

      if (ns.isInBetweenRequestsRow()) return null;

      var request = {
         method: "",
         data: null,
         url: null
      };

      var editor = sense.editor;
      var pos = ns.prevRequestStart(editor.getCursorPosition(), editor);
      var tokenIter = ns.iterForPosition(pos.row, pos.column, editor);
      var t = tokenIter.getCurrentToken();
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
      var reqEndPos = ns.nextRequestEnd({ row: bodyStartRow, column: bodyStartColumn}, editor);
      var bodyRange = new (ace.require("ace/range").Range)(
         bodyStartRow, bodyStartColumn,
         reqEndPos.row, reqEndPos.column
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