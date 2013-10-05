if (!sense)
   sense = {
      "editor": null,
      "output": null
   };


function resetToValues(server, content) {
   if (server != null) {
      $("#es_server").val(server);
      sense.mappings.notifyServerChange(server);
   }
   if (content != null) sense.editor.getSession().setValue(content);
   sense.output.getSession().setValue("");

}

function constructESUrl(server, url) {
   if (url.indexOf("://") >= 0) return url;
   if (server.indexOf("://") < 0) server = "http://" + server;
   server = server.trim("/");
   if (url.charAt(0) === "/") url = url.substr(1);

   return server + "/" + url;
}

function callES(server, url, method, data, successCallback, completeCallback) {

   url = constructESUrl(server, url);
   var uname_password_re = /^(https?:\/\/)?(?:(?:(.*):)?(.*?)@)?(.*)$/;
   var url_parts = url.match(uname_password_re);

   var uname = url_parts[2];
   var password = url_parts[3];
   url = url_parts[1] + url_parts[4];
   console.log("Calling " + url + "  (uname: " + uname + " pwd: " + password + ")");

   $.ajax({
      url: url,
      data: method == "GET" ? null : data,
//      xhrFields: {
//            withCredentials: true
//      },
//      headers: {
//         "Authorization": "Basic " + btoa(uname + ":" + password)
//      },
//      beforeSend: function(xhr){
//         xhr.withCredentials = true;
//         xhr.setRequestHeader("Authorization", "Basic " + btoa(uname + ":" + password));
//      },

      password: password,
      username: uname,
      crossDomain: true,
      type: method,
      complete: completeCallback,
      success: successCallback
   });
}

