
var editor,output,active_scheme = {};


function resetToValues(server,endpoint,method,data) {
  $("#es_server").val(server);
  $("#es_endpoint").val(endpoint);
  $("#es_method").val(method);
  editor.getSession().setValue(data);
  output.getSession().setValue("");

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

 var es_server = $("#es_server").val(),
     es_endpoint = $("#es_endpoint").val(),
     es_method = $("#es_method").val(),
     es_data = editor.getValue();

  if (es_server.indexOf("://") <0 ) es_server = "http://" + es_server;
  es_server = es_server.trim("/");

  if (es_endpoint[0] !='/') es_endpoint = "/" + es_endpoint;

  addToHistory(es_server,es_endpoint,es_method,es_data)

  console.log("Calling " + es_server+es_endpoint);
  $.ajax({
     url : es_server + es_endpoint,
     data : es_data,
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


  $("#es_server").val(window.location.host);
  var paths = [];
  for (var endpoint in ES_SCHEME_BY_ENDPOINT) {
    paths.push(endpoint);
  }
  paths.sort();


  var es_endpoint = $("#es_endpoint");
  es_endpoint.typeahead({ "source" : paths });

  es_endpoint.change(function () {
    updateActiveScheme(es_endpoint.val());
  });

  es_endpoint.change(); // initialized using baked in value.
}

$(document).ready(init);
