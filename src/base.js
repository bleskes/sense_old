sense = {
  "editor": null,
  "output": null,
  "active_scheme": {}
};


function resetToValues(server, endpoint, method, data) {
  if (server != null) $("#es_server").val(server);
  if (endpoint != null) $("#es_endpoint").val(endpoint);
  if (method != null) $("#es_method").val(method);
  if (data != null) sense.editor.getSession().setValue(data);
  sense.output.getSession().setValue("");

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

  console.log("Calling " + es_server + es_endpoint);
  $.ajax({
    url: es_server + es_endpoint,
    data: es_data,
    type: es_method,
    complete: function (xhr, status) {
      if (xhr.status == 500 || xhr.status == 200) {
        // we have someone on the other side. Add to history
        sense.history.addToHistory(es_server, es_endpoint, es_method, es_data);


        var value = xhr.responseText;
        try {
          value = JSON.stringify(JSON.parse(value), null, 3);
        }
        catch (e) {

        }
        sense.output.getSession().setValue(value);
      }
      else {
        sense.output.getSession().setValue("Request failed to get to the server (status code: " + xhr.status + "):" + xhr.responseText);
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
    exec: sense.autocomplete.editorAutocompleteCommand
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


  sense.history.init();
  sense.autocomplete.init();


  $("#send").click(function () {
    callES();
    return false;
  });

  var last_history_elem = sense.history.getLastHistoryElement();
  if (last_history_elem) {
    sense.history.applyHistoryElement(last_history_elem, true);
    sense.editor.focus();
  }
  else {
    reformat();
    $("#es_server").focus();
  }


}

$(document).ready(init);
