sense = {
  "editor": null,
  "output": null,
  "active_scheme": null
};


function resetToValues(server, endpoint, method, data) {
  $("#es_server").val(server);
  $("#es_endpoint").val(endpoint);
  $("#es_method").val(method);
  sense.editor.getSession().setValue(data);
  sense.output.getSession().setValue("");

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

function callES() {
  sense.output.getSession().setValue('{ "__mode__" : "Calling ES...." }');

  var es_server = $("#es_server").val(),
      es_endpoint = $("#es_endpoint").val(),
      es_method = $("#es_method").val(),
      es_data = sense.editor.getValue();

  if (es_server.indexOf("://") < 0) es_server = "http://" + es_server;
  es_server = es_server.trim("/");

  if (es_endpoint[0] != '/') es_endpoint = "/" + es_endpoint;

  sense.history.addToHistory(es_server, es_endpoint, es_method, es_data);

  console.log("Calling " + es_server + es_endpoint);
  $.ajax({
    url: es_server + es_endpoint,
    data: es_data,
    type: es_method,
    complete: function (xhr, status) {
      if (status == "error" || status == "success") {
        var value = xhr.responseText;
        try {
          value = JSON.stringify(JSON.parse(value), null, 3);
        }
        catch (e) {

        }
        sense.output.getSession().setValue(value);
      }
      else {
        sense.output.getSession().setValue("Request failed to get to the server: " + status);
      }

    }
  })
}

function reformat() {
  var value = sense.editor.getSession().getValue();
  try {
    value = JSON.stringify(JSON.parse(value), null, 3);
    sense.editor.getSession().setValue(value);
  }
  catch (e) {

  }

}

function init() {
  sense.editor = ace.edit("editor");
  sense.editor.getSession().setMode("ace/mode/json");
  sense.editor.getSession().setFoldStyle('markbeginend');
  sense.editor.commands.addCommand({
    name: 'autocomplete',
    bindKey: {win: 'Ctrl-Space', mac: 'Ctrl-Space'},
    exec: autocomplete
  });
  sense.editor.commands.addCommand({
    name: 'reformat editor',
    bindKey: {win: 'Ctrl-I', mac: 'Command-I'},
    exec: reformat
  });
  sense.editor.commands.addCommand({
    name: 'send to elasticsearch',
    bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
    exec: callES
  });
  sense.output = ace.edit("output");
  sense.output.getSession().setMode("ace/mode/json");
  sense.output.getSession().setFoldStyle('markbeginend');
  sense.output.setTheme("ace/theme/monokai");
  sense.output.setReadOnly(true);
  sense.output.renderer.setShowPrintMargin(false);


  $("#send").click(function () {
    callES();
    return false;
  });

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
  es_endpoint.change(); // initialized using baked in value.

  var es_server = $("#es_server");
  reformat();
  es_server.focus();

}

$(document).ready(init);
