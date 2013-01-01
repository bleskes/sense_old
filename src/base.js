
var editor,output,active_scheme = {};

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
