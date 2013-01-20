(function () {

  var global = window;
  if (!global.sense)
    global.sense = {};

  var ACTIVE_SCHEME = null;

  function isEmptyToken(token) {
    return token && token.type == "whitespace"
  }

  function nextNonEmptyToken(tokenIter) {
    var t = tokenIter.stepForward();
    while (t && isEmptyToken(t)) t = tokenIter.stepForward();
    return t;
  }

  function prevNonEmptyToken(tokenIter) {
    var t = tokenIter.stepBackward();
    while (t && isEmptyToken(t)) t = tokenIter.stepBackward();
    return t;
  }


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

      var valueToInsert = '"' + term + '"';
      if (context.addTemplate && context.autoCompleteSet.templateByTerm[term]) {
        var indentedTemplateLines = JSON.stringify(context.autoCompleteSet.templateByTerm[term], null, 3).split("\n");
        var currentIndentation = session.getLine(context.rangeToReplace.start.row);
        currentIndentation = currentIndentation.match(/^\s*/)[0];
        for (var i = 1; i < indentedTemplateLines.length; i++) // skip first line
          indentedTemplateLines[i] = currentIndentation + indentedTemplateLines[i];

        valueToInsert += ": " + indentedTemplateLines.join("\n");
      }

      valueToInsert = context.prefixToAdd + valueToInsert + context.suffixToAdd;


      if (context.rangeToReplace.start.column != context.rangeToReplace.end.column)
        session.replace(context.rangeToReplace, valueToInsert);
      else
        editor.insert(valueToInsert);

      editor.clearSelection(); // for some reason the above changes selection
      editor.moveCursorTo(context.rangeToReplace.start.row,
          context.rangeToReplace.start.column +
              term.length + 2 + // qoutes
              context.prefixToAdd.length
      );

      ac_input.remove();
      editor.focus();
    }

    ac_input.autocomplete({
      minLength: 0,
      source: context.autoCompleteSet.completionTerms,
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
      autoCompleteSet: null // instructions for what can be here
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

    var insertingRelativeToToken = 0; // -1 is before token, 0 middle, +1 after token

    switch (context.currentToken.type) {
      case "variable":
      case "string":
      case "text":
        insertingRelativeToToken = 0;
        context.initialValue = context.currentToken.value.replace(/"/g, '');
        context.rangeToReplace = new (ace.require("ace/range").Range)(
            pos.row, context.currentToken.start, pos.row,
            context.currentToken.start + context.currentToken.value.length
        );
        break;
      default:
        // standing on white space, quotes or another punctuation - no replacing
        context.initialValue = "";
        context.rangeToReplace = new (ace.require("ace/range").Range)(
            pos.row, pos.column, pos.row, pos.column
        );
        if (pos.column == context.currentToken.start)
          insertingRelativeToToken = -1;
        else if (pos.column < context.currentToken.start + context.currentToken.value.length)
          insertingRelativeToToken = 0;
        else
          insertingRelativeToToken = 1;
    }

    context.textBoxPosition = { row: context.rangeToReplace.start.row, column: context.rangeToReplace.start.column};

    // Figure out what happens next to the token to see whether it needs trailing commas etc.

    if (context.initialValue) {
      // replacing an existing value -> prefix and suffix are turned off.
      // Templates will be used if not destroying existing structure.
      // -> token : {} or token ]/} or token , but not token : SOMETHING ELSE

      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      var nonEmptyToken = nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.lparen":
        case "paren.rparen":
        case "punctuation.comma":
          context.addTemplate = true;
          break;
        case "punctuation.colon":
          // test if there is an empty object - if so we replace it
          nonEmptyToken = nextNonEmptyToken(tokenIter);
          if (!(nonEmptyToken && nonEmptyToken.value == "{")) break;
          nonEmptyToken = nextNonEmptyToken(tokenIter);
          if (!(nonEmptyToken && nonEmptyToken.value == "}")) break;
          context.addTemplate = true;
          // extend range to replace to include all up to token
          context.rangeToReplace.end.row = tokenIter.getCurrentTokenRow();
          context.rangeToReplace.end.column = tokenIter.getCurrentTokenColumn() + nonEmptyToken.value.length;

          // move one more time to check if we need a trailing comma
          nonEmptyToken = nextNonEmptyToken(tokenIter);
          if (nonEmptyToken && nonEmptyToken.type == "variable")
            context.suffixToAdd = ", ";

          break;
        case "text" :
        case "string" :
        case "variable":
          context.addTemplate = true;
          context.suffixToAdd = ", ";
          break;
        default:
          break; // for now play safe and do nothing. May be made smarter.
      }

    }
    else {
      // we start from scratch -> templates on
      context.addTemplate = true;

      // if we are replacing something that's already there, we don't worry about commas
      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      var nonEmptyToken = tokenIter.getCurrentToken();
      if (isEmptyToken(nonEmptyToken) || insertingRelativeToToken <= 0) // we should actually look at what's happening after this token
        nonEmptyToken = prevNonEmptyToken(tokenIter);


      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.lparen":
        case "punctuation.comma":
        case "punctuation.colon":
          break;
        default:
          context.prefixToAdd = ", "
      }


      // suffix
      tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      nonEmptyToken = tokenIter.getCurrentToken();
      if (isEmptyToken(nonEmptyToken) || insertingRelativeToToken > 0) // we should actually look at what's happening after this token
        nonEmptyToken = nextNonEmptyToken(tokenIter);

      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.rparen":
        case "paren.lparen":
        case "punctuation.comma":
        case "punctuation.colon":
          break;
          break;
        default:
          context.suffixToAdd = ","
      }


    }

    return context;

  }

  function getActiveAutoCompleteSet(editor) {

    var autocompleteSet = { templateByTerm: {}, completionTerms: [] };

    function extractOptionsForPath(rules, tokenPath) {
      // extracts the relevant parts of rules for tokenPath
      tokenPath = $.merge([], tokenPath);
      if (!rules)
        return;
      var t;
      // find the right rule set for current path
      while (tokenPath.length && rules) {
        t = tokenPath.shift();
        rules = rules[t] || rules["*"];
      }

      // apply rule set
      if (!tokenPath.length && rules) {
        for (t in rules) {
          var term = rules instanceof Array ? rules[t] : t;
          autocompleteSet.completionTerms.push(term);
          if (typeof rules[t].__template != "undefined")
            autocompleteSet.templateByTerm[term] = rules[t].__template;
          else if (typeof rules[t] == "object") {
            autocompleteSet.templateByTerm[term] = rules[t] instanceof Array ? [] : {};
          }
          else if (!rules instanceof Array) { // a list doesn't contain elements with examples
            autocompleteSet.templateByTerm[term] = rules[t];
          }
        }
      }
    }

    var tokenPath = getCurrentTokenPath(editor);
    // apply global rules first, as they are of lower priority.
    for (var i = tokenPath.length - 1; i >= 0; i--) {
      var subPath = tokenPath.slice(i);
      extractOptionsForPath(sense.kb.getGlobalAutocompleteRules(), subPath);
    }
    var pathAsString = tokenPath.join(",");
    extractOptionsForPath((ACTIVE_SCHEME || {}).data_autocomplete_rules, tokenPath);


    console.log("Resolved token path " + pathAsString + " to " + autocompleteSet.completionTerms);
    return  autocompleteSet.completionTerms ? autocompleteSet : null;
  }


  function getCurrentTokenPath(editor) {
    var pos = editor.getCursorPosition();
    var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
    var ret = [], last_var = "", seen_opening_paren = false;
    if (pos.column == 0) {
      // if we are at the beginning of the line, the current token is the one after cursor, not before.
      tokenIter.stepBackward();
    }
    for (var t = tokenIter.getCurrentToken(); t; t = tokenIter.stepBackward()) {
      switch (t.type) {
        case "paren.lparen":
          if (!seen_opening_paren) {
            // bottom of the chain, last var is not part of path.
            seen_opening_paren = true;
          }
          else
            ret.unshift(last_var);

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

  function getActiveScheme() {
    return ACTIVE_SCHEME;
  }

  function setActiveScheme(scheme) {
    ACTIVE_SCHEME = scheme;
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

    var es_endpoint = $("#es_endpoint");
    es_endpoint.autocomplete({ minLength: 0, source: sense.kb.getEndpointAutocomplete() });

    es_endpoint.change(function () {
      setActiveScheme(sense.kb.getEndpointDescription(es_endpoint.val()));
      if (ACTIVE_SCHEME.method) {
        $("#es_method").val(ACTIVE_SCHEME.method);
      }
    });

    es_endpoint.change(); // initialize.

  }

  global.sense.autocomplete = {};
  global.sense.autocomplete.editorAutocompleteCommand = editorAutocompleteCommand;
  global.sense.autocomplete.init = init;
  global.sense.autocomplete.getAutoCompleteContext = getAutoCompleteContext;
  global.sense.autocomplete.setActiveScheme = setActiveScheme;

})();