function submitCurrentRequestToES() {
   var req = sense.utils.getCurrentRequest();
   if (!req) return;

   $("#notification").text("Calling ES....").css("visibility", "visible");
   sense.output.getSession().setValue('');

   var es_server = $("#es_server").val(),
      es_url = req.url,
      es_method = req.method,
      es_data = es_method == "GET" ? null : req.data.join("\n");

   callES(es_server, es_url, es_method, es_data, null, function (xhr, status) {
         $("#notification").text("").css("visibility", "hidden");
         if (typeof xhr.status == "number" &&
            ((xhr.status >= 400 && xhr.status < 600) ||
               (xhr.status >= 200 && xhr.status < 300)
               )) {
            // we have someone on the other side. Add to history
            sense.history.addToHistory(es_server, es_url, es_method, es_data);


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
   );

   saveEditorState();

   _gaq.push(['_trackEvent', "elasticsearch", 'query']);
}

function reformat(indent) {
   if (typeof indent == "undefined") {
      indent = true;
   }
   var req_range = sense.utils.getCurrentRequestRange();
   if (!req_range) return;
   var parsed_req = sense.utils.getCurrentRequest();
   if (parsed_req.data) {
      var formatted_data = [];
      for (var i = 0; i < parsed_req.data.length; i++) {
         var cur_doc = parsed_req.data[i];
         try {
            formatted_data.push(JSON.stringify(JSON.parse(cur_doc), null, indent ? 3 : 0));
         }
         catch (e) {
            console.log(e);
            formatted_data.push(cur_doc);
         }
      }
      parsed_req.data = formatted_data;
   }
   sense.utils.replaceCurrentRequest(parsed_req, req_range);
}


function copyToClipboard(value) {
   var clipboardStaging = $("#clipboardStaging");
   clipboardStaging.val(value);
   clipboardStaging.select();
   document.execCommand("Copy");
}

function copyAsCURL() {
   var req = sense.utils.getCurrentRequest();
   if (!req) return;

   _gaq.push(['_trackEvent', "curl", 'copied']);

   var es_server = $("#es_server").val(),
      es_url = req.url,
      es_method = req.method,
      es_data = req.data;

   var url = constructESUrl(es_server, es_url);

   var curl = 'curl -X' + es_method + ' "' + url + '"';
   if (es_data) curl += " -d'\n" + es_data + "'";

   //console.log(curl);
   copyToClipboard(curl);
}


function handleCURLPaste(text) {
   _gaq.push(['_trackEvent', "curl", 'pasted']);
   var curlInput = sense.curl.parseCURL(text);
   if ($("#es_server").val()) curlInput.server = null; // do not override server

   if (!curlInput.method) curlInput.method = "GET";

   if (curlInput.data && curlInput.method == "GET") {
      // javascript doesn't support GET with a body, switch to POST and pray..
      curlInput.method = "POST";
   }

   sense.editor.insert(sense.utils.textFromRequest(curlInput));

}


var CURRENT_REQ_RANGE = null;


function saveEditorState() {
   try {
      var content = sense.editor.getValue();
      var server = $("#es_server").val();
      sense.history.saveCurrentEditorState(server, content);
   }
   catch (e) {
      console.log("Ignoring saving error: " + e)
   }
}

function updateEditorActionsBar() {
   var editor_actions = $("#editor_actions");

   if (CURRENT_REQ_RANGE) {
      var screen_pos = sense.editor.renderer.textToScreenCoordinates(CURRENT_REQ_RANGE.start.row,
         CURRENT_REQ_RANGE.start.column);
      var offset = screen_pos.pageY;
      var end_offset = sense.editor.renderer.textToScreenCoordinates(CURRENT_REQ_RANGE.end.row,
         CURRENT_REQ_RANGE.end.column).pageY;
      offset += CURRENT_REQ_RANGE.start.row == CURRENT_REQ_RANGE.end.row ? -3 : 0;

      offset = Math.min(end_offset, Math.max(offset, 47));
      if (offset >= 47) {
         editor_actions.css("top", Math.max(offset, 47));
         editor_actions.css('visibility', 'visible');
      }
      else {
         editor_actions.css('visibility', 'hidden');
      }
   }
   else {
      editor_actions.css('visibility', 'hidden');
   }

}

function highlighCurrentRequest() {
   var session = sense.editor.getSession();
   var new_current_req_range = sense.utils.getCurrentRequestRange();
   if ((new_current_req_range == null && CURRENT_REQ_RANGE == null) ||
      (new_current_req_range != null && CURRENT_REQ_RANGE != null &&
         new_current_req_range.start.row == CURRENT_REQ_RANGE.start.row &&
         new_current_req_range.end.row == CURRENT_REQ_RANGE.end.row
         )
      )
      return; // nothing to do..

   if (CURRENT_REQ_RANGE) {
      session.removeMarker(CURRENT_REQ_RANGE.marker_id);
   }

   CURRENT_REQ_RANGE = new_current_req_range;
   if (CURRENT_REQ_RANGE) {
      CURRENT_REQ_RANGE.marker_id = session.addMarker(CURRENT_REQ_RANGE, "ace_snippet-marker", "text");
   }
   updateEditorActionsBar();
}

function moveToPreviousRequestEdge() {
   var pos = sense.editor.getCursorPosition();
   for (pos.row--; pos.row > 0 && !sense.utils.isRequestEdge(pos.row); pos.row--) {
   }
   sense.editor.moveCursorTo(pos.row, 0);
}


function moveToNextRequestEdge() {
   var pos = sense.editor.getCursorPosition();
   var maxRow = sense.editor.getSession().getLength();
   for (pos.row++; pos.row < maxRow && !sense.utils.isRequestEdge(pos.row); pos.row++) {
   }
   sense.editor.moveCursorTo(pos.row, 0);
}

function init() {

   sense.editor = ace.edit("editor");
   ace.require("ace/mode/sense");
   sense.editor.getSession().setMode("ace/mode/sense");
   sense.editor.setShowPrintMargin(false);
   sense.editor.getSession().setFoldStyle('markbeginend');
   sense.editor.getSession().setUseWrapMode(true);
   sense.editor.commands.addCommand({
      name: 'autocomplete',
      bindKey: {win: 'Ctrl-Space', mac: 'Ctrl-Space'},
      exec: sense.autocomplete.editorAutocompleteCommand
   });
   sense.editor.commands.addCommand({
      name: 'indent request',
      bindKey: {win: 'Ctrl-I', mac: 'Command-I'},
      exec: reformat
   });
   sense.editor.commands.addCommand({
      name: 'unindent request',
      bindKey: {win: 'Ctrl-Shift-I', mac: 'Command-Shift-I'},
      exec: function () {
         reformat(false);
      }
   });
   sense.editor.commands.addCommand({
      name: 'send to elasticsearch',
      bindKey: {win: 'Ctrl-Enter', mac: 'Command-Enter'},
      exec: submitCurrentRequestToES
   });

   sense.editor.commands.addCommand({
      name: 'copy as cUrl',
      bindKey: {win: 'Ctrl-Shift-C', mac: 'Command-Shift-C'},
      exec: copyAsCURL
   });

   sense.editor.commands.addCommand({
      name: 'move to previous request start or end',
      bindKey: {win: 'Ctrl-Up', mac: 'Command-Up'},
      exec: moveToPreviousRequestEdge
   });

   sense.editor.commands.addCommand({
      name: 'move to next request start or end',
      bindKey: {win: 'Ctrl-Down', mac: 'Command-Down'},
      exec: moveToNextRequestEdge
   });

   var orig_paste = sense.editor.onPaste;
   sense.editor.onPaste = function (text) {
      if (text && sense.curl.detectCURL(text)) {
         handleCURLPaste(text);
         return;
      }
      orig_paste.call(this, text);
   };

   sense.editor.getSession().selection.on('changeCursor', function (e) {
      setTimeout(highlighCurrentRequest, 100);
   });

   var save_generation = 0;

   function get_save_callback(for_generation) {
      return function () {
         if (save_generation == for_generation) {
            saveEditorState();
         }
      }
   }

   sense.editor.getSession().on("change", function (e) {
      setTimeout(get_save_callback(++save_generation), 500);
   });

   sense.editor.getSession().on("changeScrollTop", updateEditorActionsBar);


   sense.output = ace.edit("output");
   sense.output.getSession().setMode("ace/mode/json");
   sense.output.getSession().setFoldStyle('markbeginend');
   sense.output.setTheme("ace/theme/monokai");
   sense.output.getSession().setUseWrapMode(true);
   sense.output.setShowPrintMargin(false);
   sense.output.setReadOnly(true);

   var editorElement = $("#editor"),
      outputElement = $("#output"),
      editorActions = $("#editor_actions");


   editorElement.resizable(
      {
         autoHide: false,
         handles: 'e',
         start: function (e, ui) {
            editor_resizebar = $(".ui-resizable-e").addClass("active");
         },
         stop: function (e, ui) {
            editor_resizebar = $(".ui-resizable-e").removeClass("active");

            var parent = ui.element.parent();
            var editorSize = ui.element.outerWidth();
            outputElement.css("left", editorSize);
            editorActions.css("margin-right", -editorSize + 3);
            sense.editor.resize(true);
            sense.output.resize(true);
         }
      });

   sense.history.init();
   sense.autocomplete.init();

   $("#send").tooltip();
   $("#send").click(function () {
      submitCurrentRequestToES();
      return false;
   });

   $("#copy_as_curl").click(function (e) {
      copyAsCURL();
      e.preventDefault();
   });

   $("#auto_indent").click(function (e) {
      reformat();
      e.preventDefault();
   });

   $("#unindent").click(function (e) {
      reformat(false);
      e.preventDefault();
   });

   var es_server = $("#es_server");

   es_server.blur(function () {
      sense.mappings.notifyServerChange(es_server.val());
   });

   var last_editor_state = sense.history.getSavedEditorState();
   if (last_editor_state) {
      resetToValues(last_editor_state.server, last_editor_state.content);
   }
   else {
      reformat();

   }
   sense.editor.focus();
   updateEditorActionsBar();

   var help_popup = $("#help_popup");

   help_popup.on('shown', function () {
      _gaq.push(['_trackEvent', "help", 'shown']);
      $('<div id="example_editor">PUT index/type/1\n'
         + '{\n'
         + '   "body": "here"\n'
         + '}\n\n'
         + 'GET index/type/1\n'
         + '</div>').appendTo(help_popup.find("#example_editor_container"));

      var example_editor = ace.edit("example_editor");
      example_editor.getSession().setMode("ace/mode/sense");
      example_editor.getSession().setFoldStyle('markbeginend');
      example_editor.setReadOnly(true);
      example_editor.renderer.setShowPrintMargin(false);
   });

   help_popup.on('hidden', function () {
      help_popup.find('#example_editor').remove();

   });

}

$(document).ready(init);

/* google analytics */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-11830182-16']);
_gaq.push(['_setCustomVar',
   1,                // This custom var is set to slot #1.  Required parameter.
   'Version',    // The name of the custom variable.  Required parameter.
   '0.8.1',        // The value of the custom variable.  Required parameter.
   1                 // Sets the scope to visitor-level.  Optional parameter.
]);

_gaq.push(['_trackPageview']);

(function () {
   var ga = document.createElement('script');
   ga.type = 'text/javascript';
   ga.async = true;
   ga.src = 'https://ssl.google-analytics.com/ga.js';
   var s = document.getElementsByTagName('script')[0];
   s.parentNode.insertBefore(ga, s);
})();

