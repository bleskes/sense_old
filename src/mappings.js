(function () {

  var global = window;

  var currentServer;
  var per_index_types = {};


  function getFields(indices, types) {
    // get fields for indices and types. Both can be a list, a string or null (meaning all).
    var ret = [];
    if (typeof indices == "string") {
      var type_dict = per_index_types[indices];
      if (!type_dict) return [];

      if (typeof types == "string") {
        var f = type_dict[types];
        ret = f ? f : [];
      }
      else {
        // filter what we need
        $.each(type_dict, function (type, fields) {
          if (!types || $.inArray(type, types) != -1)
            ret.push(fields);
        });

        ret = [].concat.apply([], ret);
      }
    }
    else {
      // multi index mode.
      $.each(per_index_types, function (index) {
        ret.push(getFields(index, types));
      });
      ret = [].concat.apply([], ret);
    }

    ret.sort();

    return ret;
  }

  function getIndices() {
    var ret = [];
    $.each(per_index_types, function (index) {
      ret.push(index);
    });
    return ret;
  }

  function getFieldNamesFromFieldMapping(field_name, field_mapping) {
    if (field_mapping['enabled'] == false) return [];


    function applyPathSettings(nested_field_names) {
      var path_type = field_mapping['path'] || "full";
      if (path_type == "full") {
        return $.map(nested_field_names, function (f) {
          return field_name + "." + f;
        });
      }
      return nested_field_names;
    }

    if (field_mapping["properties"]) {
      // derived object type
      var nested_fields = getFieldNamesFromTypeMapping(field_mapping);
      return applyPathSettings(nested_fields);
    }

    if (field_mapping['type'] == 'multi_field') {
      var nested_fields = $.map(field_mapping['fields'], function (field_mapping, field_name) {
        return getFieldNamesFromFieldMapping(field_name, field_mapping);
      });

      return applyPathSettings(nested_fields);
    }

    if (field_mapping["index_name"]) return [field_mapping["index_name"]];

    return [field_name];
  }

  function getFieldNamesFromTypeMapping(type_mapping) {
    var field_list =
        $.map(type_mapping['properties'], function (field_mapping, field_name) {
          return getFieldNamesFromFieldMapping(field_name, field_mapping);
        });
    return $.unique(field_list);
  }

  function loadMappings(mappings) {
    per_index_types = {};
    $.each(mappings, function (index, index_mapping) {
      var normalized_index_mappings = {};
      $.each(index_mapping, function (type_name, type_mapping) {
        var field_list = getFieldNamesFromTypeMapping(type_mapping);
        normalized_index_mappings[type_name] = field_list;
      });
      per_index_types[index] = normalized_index_mappings;
    });


  }

  function notifyServerChange(newServer) {
    currentServer = newServer;
    var url = newServer + "/_mapping";
    console.log("Calling " + url);
    $.ajax({
      url: url,
      method: "GET",
      success: function (data, status, xhr) {
        loadMappings(data);
      }
    });

    setTimeout(function () {
      notifyServerChange(newServer);
    }, 60);
  }

  if (!global.sense) global.sense = {};
  global.sense.mappings = {};
  global.sense.mappings.getFields = getFields;
  global.sense.mappings.getIndices = getIndices;
  global.sense.mappings.loadMappings = loadMappings;

})();