(function () {

  var global = window;

  function editorAutocompleteCommand(editor) {
    var autoCompleteSet = getActiveAutoCompleteSet(editor);
    if (!autoCompleteSet) return; // nothing to do..


    // Scenarios
    //   -  Nice token { "bla|"
    //   -  Broken text token {   bla|
    //   -  No token : { |
    //   - Broken scenario { , bla|
    //   - Nice token, broken before: {, "bla"

    var pos = editor.getCursorPosition();
    var session = editor.getSession();
    var currentToken = session.getTokenAt(pos.row, pos.column);


    var paddingLeftIndexToken = currentToken.value.match(/[\s,:{\[]*/)[0].length;
    var paddingRightIndexToken = currentToken.value.substr(paddingLeftIndexToken).match(/[\s,:}\]]*$/)[0].length;
    var trimmedToken = currentToken.value.replace(/(^[\s,:{\["']+)|(['s,:}\]"']+$)/g, '');
    var tokenRange = new (ace.require("ace/range").Range)(pos.row, currentToken.start + paddingLeftIndexToken, pos.row,
        currentToken.start +
            currentToken.value.length - paddingRightIndexToken);

    var highlightPos;
    var ac_input = $('<input id="autocomplete" type="text"  />').appendTo($("#main"));
    if (trimmedToken) {// real string
      ac_input.val(trimmedToken);
      highlightPos = { row: pos.row, column: tokenRange.start.column};
    }
    else {
      highlightPos = editor.getCursorPosition();
      ac_input.val();
    }

    var screen_pos = editor.renderer.textToScreenCoordinates(highlightPos.row, highlightPos.column);

    ac_input.css("left", screen_pos.pageX);
    ac_input.css("top", screen_pos.pageY);

    ac_input.css('visibility', 'visible');

    function accept(term) {
      if (tokenRange.start.column != tokenRange.end.column)
        session.replace(tokenRange, '"' + term + '"');
      else
        editor.insert('"' + term + '"');
      ac_input.remove();
      editor.focus();
    }

    ac_input.autocomplete({
      minLength: 0,
      source: autoCompleteSet,
      select: function (e, data) {
        accept(data.item.value);
      }
    });

    ac_input.keypress(function (e) {
      if (e.which == 13) {
        accept($(this).val());
        this.blur();
      }
    });

    ac_input.blur(function () {
      ac_input.css('visibility', 'hidden');
      ac_input.remove()
    });
    ac_input.show().focus().autocomplete("search", ac_input.val());

  }


  function getActiveAutoCompleteSet(editor) {

    function extractOptionsForPath(rules, tokenPath) {
      tokenPath = $.merge([], tokenPath);
      if (!rules)
        return [];
      var t;
      while (tokenPath.length && rules) {
        t = tokenPath.pop();
        rules = rules[t] || rules["*"];
      }
      var ret = [];
      if (!tokenPath.length && rules) {
        for (t in rules) {
          ret.push(t);
        }
      }
      return ret;
    }

    var tokenPath = getCurrentTokenPath(editor);
    var pathAsString = tokenPath.join(",");
    var ret = [];
    $.merge(ret, extractOptionsForPath((global.sense.active_scheme || {}).autocomplete_rules, tokenPath));

    for (var i = tokenPath.length - 1; i >= 0; i--) {
      var subPath = tokenPath.splice(i);
      $.merge(ret, extractOptionsForPath(GLOBAL_AUTOCOMPLETE_RULES, subPath));

    }

    console.log("Resolved token path " + pathAsString + " to " + ret);
    return ret;
  }


  function getCurrentTokenPath(editor) {
    var pos = editor.getCursorPosition();
    var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
    var ret = [], last_var = "", seen_opening_paren = false;
    for (var t = tokenIter.getCurrentToken(); t; t = tokenIter.stepBackward()) {
      switch (t.type) {
        case "paren.lparen":
          if (!seen_opening_paren) {
            // bottom of the chain, last var is not part of path.
            seen_opening_paren = true;
          }
          else
            ret.push(last_var);

          last_var = "";
          break;
        case "paren.rparen":
          var parenCount = 1;
          for (t = tokenIter.stepBackward(); t && parenCount > 0; t = tokenIter.stepBackward()) {
            switch (t.type) {
              case "paren.lparen":
                parenCount--;
                break;
              case "paren.rparen":
                parenCount++;
                break;
            }
          }
          if (!t) // oops we run out.. we don't what's up return null;
            return null;
          break;
        case "string":
        case "constant.numeric" :
        case "variable":
          if (!last_var) {
            last_var = t.value.trim().replace(/"/g, '');
          }
          break;
      }
    }
    return ret;
  }

  function updateActiveScheme(endpoint) {
    for (var scheme_endpoint in ES_SCHEME_BY_ENDPOINT) {
      if (endpoint.indexOf(scheme_endpoint) == 0) {
        endpoint = scheme_endpoint;
        break;
      }
    }

    sense.active_scheme = ES_SCHEME_BY_ENDPOINT[endpoint];

  }

  function init() {
    // initialize auto complete on server
    var es_server = $("#es_server");

    es_server.autocomplete({
      minLength: 0,
      source: []
    });

    es_server.focus(function () {
      es_server.autocomplete("option", "source", sense.history.getHistoricalServers());
    });

    // initialize endpoint auto complete
    var paths = [];
    for (var endpoint in ES_SCHEME_BY_ENDPOINT) {
      paths.push(endpoint);
    }
    paths.sort();

    var es_endpoint = $("#es_endpoint");
    es_endpoint.autocomplete({ minLength: 0, source: paths });

    es_endpoint.change(function () {
      updateActiveScheme(es_endpoint.val());
    });

    es_endpoint.change(); // initialize active scheme

  }

  global.sense.autocomplete = {};
  global.sense.autocomplete.editorAutocompleteCommand = editorAutocompleteCommand;
  global.sense.autocomplete.init = init;

})();
