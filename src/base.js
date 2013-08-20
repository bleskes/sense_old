if (!sense)
   sense = {
      "editor": null,
      "output": null
   };


function resetToValues(server, endpoint, method, data) {
   if (server != null) {
      $("#es_server").val(server);
      sense.mappings.notifyServerChange(server);
   }
   if (endpoint != null) {
      $("#es_endpoint").val(endpoint).change();
   }
   if (method != null) $("#es_method").val(method).change();
   if (data != null) sense.editor.getSession().setValue(data);
   sense.output.getSession().setValue("");

}

function constructESUrl(server, endpoint) {
   if (server.indexOf("://") < 0) server = "http://" + server;
   server = server.trim("/");
   if (endpoint.charAt(0) === "/") endpoint = endpoint.substr(1);

   return server + "/" + endpoint;
}

function callES(server, endpoint, method, data, successCallback, completeCallback) {

   var url = constructESUrl(server, endpoint);
   var uname_password_re = /^(https?:\/\/)?(?:(?:(.*):)?(.*?)@)?(.*)$/;
   var url_parts = url.match(uname_password_re);

   var uname = url_parts[2];
   var password = url_parts[3];
   url = url_parts[1] + url_parts[4];
   console.log("Calling " + url + "  (uname: " + uname + " pwd: " + password + ")");

   $.ajax({
      url: url,
      data: method == "GET" ? null : data,
      password: password,
      username: uname,
      type: method,
      complete: completeCallback,
      success: successCallback
   });
}

function submitEditorValueToES() {
   sense.output.getSession().setValue('{ "__mode__" : "Calling ES...." }');


   var es_server = $("#es_server").val(),
      es_endpoint = $("#es_endpoint").val(),
      es_method = $("#es_method").val(),
      es_data = es_method == "GET" ? null : sense.editor.getValue();

   callES(es_server, es_endpoint, es_method, es_data, null, function (xhr, status) {
         if (typeof xhr.status == "number" &&
            ((xhr.status >= 400 && xhr.status < 600) ||
               (xhr.status >= 200 && xhr.status < 300)
               )) {
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
   );

   _gaq.push(['_trackEvent', "elasticsearch", 'query']);
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


function copyToClipboard(value) {
   var clipboardStaging = $("#clipboardStaging");
   clipboardStaging.val(value);
   clipboardStaging.select();
   document.execCommand("Copy");
}

function copyAsCURL() {

   _gaq.push(['_trackEvent', "curl", 'copied']);
   var es_server = $("#es_server").val(),
      es_endpoint = $("#es_endpoint").val(),
      es_method = $("#es_method").val(),
      es_data = sense.editor.getValue();

   var url = constructESUrl(es_server, es_endpoint);

   var curl = 'curl -X' + es_method + ' "' + url + '"';
   if (es_data) curl += " -d'\n" + es_data + "'";

   //console.log(curl);
   copyToClipboard(curl);
}

function prettyPrintJSON() {

   _gaq.push(['_trackEvent', "pretty print", 'json']);
   var editorSession = sense.editor.getSession(), outData;
   try {
      outData = JSON.parse(editorSession.getValue());
   } catch(e) {
      alert('unable to parse json');
      return;
   }
   editorSession.setValue(
      JSON.stringify(outData, null, editorSession.getTabString())
   );
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

   resetToValues(curlInput.server, curlInput.endpoint, curlInput.method, curlInput.data);

}

function init() {

   sense.editor = ace.edit("editor");
   ace.require("ace/mode/json");
   sense.editor.getSession().setMode("ace/mode/sense-json");

   sense.editor.getSession().setFoldStyle('markbeginend');
   sense.editor.getSession().setUseWrapMode(true);
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
      exec: submitEditorValueToES
   });

   sense.editor.commands.addCommand({
      name: 'copy as cUrl',
      bindKey: {win: 'Ctrl-Shift-C', mac: 'Command-Shift-C'},
      exec: copyAsCURL
   });

   var orig_paste = sense.editor.onPaste;
   sense.editor.onPaste = function (text) {
      if (text && sense.curl.detectCURL(text)) {
         handleCURLPaste(text);
         return;
      }
      orig_paste.call(this, text);
   };

   sense.output = ace.edit("output");
   sense.output.getSession().setMode("ace/mode/json");
   sense.output.getSession().setFoldStyle('markbeginend');
   sense.output.setTheme("ace/theme/monokai");
   sense.output.getSession().setUseWrapMode(true);
   sense.output.renderer.setShowPrintMargin(false);
   sense.output.setReadOnly(true);


   sense.history.init();
   sense.autocomplete.init();


   $("#send").click(function () {
      submitEditorValueToES();
      return false;
   });

   $("#copy_as_curl").click(function (e) {
      copyAsCURL();
      e.preventDefault();
   });

   $("#pretty_print").click(function (e) {
      prettyPrintJSON();
      e.preventDefault();
   });

   var es_server = $("#es_server");

   es_server.blur(function () {
      sense.mappings.notifyServerChange(es_server.val());
   });

   var last_history_elem = sense.history.getLastHistoryElement();
   if (last_history_elem) {
      sense.history.applyHistoryElement(last_history_elem, true);
   }
   else {
      reformat();
      es_server.focus();
   }
   es_server.blur();

   var es_method = $("#es_method");
   var overlay = $("#editor_overlay");
   es_method.change(function () {
      if (es_method.val() == "GET") {
         overlay.show();
         sense.output.setReadOnly(true);
      } else {
         sense.output.setReadOnly(false);
         overlay.hide();
      }

   });

   es_method.change();

}

$(document).ready(init);

/* google analytics */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-11830182-16']);
_gaq.push(['_setCustomVar',
   1,                // This custom var is set to slot #1.  Required parameter.
   'Version',    // The name of the custom variable.  Required parameter.
   '0.8.0',        // The value of the custom variable.  Required parameter.
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

