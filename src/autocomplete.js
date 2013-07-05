(function () {

   var global = window;
   if (!global.sense)
      global.sense = {};

   var ACTIVE_SCHEME = null;
   var MODE_INACTIVE = 0, MODE_VISIBLE = 1, MODE_APPLYING_TERM = 2, MODE_FORCED_CLOSE = 3;
   var MODE = MODE_INACTIVE;
   var ACTIVE_MENU = null;
   var ACTIVE_CONTEXT = null;
   var ACTIVE_INDICES = [];
   var ACTIVE_TYPES = [];
   var ACTIVE_DOC_ID = null;
   var LAST_EVALUATED_TOKEN = null;

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

   function getAutoCompleteValueFromToken(token) {
      switch (token.type) {
         case "variable":
         case "string":
         case "text":
         case "constant.numeric":
         case "constant.language.boolean":
            return token.value.replace(/"/g, '');
            context.replacingToken = true;
            break;
         default:
            // standing on white space, quotes or another punctuation - no replacing
            return "";
      }
   }

   var visibleMenuAceCMDS = [
      {
         name: "golinedown",
         exec: function (editor) {
            ACTIVE_MENU.focus();
         },
         bindKey: "Down"
      },
      {
         name: "select_autocomplete",
         exec: function (editor) {
            ACTIVE_MENU.menu("focus", null, ACTIVE_MENU.find(".ui-menu-item:first"));
            ACTIVE_MENU.menu("select");
            return true;
         },
         bindKey: "Enter"
      },
      {
         name: "singleSelection",
         exec: function (editor) {
            hideAutoComplete(editor);
            MODE = MODE_FORCED_CLOSE;
            return true;
         },
         bindKey: "Esc"
      }
   ];

   var _cached_cmds_to_restore = [];


   function hideAutoComplete(editor) {
      if (MODE != MODE_VISIBLE) return;
      editor = editor || sense.editor;
      editor.commands.removeCommands(visibleMenuAceCMDS);
      editor.commands.addCommands(_cached_cmds_to_restore);
      ACTIVE_MENU.css("left", "-1000px");
      MODE = MODE_INACTIVE;

   }

   function updateAutoComplete(editor, hideIfSingleItemAndEqualToTerm) {

      editor = editor || sense.editor;
      var pos = editor.getCursorPosition();
      var token = editor.getSession().getTokenAt(pos.row, pos.column);
      var term = getAutoCompleteValueFromToken(token);
      console.log("Updating autocomplete for " + term);
      ACTIVE_CONTEXT.updatedForToken = token;

      var term_filter = new RegExp(term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      var possible_terms = ACTIVE_CONTEXT.autoCompleteSet.completionTerms;
      ACTIVE_MENU.children().remove();
      var menuCount = 0, lastTerm = null;
      for (var i = 0; i < possible_terms.length; i++) {
         if ((possible_terms[i] + "").match(term_filter)) {
            menuCount++;
            lastTerm = possible_terms[i];
            $('<li></li>').appendTo(ACTIVE_MENU)
               .append($('<a tabindex="-1" href="#"></a>').text(possible_terms[i])).data("term_id", i);
         }

      }

      if (hideIfSingleItemAndEqualToTerm && lastTerm == term) menuCount--;

      ACTIVE_MENU.menu("refresh");
      if (menuCount > 0) {
         return true;
      } else {
         hideAutoComplete();
         return false;
      }


   }

   function showAutoComplete(editor, force) {
      hideAutoComplete();

      editor = editor || sense.editor;

      var context = getAutoCompleteContext(editor);
      ACTIVE_CONTEXT = context;
      if (!context) return; // nothing to do

      var screen_pos = editor.renderer.textToScreenCoordinates(context.textBoxPosition.row,
         context.textBoxPosition.column);

      ACTIVE_MENU.css('visibility', 'visible');
      _cached_cmds_to_restore = $.map(visibleMenuAceCMDS, function (cmd) {
         return  editor.commands.commands[cmd.name];
      });


      editor.commands.addCommands(visibleMenuAceCMDS);


      MODE = MODE_VISIBLE;

      if (!updateAutoComplete(editor, !force)) return; // update has hid the menu

      ACTIVE_MENU.css("left", screen_pos.pageX);
      ACTIVE_MENU.css("top", screen_pos.pageY);

   }

   function applyTerm(term, editor) {
      editor = editor || sense.editor;
      session = editor.getSession();

      context = ACTIVE_CONTEXT;

      hideAutoComplete(editor);

      MODE = MODE_APPLYING_TERM;

      // make sure we get up to date replacement info.
      addReplacementInfoToContext(context, editor);

      var termAsString = typeof term == "string" ? '"' + term + '"' : term + "";
      var valueToInsert = termAsString;

      if (context.addTemplate && typeof context.autoCompleteSet.templateByTerm[term] != "undefined") {
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

      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      var newPos = {
         row: context.rangeToReplace.start.row,
         column: context.rangeToReplace.start.column + termAsString.length + context.prefixToAdd.length
      };

      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(),
         newPos.row, newPos.column);

      // look for the next place stand, just after a comma, {
      var nonEmptyToken = nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
         case "paren.rparen":
            newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
            break;
         case "punctuation.colon":
            nonEmptyToken = nextNonEmptyToken(tokenIter);
            if ((nonEmptyToken || {}).type == "paren.lparen") {
               nonEmptyToken = nextNonEmptyToken(tokenIter);
               newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
               if (nonEmptyToken && nonEmptyToken.value.indexOf('"') == 0) newPos.column++; // don't stand on "
            }
            break;
         case "paren.lparen":
         case "punctuation.comma":
            tokenIter.stepForward();
            newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
            break;
      }


      editor.moveCursorToPosition(newPos);


      MODE = MODE_INACTIVE;

      editor.focus();
   }

   function getAutoCompleteContext(editor) {
      // deduces all the parameters need to position and insert the auto complete
      var context = {
         updatedForToken: null,
         prefixToAdd: "",
         suffixToAdd: "",
         addTemplate: false,
         textBoxPosition: null, // ace position to place the left side of the input box
         rangeToReplace: null, // ace range to replace with the auto complete
         autoCompleteSet: null, // instructions for what can be here
         replacingToken: false
      };

      var pos = editor.getCursorPosition();
      var session = editor.getSession();
      context.updatedForToken = session.getTokenAt(pos.row, pos.column);

      if (!context.updatedForToken) return null; // editor has issues..

      context.updatedForToken.row = pos.row; // extend

      context.autoCompleteSet = getActiveAutoCompleteSet(editor);
      if (!context.autoCompleteSet) return null; // nothing to do..

      return addReplacementInfoToContext(context, editor);

   }

   function addReplacementInfoToContext(context, editor) {
      // extract the initial value, rangeToReplace & textBoxPosition

      // Scenarios for current token:
      //   -  Nice token { "bla|"
      //   -  Broken text token {   bla|
      //   -  No token : { |
      //   - Broken scenario { , bla|
      //   - Nice token, broken before: {, "bla"

      editor = editor || sense.editor;
      var pos = editor.getCursorPosition();
      var session = editor.getSession();

      context.updatedForToken = session.getTokenAt(pos.row, pos.column);

      var insertingRelativeToToken = 0; // -1 is before token, 0 middle, +1 after token

      switch (context.updatedForToken.type) {
         case "variable":
         case "string":
         case "text":
         case "constant.numeric":
         case "constant.language.boolean":
            insertingRelativeToToken = 0;
            context.rangeToReplace = new (ace.require("ace/range").Range)(
               pos.row, context.updatedForToken.start, pos.row,
               context.updatedForToken.start + context.updatedForToken.value.length
            );
            context.replacingToken = true;
            break;
         default:
            // standing on white space, quotes or another punctuation - no replacing
            context.rangeToReplace = new (ace.require("ace/range").Range)(
               pos.row, pos.column, pos.row, pos.column
            );
            context.replacingToken = false;
            if (pos.column == context.updatedForToken.start)
               insertingRelativeToToken = -1;
            else if (pos.column < context.updatedForToken.start + context.updatedForToken.value.length)
               insertingRelativeToToken = 0;
            else
               insertingRelativeToToken = 1;
      }

      context.textBoxPosition = { row: context.rangeToReplace.start.row, column: context.rangeToReplace.start.column};

      // Figure out what happens next to the token to see whether it needs trailing commas etc.

      // Templates will be used if not destroying existing structure.
      // -> token : {} or token ]/} or token , but not token : SOMETHING ELSE

      context.prefixToAdd = "";
      context.suffixToAdd = "";
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
            context.addTemplate = false;

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
            switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
               case "NOTOKEN":
               case "paren.rparen":
               case "punctuation.comma":
               case "punctuation.colon":
                  break;
               default:
                  context.suffixToAdd = ", "
            }

            break;
         default:
            context.addTemplate = true;
            context.suffixToAdd = ", ";
            break; // for now play safe and do nothing. May be made smarter.
      }


      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      var nonEmptyToken = tokenIter.getCurrentToken();
      if (isEmptyToken(nonEmptyToken) || insertingRelativeToToken <= 0) // we should actually look at what's happening before this token
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

      return context;
   }

   function getActiveAutoCompleteSet(editor) {

      var autocompleteSet = { templateByTerm: {}, completionTerms: [] };

      function getLinkedRules(link, currentRules) {
         var link_path = link.split(".");
         var scheme_id = link_path.shift();
         var linked_rules = currentRules;
         if (scheme_id == "GLOBAL") {
            linked_rules = global.sense.kb.getGlobalAutocompleteRules();
         }
         else if (scheme_id) {
            linked_rules = global.sense.kb.getEndpointDescriptionByEndpoint(scheme_id);
            if (!linked_rules)
               throw "Failed to resolve linked scheme: " + scheme_id;
            linked_rules = linked_rules.data_autocomplete_rules;
            if (!linked_rules)
               throw "No autocomplete rules defined in linked scheme: " + scheme_id;

         }

         var rules = getRulesForPath(linked_rules, link_path);
         if (!rules) throw "Failed to resolve rules by link: " + link;
         return rules;
      }

      function getRulesForPath(rules, tokenPath, scopeRules) {
         // scopeRules are the rules used to resolve relative scope links
         tokenPath = $.merge([], tokenPath);
         if (!rules)
            return;

         if (typeof scopeRules == "undefined") scopeRules = rules;
         var t;
         // find the right rule set for current path
         while (tokenPath.length && rules) {
            t = tokenPath.shift();
            switch (t) {
               case "{":
                  if (typeof rules != "object") rules = null;
                  break;
               case "[":
                  if (rules.__any_of || rules instanceof Array) {
                     var norm_rules = rules.__any_of || rules;
                     if (tokenPath.length) {
                        // we need to go on, try
                        for (var i = 0; i < norm_rules.length; i++) {
                           var possible_rules = getRulesForPath(norm_rules[i], tokenPath, scopeRules);
                           if (possible_rules) return possible_rules;
                        }
                     }
                     else
                        rules = norm_rules;
                  }
                  else
                     rules = null;
                  break;
               default:
                  rules = rules[t] || rules["*"] || rules["$FIELD$"] || rules["$TYPE$"]; // we accept anything for a field.
            }
            if (rules && typeof rules.__scope_link != "undefined") {
               rules = getLinkedRules(rules.__scope_link, scopeRules);
            }
         }
         if (tokenPath.length) return null; // didn't find anything.
         return rules;
      }

      function expandTerm(term) {
         if (term == "$INDEX$") {
            return global.sense.mappings.getIndices();
         }
         else if (term == "$TYPE$") {
            return global.sense.mappings.getTypes(ACTIVE_INDICES);
         }
         else if (term == "$FIELD$") {
            return global.sense.mappings.getFields(ACTIVE_INDICES, ACTIVE_TYPES);
         }
         return [ term ]
      }

      function extractOptionsForPath(rules, tokenPath) {
         // extracts the relevant parts of rules for tokenPath
         var initialRules = rules;
         rules = getRulesForPath(rules, tokenPath);

         // apply rule set
         var term;
         if (rules) {
            if (typeof rules == "string") {
               $.merge(autocompleteSet.completionTerms, expandTerm(rules));
            }
            else if (rules instanceof Array) {
               if (rules.length > 0 && typeof rules[0] != "object") {// not an array of objects
                  $.map(rules, function (t) {
                     $.merge(autocompleteSet.completionTerms, expandTerm(t));
                  });
               }
            }
            else if (rules.__one_of) {
               if (rules.__one_of.length > 0 && typeof rules.__one_of[0] != "object")
                  $.merge(autocompleteSet.completionTerms, rules.__one_of);
            }
            else if (rules.__any_of) {
               if (rules.__any_of.length > 0 && typeof rules.__any_of[0] != "object")
                  $.merge(autocompleteSet.completionTerms, rules.__any_of);
            }
            else {
               for (term in rules) {

                  if (typeof term == "string" && term.match(/^__|^\*$/))
                     continue; // meta term

                  switch (term) {
                     case "$INDEX$":
                        if (ACTIVE_INDICES)
                           $.merge(autocompleteSet.completionTerms, ACTIVE_INDICES);
                        break;
                     case "$TYPE$":
                        $.merge(autocompleteSet.completionTerms,
                           global.sense.mappings.getTypes(ACTIVE_INDICES));
                        break;
                     case "$FIELD$":
                        $.merge(autocompleteSet.completionTerms,
                           global.sense.mappings.getFields(ACTIVE_INDICES, ACTIVE_TYPES));
                        break;
                     default:
                        autocompleteSet.completionTerms.push(term);
                        break;
                  }

                  var rules_for_term = rules[term];

                  // following linked scope until we fined the right template
                  while (typeof rules_for_term.__template == "undefined" &&
                     typeof rules_for_term.__scope_link != "undefined"
                     ) {
                     rules_for_term = getLinkedRules(rules_for_term.__scope_link, initialRules);
                  }

                  if (typeof rules_for_term.__template != "undefined")
                     autocompleteSet.templateByTerm[term] = rules_for_term.__template;
                  else if (rules_for_term instanceof Array) {
                     var template = [];
                     if (rules_for_term.length) {
                        if (rules_for_term[0] instanceof  Array) {
                           template = [
                              []
                           ];
                        }
                        else if (typeof rules_for_term[0] == "object") {
                           template = [
                              {}
                           ];
                        }
                        else {
                           template = [rules_for_term[0]];
                        }
                     }

                     autocompleteSet.templateByTerm[term] = template;
                  }
                  else if (typeof rules_for_term == "object") {
                     if (rules_for_term.__one_of)
                        autocompleteSet.templateByTerm[term] = rules_for_term.__one_of[0];
                     else if ($.isEmptyObject(rules_for_term))
                     // term sub rules object. Check if has actual or just meta stuff (like __one_of
                        autocompleteSet.templateByTerm[term] = {};
                     else {
                        for (var sub_rule in rules_for_term) {
                           if (!(typeof sub_rule == "string" && sub_rule.substring(0, 2) == "__")) {
                              // found a real sub element, it's an object.
                              autocompleteSet.templateByTerm[term] = {};
                              break;
                           }
                        }
                     }
                  }
                  else {
                     // just add what ever the value is -> default
                     autocompleteSet.templateByTerm[term] = rules_for_term;
                  }
               }
            }
         }

         return rules ? true : false;
      }

      var tokenPath = getCurrentTokenPath(editor);
      if (tokenPath == null) {
         console.log("Can't extract a valid token path.")
         return null;
      }
      // apply global rules first, as they are of lower priority.
      // start with one before end as to not to resolve just "{" -> empty path
      for (var i = tokenPath.length - 2; i >= 0; i--) {
         var subPath = tokenPath.slice(i);
         if (extractOptionsForPath(global.sense.kb.getGlobalAutocompleteRules(), subPath)) break;
      }
      var pathAsString = tokenPath.join(",");
      extractOptionsForPath((ACTIVE_SCHEME || {}).data_autocomplete_rules, tokenPath);

      if (autocompleteSet.completionTerms) {
         autocompleteSet.completionTerms.sort();
      }


      console.log("Resolved token path " + pathAsString + " to " + autocompleteSet.completionTerms);
      return  autocompleteSet.completionTerms ? autocompleteSet : null;
   }


   function getCurrentTokenPath(editor) {
      var pos = editor.getCursorPosition();
      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(), pos.row, pos.column);
      var ret = [], last_var = "", first_scope = true;

      var STATES = { looking_for_key: 0, // looking for a key but without jumping over anything but white space and colon.
         looking_for_scope_start: 1, // skip everything until scope start
         start: 3};
      var state = STATES.start;

      // initialization problems -
      var t = tokenIter.getCurrentToken();
      if (t) {
         if (pos.column == 0) {
            // if we are at the beginning of the line, the current token is the one after cursor, not before which
            // deviates from the standard.
            t = tokenIter.stepBackward();
            state = STATES.looking_for_scope_start;
         }

      }

      // climb one scope at a time and get the scope key
      for (; t; t = tokenIter.stepBackward()) {
         switch (t.type) {
            case "variable":
               if (state == STATES.looking_for_key)
                  ret.unshift(t.value.trim().replace(/"/g, ''));
               state = STATES.looking_for_scope_start; // skip everything until the beginning of this scope
               break;


            case "paren.lparen":
               ret.unshift(t.value);
               if (state == STATES.looking_for_scope_start) {
                  // found it. go look for the relevant key
                  state = STATES.looking_for_key;
               }
               break;
            case "paren.rparen":
               // reset he search for key
               state = STATES.looking_for_scope_start;
               // and ignore this sub scope..
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
               if (!t) // oops we run out.. we don't know what's up return null;
                  return null;
               break;
            case "string":
            case "constant.numeric" :
            case "text":
               if (state == STATES.start) {
                  state = STATES.looking_for_key;
               }
               else if (state == STATES.looking_for_key) {
                  state = STATES.looking_for_scope_start;
               }

               break;
            case "punctuation.comma":
               if (state == STATES.start) {
                  state = STATES.looking_for_scope_start;
               }
               break;
            case "punctuation.colon":
            case "whitespace":
               if (state == STATES.start) {
                  state = STATES.looking_for_key;
               }
               break; // skip white space

         }
      }
      return ret;
   }

   function parseIndicesTypesAndId(value) {
      var ret = {
         indices: undefined,
         types: undefined,
         id: undefined,
         endpoint: undefined,
         autocomplete_prefix: undefined,  // prefix to add to autocomplete options
         autocomplete_value: undefined,
         use_indices: true,
         use_endpoints: true,
         use_types: false
      };

      var startIndex = value.charAt(0) === "/" ? 1 : 0;
      var slashIndex, s;
      var indices = [], types = [], id;
      // first position is indices or starts with _
      if (value.charAt(startIndex) !== "_") {
         slashIndex = value.indexOf("/", startIndex + 1);
         if (slashIndex < 0) slashIndex = value.length;
         indices = value.substring(startIndex, slashIndex);
         indices = (indices === "" ? [] : indices.split(",") );
         ret.indices = $.map(indices, function (s) {
            return s != "" ? s : undefined
         });
         ret.autocomplete_value = indices.length > 0 ? indices[indices.length - 1] : "";
         if (indices.length > 1) {
            // more then one index and at this point we assume the text ends at the indices section
            ret.use_endpoints = false;
            s = value.substring(0, slashIndex);
            ret.autocomplete_prefix = s.substring(0, s.lastIndexOf(",") + 1);
         }
         else {
            ret.autocomplete_prefix = value.substring(0, startIndex);
            ret.use_endpoints = true;
         }
         startIndex = slashIndex + 1;
      }

      if (slashIndex >= value.length) {
         return ret; // indices are not terminated
      }

      // now types
      if (value.charAt(startIndex) !== "_") {
         slashIndex = value.indexOf("/", startIndex + 1);
         if (slashIndex < 0) slashIndex = value.length;
         types = value.substring(startIndex, slashIndex);
         types = (types === "" ? [] : types.split(",") );
         ret.types = $.map(types, function (s) {
            return s != "" ? s : undefined
         });

         ret.autocomplete_value = types.length > 0 ? types[types.length - 1] : "";
         ret.use_indices = false; // we have types, indices are not interesting.
         ret.use_types = true;

         if (types.length > 1) {
            // more then one type and at this point we assume the text ends at the indices section
            ret.use_endpoints = false;
            s = value.substring(0, slashIndex);
            ret.autocomplete_prefix = s.substring(0, s.lastIndexOf(",") + 1);
         }
         else {
            ret.autocomplete_prefix = value.substring(0, startIndex);
            ret.use_endpoints = true;
         }
         startIndex = slashIndex + 1;
      }

      if (slashIndex >= value.length) {
         return ret; // types are not terminated
      }

      // now ids
      if (value.charAt(startIndex) !== "_") {
         slashIndex = value.indexOf("/", startIndex + 1);
         if (slashIndex < 0) slashIndex = value.length;
         ret.id = value.substring(startIndex, slashIndex);
         ret.use_types = false;
         ret.use_endpoints = true; // id maybe a partial endpoint
         ret.autocomplete_value = ret.id;
         ret.autocomplete_prefix = value.substring(0, startIndex);
         startIndex = slashIndex + 1;
      }

      if (startIndex < value.length) {
         // if there is something we haven't dealt with so far it must be an endpoint substring
         ret.endpoint = value.substring(startIndex);
         ret.use_endpoints = true;
         ret.use_indices = ret.use_types = false;
         ret.autocomplete_value = value.substring(slashIndex + 1);
         ret.autocomplete_prefix = value.substring(0, slashIndex + 1);
      }

      return ret;

   }

   function getEndpointAutoCompleteList(value) {
      if (!value) value = "";

      var indexContext = parseIndicesTypesAndId(value);

      var options = [];

      if (indexContext.use_endpoints) {
         options.push.apply(options, global.sense.kb.getEndpointAutocomplete(indexContext.indices,
            indexContext.types, indexContext.id));
      }
      if (indexContext.use_indices) {
         options.push.apply(options, global.sense.mappings.getIndices());
      }
      else if (indexContext.use_types) {
         options.push.apply(options, global.sense.mappings.getTypes(indexContext.indices));
      }

      if (indexContext.autocomplete_value.length > 0) {
         var selector = new RegExp($.ui.autocomplete.escapeRegex(indexContext.autocomplete_value));
         options = $.map(options, function (o) {
            if (selector.test(o)) return o;
            return null;
         })
      }

      return ($.map(options, function (o) {
         return indexContext.autocomplete_prefix + o;
      })).sort();

   }


   function getActiveScheme() {
      return ACTIVE_SCHEME;
   }

   function setActiveScheme(scheme, indices, types, id) {
      ACTIVE_SCHEME = scheme;
      ACTIVE_INDICES = indices;
      ACTIVE_TYPES = types;
      ACTIVE_DOC_ID = id;
   }

   function setActiveSchemeByEndpointPath(endpoint_path) {
      var indexContext = parseIndicesTypesAndId(endpoint_path);
      var scheme = sense.kb.getEndpointDescriptionByPath(indexContext.endpoint,
         indexContext.indices, indexContext.types, indexContext.id);
      setActiveScheme(scheme, indexContext.indices, indexContext.types, indexContext.id);

   }

   function evaluateCurrentTokenAfterAChange() {
      var pos = sense.editor.getCursorPosition();
      var session = sense.editor.getSession();
      var currentToken = session.getTokenAt(pos.row, pos.column);
      console.log("Evaluating current token: " + (currentToken || {}).value +
         " last examined: " + ((ACTIVE_CONTEXT || {}).updatedForToken || {}).value);


      switch ((currentToken || {}).type) {
         case "variable":
         case "string":
         case "text":
         case "constant.numeric":
         case "constant.language.boolean":
            // interesting.
            break;
         default:
            hideAutoComplete();
            LAST_EVALUATED_TOKEN = null;
            ACTIVE_CONTEXT = null;
            return;
      }

      currentToken.row = pos.row; // extend token with row. Ace doesn't supply it by default

      if (ACTIVE_CONTEXT != null &&
         currentToken.row == ACTIVE_CONTEXT.updatedForToken.row &&
         currentToken.start == ACTIVE_CONTEXT.updatedForToken.start
         ) {

         if (MODE == MODE_FORCED_CLOSE) {
            // menu was explicitly closed with esc. ignore
            return;
         }


         if (ACTIVE_CONTEXT.updatedForToken.value == currentToken.value)
            return; // nothing changed

         if (MODE == MODE_VISIBLE) updateAutoComplete(); else showAutoComplete();
         return;
      }

      // show menu (if we have something)
      showAutoComplete();


   }

   function editorAutocompleteCommand(editor) {
      return showAutoComplete(editor, true);
   }


   function init() {
      // initialize auto complete on server
      var es_server = $("#es_server");

      es_server.autocomplete({
         minLength: 0,
         source: []
      });

      es_server.focus(function () {
         es_server.autocomplete("option", "source", global.sense.history.getHistoricalServers());
      });

      // initialize endpoint auto complete

      var es_endpoint = $("#es_endpoint");
      es_endpoint.autocomplete({ minLength: 0, source: function (request, response) {
         var ret = [];
         try {
            ret = getEndpointAutoCompleteList(request.term);
         }
         catch (ex) {
            if (ex.message && ex.name) {
               console.log("someMethod caught an exception of type " + ex.name + ": ", ex.message);
            } else {
               console.log("someMethod caught a poorly-typed exception: " + ex);
            }
         }
         response(ret);
      } });

      var update_scheme = function () {
         var cur_scheme_id = (getActiveScheme() || {})._id;

         setActiveSchemeByEndpointPath(es_endpoint.val());

         var new_scheme_id = (getActiveScheme() || {})._id;
         if (new_scheme_id != cur_scheme_id) {
            var methods = ["GET", "POST", "PUT", "DELETE"];
            if (ACTIVE_SCHEME && ACTIVE_SCHEME.methods) methods = ACTIVE_SCHEME.methods;
            var es_method = $("#es_method");
            es_method.empty();
            $.each(methods, function (i, method) {
               es_method.append($("<option></option>")
                  .attr("value", method).text(method));
            });

            if (ACTIVE_SCHEME && ACTIVE_SCHEME.def_method) {
               es_method.val(ACTIVE_SCHEME.def_method);
            }
         }
      };
      es_endpoint.on("autocompletechange", update_scheme);
      es_endpoint.change(update_scheme);

      update_scheme(); // initialize.

      ACTIVE_MENU = $("#autocomplete");
      ACTIVE_MENU.menu({
         select: function (event, ui) {
            applyTerm(ACTIVE_CONTEXT.autoCompleteSet.completionTerms[ui.item.data("term_id")]);
         }
      });
      ACTIVE_MENU.keyup(function (e) {
         if (e.keyCode == 27) {
            hideAutoComplete()
            sense.editor.focus();
            return false;
         }
         return true;
      });


      sense.editor.getSession().selection.on('changeCursor', function (e) {
         console.log("updateCursor communicated by editor");
         if (MODE != MODE_VISIBLE) return;
         setTimeout(function () {
            if (MODE != MODE_VISIBLE) return;
            var pos = sense.editor.getCursorPosition();
            if (ACTIVE_CONTEXT.updatedForToken.row != pos.row) {
               hideAutoComplete(); // we moved away
               return;
            }
            var session = sense.editor.getSession();
            var currentToken = session.getTokenAt(pos.row, pos.column);
            if (currentToken && currentToken.start != ACTIVE_CONTEXT.updatedForToken.start) {
               hideAutoComplete(); // we moved away
            }
         }, 100);

      });

      sense.editor.getSession().on("change", function (e) {
         console.log("Document change communicated by editor");
         if (MODE == MODE_APPLYING_TERM) {
            console.log("Ignoring, triggered by our change");
            return;
         }
         setTimeout(evaluateCurrentTokenAfterAChange, 100)
      });

   }

   global.sense.autocomplete = {};
   global.sense.autocomplete.editorAutocompleteCommand = editorAutocompleteCommand;
   global.sense.autocomplete.init = init;
   global.sense.autocomplete.getEndpointAutoCompleteList = getEndpointAutoCompleteList;
   global.sense.autocomplete.setActiveScheme = setActiveScheme;
   global.sense.autocomplete.getActiveScheme = getActiveScheme;
   global.sense.autocomplete.setActiveSchemeByEnpointPath = setActiveSchemeByEndpointPath;
   global.sense.autocomplete.parseIndicesTypesAndId = parseIndicesTypesAndId;

   // functions exposed only for testing.
   global.sense.autocomplete.test = {};
   global.sense.autocomplete.test.getAutoCompleteValueFromToken = getAutoCompleteValueFromToken;
   global.sense.autocomplete.test.getAutoCompleteContext = getAutoCompleteContext;


})();
