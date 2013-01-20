var global = window;

function callWhenEditorIsUpdated(callback) {
  function f() {
    if (global.sense.tests.editor.$highlightPending) {
      setTimeout(f, 150);
    }
    else
      callback();
  }

  f();
}

module("Autocomplete", {
  setup: function () {
    if (!global.sense)
      global.sense = {};
    var sense = global.sense;

    // fake history module
    sense.kb = {};
    sense.kb.getGlobalAutocompleteRules = function () {
      return {}
    };

    sense.tests = {};
    sense.tests.editor_div = $('<div id="editor"></div>').appendTo($('body'));
    sense.tests.editor = ace.edit("editor");
    ace.require("ace/mode/json");
    sense.tests.editor.getSession().setMode("ace/mode/sense-json");
    sense.tests.editor.getSession().setValue("hello");

  },

  teardown: function () {
    sense.tests.editor_div.remove();
    sense.tests = {};
  }
});

function process_context_test(input, autocomplete_scheme, test) {
  QUnit.asyncTest(test.name, function () {
    var autocomplete = global.sense.autocomplete;
    var editor = global.sense.tests.editor;
    editor.getSession().setValue(input);
    editor.moveCursorTo(test.cursor.row, test.cursor.column);

    callWhenEditorIsUpdated(function () {
      autocomplete.setActiveScheme(autocomplete_scheme);
      var context = autocomplete.getAutoCompleteContext(editor);

      function ac(prop, prop_test) {
        if (typeof test[prop] != "undefined")
          if (prop_test)
            prop_test(context[prop], test[prop], prop);
          else
            assert.deepEqual(context[prop], test[prop], prop + " element of context are equal");
      }

      function pos_compare(actual, expected, name) {
        assert.equal(actual.row, expected.row, "row of " + name + " position is not as expected");
        assert.equal(actual.column, expected.column, "column of " + name + " position is not as expected");
      }

      function range_compare(actual, expected, name) {
        pos_compare(actual.start, expected.start, name + ".start");
        pos_compare(actual.end, expected.end, name + ".start");
      }

      function autocompleteset_compare(actual, expected, name) {
        if (typeof expected.completionTerms != "undefined")
          assert.deepEqual(actual.completionTerms, expected.completionTerms,
              name + ".completionTerms are not equal");
        if (typeof expected.templateByTerm != "undefined")
          assert.deepEqual(actual.templateByTerm, expected.templateByTerm,
              name + ".templateByTerm are not equal");

      }

      ac("initialValue");
      ac("prefixToAdd");
      ac("suffixToAdd");
      ac("addTemplate");
      ac("textBoxPosition", pos_compare);
      ac("rangeToReplace", range_compare);
      ac("autoCompleteSet", autocompleteset_compare);

      start();
    });

  });
}

function context_tests(input, autocomplete_scheme, tests) {
  if (typeof input != "string") input = JSON.stringify(input, null, 3);
  for (var t = 0; t < tests.length; t++) {
    process_context_test(input, autocomplete_scheme, tests[t]);
  }
}

SEARCH_SCHEME = {
  data_autocomplete_rules: {
    query: { match_all: {}},
    size: {},
    facets: { "*": { terms: {}}}
  }
};

context_tests(
    {},
    SEARCH_SCHEME,
    [
      {
        name: "Empty doc",
        cursor: { row: 0, column: 1},
        initialValue: "",
        addTemplate: true,
        prefixToAdd: "",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 0, column: 1 }, end: { row: 0, column: 1 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      }
    ]
);

context_tests(
    {
      "query": {
        "field": "something"
      },
      "facets": {},
      "size": 20
    },
    SEARCH_SCHEME,
    [
      {
        name: "existing dictionary key, no template",
        cursor: { row: 1, column: 6},
        initialValue: "query",
        addTemplate: false,
        prefixToAdd: "",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 1, column: 3 }, end: { row: 1, column: 10 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      },
      {
        name: "existing inner dictionary key",
        cursor: { row: 2, column: 7},
        initialValue: "field",
        addTemplate: false,
        prefixToAdd: "",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 2, column: 6}, end: { row: 2, column: 13 }},
        autoCompleteSet: { completionTerms: ["match_all"]}
      },
      {
        name: "existing dictionary key, yes template",
        cursor: { row: 4, column: 7},
        initialValue: "facets",
        addTemplate: true,
        prefixToAdd: "",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 4, column: 3 }, end: { row: 4, column: 15 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      },
      {
        name: "trailing comma, end of line",
        cursor: { row: 4, column: 16},
        initialValue: "",
        addTemplate: true,
        prefixToAdd: "",
        suffixToAdd: ",",
        rangeToReplace: { start: { row: 4, column: 16 }, end: { row: 4, column: 16 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      },
      {
        name: "trailing comma, beginning of line",
        cursor: { row: 4, column: 1},
        initialValue: "",
        addTemplate: true,
        prefixToAdd: "",
        suffixToAdd: ",",
        rangeToReplace: { start: { row: 4, column: 1 }, end: { row: 4, column: 1 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      },
      {
        name: "prefix comma, beginning of line",
        cursor: { row: 6, column: 0},
        initialValue: "",
        addTemplate: true,
        prefixToAdd: ", ",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 6, column: 0 }, end: { row: 6, column: 0 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      },
      {
        name: "prefix comma, end of line",
        cursor: { row: 5, column: 13},
        initialValue: "",
        addTemplate: true,
        prefixToAdd: ", ",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 5, column: 13 }, end: { row: 5, column: 13 }},
        autoCompleteSet: { completionTerms: ["query", "size", "facets"]}
      }

    ]
);

context_tests(
    {
      "query": {
        "field": "something"
      },
      "facets": {
        "name": {}
      },
      "size": 20
    },
    SEARCH_SCHEME,
    [
      {
        name: "* matching",
        cursor: { row: 5, column: 15},
        initialValue: "",
        addTemplate: true,
        prefixToAdd: "",
        suffixToAdd: "",
        rangeToReplace: { start: { row: 5, column: 15 }, end: { row: 5, column: 15 }},
        autoCompleteSet: { completionTerms: ["terms"] }
      }
    ]
);

context_tests(
    {
      "array": [ "a" ]
    },
    {
      data_autocomplete_rules: {
        array: [ "a", "b"],
        number: 1,
        object: {},
        fixed: { __template: { "a": 1 }}
      }
    }
    ,
    [
      {
        name: "Templates 1",
        cursor: { row: 1, column: 0},
        autoCompleteSet: { completionTerms: ["array", "number", "object", "fixed"],
          templateByTerm: { array: [], number: 1, object: {}, fixed: { a: 1}  }}
      }
    ]
);