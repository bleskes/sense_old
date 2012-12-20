
var editor,output,active_scheme = {};

function autocomplete(editor) {
  var autoCompleteSet = getActiveAutoCompleteSet(editor);
  if (!autoCompleteSet) return; // nothing to do..


  var pos = editor.getCursorPosition();
  var session = editor.getSession();
  var currentToken = session.getTokenAt(pos.row,pos.column);
  var tokenRange = new (ace.require("ace/range").Range)(pos.row,currentToken.start,pos.row,
                                                        currentToken.start + currentToken.value.length);

  var highlightPos;
  var ac_input = $('<input id="autocomplete" type="text"  />').appendTo($("#main"));
  if (currentToken.type == "string" || currentToken.type == "variable") {// string with current token
    ac_input.val(currentToken.value.trim().replace(/"/g,''));
    highlightPos = { row: pos.row , column: currentToken.start};
  }
  else {
    highlightPos = editor.getCursorPosition();
    ac_input.val();
  }

  var screen_pos = editor.renderer.textToScreenCoordinates(highlightPos.row,highlightPos.column);

  ac_input.css("left",screen_pos.pageX);
  ac_input.css("top",screen_pos.pageY);

  ac_input.css('visibility', 'visible');

  function accept(term) {
    switch (currentToken.type) {
            case "paren.rparen":
              editor.insert(', "'+term+'"');
              break;
            case "string":
            case "variable":
              session.replace(tokenRange,'"'+term+'"');
              break;
            default:
              editor.insert('"'+term+'"');
          }

          ac_input.remove();
          editor.focus();
  }

  ac_input.autocomplete({
    minLength : 0,
    source : autoCompleteSet,
    select : function (e,data) {
      accept(data.item.value);
    }
  });

  ac_input.keypress(function (e) {
    if (e.which == 13) {
      accept($(this).val());
      this.blur();
    }
  });

  ac_input.blur(function () {ac_input.css('visibility','hidden'); ac_input.remove()});
  ac_input.show().focus().autocomplete( "search", "" );

}


function getActiveAutoCompleteSet(editor) {

  function extractOptionsForPath(rules,tokenPath) {
    tokenPath = $.merge([],tokenPath);
    if (!rules)
        return [];
      var t;
      while (tokenPath.length && rules) {
        t = tokenPath.pop();
        rules =  rules[t] || rules["*"];
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
  $.merge(ret, extractOptionsForPath((active_scheme || {}).autocomplete_rules,tokenPath));

  for (var i = tokenPath.length - 1; i>=0 ; i-- ) {
    var subPath = tokenPath.splice(i);
    $.merge(ret, extractOptionsForPath(GLOBAL_AUTOCOMPLETE_RULES,subPath));

  }

  console.log("Resolved token path " + pathAsString + " to " + ret);
  return ret;
}


function getCurrentTokenPath(editor) {
  var pos = editor.getCursorPosition();
  var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(),pos.row,pos.column);
  var ret = [], last_var = "", seen_opening_paren = false;
  for (var t = tokenIter.getCurrentToken();t; t = tokenIter.stepBackward()) {
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
          var parenCount =1;
          for (t = tokenIter.stepBackward(); t && parenCount > 0 ; t = tokenIter.stepBackward()) {
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
          last_var = t.value.trim().replace(/"/g,'');
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

  active_scheme = ES_SCHEME_BY_ENDPOINT[endpoint];

}

function callES() {
  output.getSession().setValue('{ "__mode__" : "Calling ES...." }');

 var es_host = $("#es_host").val(),
     es_path = $("#es_path").val(),
     es_method = $("#es_method").val();

  if (es_host.indexOf("://") <0 ) es_host = "http://" + es_host;
  es_host = es_host.trim("/");

  if (es_path[0] !='/') es_path = "/" + es_path;

  console.log("Calling " + es_host+es_path);
  $.ajax({
     url : es_host + es_path,
     data : editor.getValue(),
     type: es_method,
     complete: function (xhr,status) {
       if (status == "error" || status == "success") {
         var value = xhr.responseText;
         try {
            value = JSON.stringify(JSON.parse(value), null, 3);
         }
         catch (e) {

         }
         output.getSession().setValue(value);
       }
       else {
         output.getSession().setValue("Request failed to get to the server: " + status);
       }

     }
  })
}

function reformat() {
  var value = editor.getSession().getValue();
  try {
     value = JSON.stringify(JSON.parse(value), null, 3);
     editor.getSession().setValue(value);
  }
  catch (e) {

  }

}

function init () {
  editor = ace.edit("editor");
  editor.getSession().setMode("ace/mode/json");
  editor.getSession().setFoldStyle('markbeginend');
  editor.commands.addCommand({
      name: 'autocomplete',
      bindKey: {win: 'Ctrl-Space',  mac: 'Ctrl-Space'},
      exec: autocomplete
  });
  editor.commands.addCommand({
      name: 'reformat editor',
      bindKey: {win: 'Ctrl-I',  mac: 'Command-I'},
      exec: reformat
  });
  editor.commands.addCommand({
      name: 'send to elasticsearch',
      bindKey: {win: 'Ctrl-Enter',  mac: 'Command-Enter'},
      exec: callES
  });
  output = ace.edit("output");
  output.getSession().setMode("ace/mode/json");
  output.getSession().setFoldStyle('markbeginend');
  output.setTheme("ace/theme/monokai");
  output.setReadOnly(true);
  output.renderer.setShowPrintMargin(false);

  reformat();
  editor.focus();


  $("#es_host").val(window.location.host);
  var paths = [];
  for (var endpoint in ES_SCHEME_BY_ENDPOINT) {
    paths.push(endpoint);
  }
  paths.sort();


  var es_path = $("#es_path");
  es_path.typeahead({ "source" : paths });

  es_path.change(function () {
    updateActiveScheme(es_path.val());
  });

  es_path.change(); // initialized using baked in value.
}

$(document).ready(init);
