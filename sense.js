

function callES() {
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
         output.getSession(). setValue(value);
       }
       else {
         output.setValue("Request failed to get to the server: " + status);
       }

     }
  })
}