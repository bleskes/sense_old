(function () {

  var global = window;

  function editorAutocompleteCommand(editor) {
    var context = getAutoCompleteContext(editor);
    if (!context) return; // nothing to do

    var session = editor.getSession();
    var ac_input = $('<input id="autocomplete" type="text"  />').appendTo($("#main"));
    ac_input.val(context.initialValue);
    var screen_pos = editor.renderer.textToScreenCoordinates(context.textBoxPosition.row,
        context.textBoxPosition.column);

    ac_input.css("left", screen_pos.pageX);
    ac_input.css("top", screen_pos.pageY);

    ac_input.css('visibility', 'visible');

    function accept(term) {
      if (context.rangeToReplace.start.column != context.rangeToReplace.end.column)
        session.replace(context.rangeToReplace, context.prefixToAdd + '"' + term + '"' + context.suffixToAdd);
      else
        editor.insert(context.prefixToAdd + '"' + term + '"' + context.suffixToAdd);
      ac_input.remove();
      editor.focus();
    }

    ac_input.autocomplete({
      minLength: 0,
      source: context.autoCompleteSet,
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

  function getAutoCompleteContext(editor) {
    // deduces all the parameters need to position and insert the auto complete
    var context = {
      currentToken: null,
      prefixToAdd: "",
      suffixToAdd: "",
      addTemplate: false,
      initialValue: "",
      textBoxPosition: null, // ace position to place the left side of the input box
      rangeToReplace: null, // ace range to replace with the auto complete
      autoCompleteSet: [] // a set of options to choose
    };

    context.autoCompleteSet = getActiveAutoCompleteSet(editor);
    if (!context.autoCompleteSet) return null; // nothing to do..


    var pos = editor.getCursorPosition();
    var session = editor.getSession();
    context.currentToken = session.getTokenAt(pos.row, pos.column);

    // extract the initial value, rangeToReplace & textBoxPosition

    // Scenarios for current token:
    //   -  Nice token { "bla|"
    //   -  Broken text token {   bla|
    //   -  No token : { |
    //   - Broken scenario { , bla|
    //   - Nice token, broken before: {, "bla"


    var val = context.currentToken.value;

    var paddingLeftIndexToken = val.match(/[\s,:{\[]*/)[0].length;
    var paddingRightIndexToken = val.substr(paddingLeftIndexToken).match(/[\s,:}\]]*$/)[0].length;
    context.initialValue = val.replace(/(^[\s,:{\["']+)|(['s,:}\]"']+$)/g, '');
    context.rangeToReplace = new (ace.require("ace/range").Range)(
        pos.row, context.currentToken.start + paddingLeftIndexToken, pos.row,
        context.currentToken.start + val.length - paddingRightIndexToken
    );


    if (context.initialValue)
      context.textBoxPosition = { row: context.rangeToReplace.start.row, column: context.rangeToReplace.start.column};
    else
      context.textBoxPosition = editor.getCursorPosition();

    // Figure out what happens next to the token to see whether it needs trailing commas etc.

    if (!context.initialValue) {
      // if we are replacing something that's already there, we don't worry about commas
      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      var nonEmptyToken = tokenIter.getCurrentToken();
      while (nonEmptyToken && nonEmptyToken.type == "text" && nonEmptyToken.value.match(/^[\s]*$/))
        nonEmptyToken = tokenIter.stepBackward();

      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.lparen":
        case "paren.rparen":
          break;
        case "text":
          if (!nonEmptyToken.value.match(/^\s*[:,]\s*$/))
            context.prefixToAdd = ", ";
          break;
        default:
          context.prefixToAdd = ", "
      }


      // suffix
      tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      nonEmptyToken = tokenIter.stepForward();
      while (nonEmptyToken && nonEmptyToken.type == "text" && nonEmptyToken.value.match(/^[\s]*$/))
        nonEmptyToken = tokenIter.stepForward();

      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.rparen":
        case "paren.lparen":
          break;
        case "text":
          if (!nonEmptyToken.value.match(/^\s*[:,]\s*$/))
            context.suffixToAdd = ", ";
          break;
        default:
          context.suffixToAdd = ","
      }


    }

    return context;

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
