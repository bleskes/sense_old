var global = window;

module("Autocomplete", {
  setup: function () {
    if (!global.sense)
      global.sense = {};
    var sense = global.sense;
    sense.tests = {};
  },

  teardown: function () {
    sense.tests = {};
  }
});

test("Endpoint parsing: indices only", function () {

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index/"), {
    indices: ["index"],
    types: [],
    id: undefined,
    endpoint: undefined,
    use_endpoints: true,
    use_indices: false,
    use_types: true,
    autocomplete_value: "",
    autocomplete_prefix: "/index/"
  });

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index"), {
    indices: ["index"],
    types: undefined,
    id: undefined,
    endpoint: undefined,
    use_endpoints: true,
    use_indices: true,
    use_types: false,
    autocomplete_value: "index",
    autocomplete_prefix: "/"
  });

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index1,index2"), {
    indices: ["index1", "index2"],
    types: undefined,
    id: undefined,
    endpoint: undefined,
    use_endpoints: false,
    use_indices: true,
    use_types: false,
    autocomplete_value: "index2",
    autocomplete_prefix: "/index1,"
  });
  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index1,"), {
    indices: ["index1"],
    types: undefined,
    id: undefined,
    endpoint: undefined,
    use_endpoints: false,
    use_indices: true,
    use_types: false,
    autocomplete_value: "",
    autocomplete_prefix: "/index1,"
  });
});

test("Endpoint parsing: indices and types", function () {

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index/type/"), {
    indices: ["index"],
    types: ["type"],
    id: "",
    endpoint: undefined,
    use_endpoints: true,
    use_indices: false,
    use_types: false,
    autocomplete_value: "",
    autocomplete_prefix: "/index/type/"
  });

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index/type"), {
    indices: ["index"],
    types: ["type"],
    id: undefined,
    endpoint: undefined,
    use_endpoints: true,
    use_indices: false,
    use_types: true,
    autocomplete_value: "type",
    autocomplete_prefix: "/index/"
  });

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index1,index2/type1,type2"), {
    indices: ["index1", "index2"],
    types: ["type1", "type2"],
    id: undefined,
    endpoint: undefined,
    use_endpoints: false,
    use_indices: false,
    use_types: true,
    autocomplete_value: "type2",
    autocomplete_prefix: "/index1,index2/type1,"
  });
  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("/index/type1,type2,"), {
    indices: ["index"],
    types: ["type1", "type2"],
    id: undefined,
    endpoint: undefined,
    use_endpoints: false,
    use_indices: false,
    use_types: true,
    autocomplete_value: "",
    autocomplete_prefix: "/index/type1,type2,"
  });
});

test("Endpoint parsing: misc", function () {

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("index/type"), {
    indices: ["index"],
    types: ["type"],
    id: undefined,
    endpoint: undefined,
    use_endpoints: true,
    use_indices: false,
    use_types: true,
    autocomplete_value: "type",
    autocomplete_prefix: "index/"
  });


  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("_endpoint"), {
    indices: undefined,
    types: undefined,
    id: undefined,
    endpoint: "_endpoint",
    use_endpoints: true,
    use_indices: false,
    use_types: false,
    autocomplete_value: "_endpoint",
    autocomplete_prefix: ""
  });

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("index1,index2/_endpoint"), {
    indices: ["index1", "index2"],
    types: undefined,
    id: undefined,
    endpoint: "_endpoint",
    use_endpoints: true,
    use_indices: false,
    use_types: false,
    autocomplete_value: "_endpoint",
    autocomplete_prefix: "index1,index2/"
  });

  deepEqual(global.sense.autocomplete.parseIndicesTypesAndId("index1,index2/type1,type2/1234"), {
    indices: ["index1", "index2"],
    types: ["type1", "type2"],
    id: "1234",
    endpoint: undefined,
    use_endpoints: true,
    use_indices: false,
    use_types: false,
    autocomplete_value: "1234",
    autocomplete_prefix: "index1,index2/type1,type2/"
  });

});
