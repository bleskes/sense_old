var global = window;

module("Mappings", {
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


test("Multi fields", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "first_name": {
            "type": "multi_field",
            "path": "just_name",
            "fields": {
              "first_name": {"type": "string", "index": "analyzed"},
              "any_name": {"type": "string", "index": "analyzed"}
            }
          },
          "last_name": {
            "type": "multi_field",
            "path": "just_name",
            "fields": {
              "last_name": {"type": "string", "index": "analyzed"},
              "any_name": {"type": "string", "index": "analyzed"}
            }
          }
        }
      }}
  });

  deepEqual(global.sense.mappings.getFields("index"), ["any_name", "first_name", "last_name" ]);
});

test("Simple fields", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "str": {
            "type": "string"
          },
          "number": {
            "type": "int"
          }
        }
      }}
  });

  deepEqual(global.sense.mappings.getFields("index"), ["number", "str" ]);
});


test("Nested fields", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "person": {
            "type": "object",
            "properties": {
              "name": {
                "properties": {
                  "first_name": {"type": "string"},
                  "last_name": {"type": "string"}
                }
              },
              "sid": {"type": "string", "index": "not_analyzed"}
            }
          },
          "message": {"type": "string"}
        }
      }
    }});

  deepEqual(global.sense.mappings.getFields("index", ["tweet"]),
      ["message", "person.name.first_name", "person.name.last_name", "person.sid" ]);
});

test("Enabled fields", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "tweet": {
        "properties": {
          "person": {
            "type": "object",
            "properties": {
              "name": {
                "type": "object",
                "enabled": false
              },
              "sid": {"type": "string", "index": "not_analyzed"}
            }
          },
          "message": {"type": "string"}
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getFields("index", ["tweet"]),
      ["message", "person.sid" ]);
});


test("Path tests", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "person": {
        "properties": {
          "name1": {
            "type": "object",
            "path": "just_name",
            "properties": {
              "first1": {"type": "string"},
              "last1": {"type": "string", "index_name": "i_last_1"}
            }
          },
          "name2": {
            "type": "object",
            "path": "full",
            "properties": {
              "first2": {"type": "string"},
              "last2": {"type": "string", "index_name": "i_last_2"}
            }
          }
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getFields(),
      ["first1", "i_last_1", "name2.first2", "name2.i_last_2" ]);
});

test("Use index_name tests", function () {
  global.sense.mappings.loadMappings({
    "index": {
      "person": {
        "properties": {
          "last1": {"type": "string", "index_name": "i_last_1"}
        }
      }
    }
  });

  deepEqual(global.sense.mappings.getFields(),
      [ "i_last_1" ]);
});
