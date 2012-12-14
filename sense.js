
var editor,output;


function init () {
  editor = ace.edit("editor");
  editor.getSession().setMode("ace/mode/json");
  editor.getSession().setFoldStyle('markbeginend');
  output = ace.edit("output");
  output.getSession().setMode("ace/mode/json");
  output.getSession().setFoldStyle('markbeginend');
  output.setTheme("ace/theme/monokai");

  $("#es_host").val(window.location.host);
  $("#es_path").typeahead({ "source" : GLOBAL_END_POINTS });

}

$(document).ready(init);

function getCurrentTokenPath() {
  var pos = editor.getCursorPosition();
  var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(),pos.row,pos.column);
  var ret = "", last_var = "";
  for (var t = tokenIter.getCurrentToken();t; t = tokenIter.stepBackward()) {
    switch (t.type) {
      case "paren.lparen":
          if (t.value == "[" && !ret) {
            // bottom of the chain, list element not intresting
            ret = "[";
          }
          else
            ret = t.value + last_var + ret;

        last_var = "";
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