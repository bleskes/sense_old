
(function () {

  var global = this;

  var history_viewer,history_popup;

  var history = [
  ];

  function populateHistElem(hist_elem) {
    history_viewer.getSession().setValue(hist_elem.data);
    history_popup.find("#hist_url").text(hist_elem.server + hist_elem.endpoint);
    history_popup.find("#hist_method").text(hist_elem.method);
  }

  function applyHistElem(hist_elem) {
    resetToValues(hist_elem.server,hist_elem.endpoint,hist_elem.method,hist_elem.data);
    $("#editor").focus();
  }

  function init() {

    history_popup = $("#history_popup");


    history_popup.on('shown', function () {

      $('<div id="history_viewer">No history available</div>').appendTo(history_popup.find(".modal-body"));

      history_viewer = ace.edit("history_viewer");
      history_viewer.getSession().setMode("ace/mode/json");
      history_viewer.setTheme("ace/theme/monokai");
      history_viewer.getSession().setFoldStyle('markbeginend');
      history_viewer.setReadOnly(true);
      history_viewer.renderer.setShowPrintMargin(false);

      $.each(history,function (i,hist_elem) {
        var li = $('<li><a href="#"><i class="icon-chevron-right"></i><span/></a></li>');
        li.find("span").text(hist_elem.endpoint);
        li.find("a").click(function () {
          history_popup.find('.modal-body .nav li').removeClass("active");
          li.addClass("active");
          populateHistElem(hist_elem);
          return false;
        });

        li.hover(function() {
          populateHistElem(hist_elem);
          return false;
        }, function () {
          history_popup.find(".modal-body .nav li.active a").click();
        });

        li.bind('apply',function () {
          applyHistElem(hist_elem);
        });


        li.appendTo(history_popup.find(".modal-body .nav"));
      });
    });

    history_popup.on('hidden', function () {
      history_popup.find('.modal-body #history_viewer').remove();
      history_popup.find('.modal-body .nav li').remove();
      history_viewer = null;
    });

    history_popup.find(".btn-primary").click(function() {
      history_popup.find(".modal-body .nav li.active").trigger("apply");
    });

  }

  function addToHistory(server,endpoint,method,data) {
    if (history.length >= 20) {
      history.splice(19,history.length-19);
    }
    history.unshift({ 'server': server, 'endpoint': endpoint, 'method': method, 'data' : data });
  }

  global.addToHistory = addToHistory;


  $(document).ready(init);
})();





