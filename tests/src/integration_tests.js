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

module("Integration", {
   setup: function () {
      if (!global.sense)
         global.sense = {};
      var sense = global.sense;

      sense.tests = {};
      sense.tests.editor_div = $('<div id="editor"></div>').appendTo($('body'));
      sense.tests.editor = ace.edit("editor");
      ace.require("ace/mode/json");
      sense.tests.editor.getSession().setMode("ace/mode/sense");
      sense.tests.editor.getSession().setValue("hello");

   },

   teardown: function () {
      sense.tests.editor_div.remove();
      sense.tests = {};
   }
});

function process_context_test(data, mapping, kb_schemes, endpoint, test) {
   QUnit.asyncTest(test.name, function () {
      var autocomplete = global.sense.autocomplete;
      var editor = global.sense.tests.editor;
      var rowOffset = 1; // add one for the extra method line
      editor.getSession().setValue("POST " + endpoint + "\n" + data);
      editor.moveCursorTo(test.cursor.row + rowOffset, test.cursor.column);

      global.sense.mappings.clear();
      global.sense.mappings.loadMappings(mapping);

      global.sense.kb.clear();
      if (kb_schemes) {
         if (kb_schemes.globals)
            $.each(kb_schemes.globals, function (parent, rules) {
               global.sense.kb.addGlobalAutocompleteRules(parent, rules);
            });
         if (kb_schemes.endpoints)
            $.each(kb_schemes.endpoints, function (endpoint, scheme) {
               global.sense.kb.addEndpointDescription(endpoint, scheme);
            });
      }

      callWhenEditorIsUpdated(function () {
         var context = autocomplete.test.getAutoCompleteContext(editor);

         assert.ok(test.no_context ? !context : context, "failed to have a context ...");

         if (!context) {
            start();
            return;
         }

         context.initialValue = autocomplete.test.getAutoCompleteValueFromToken(context.updatedForToken);


         function ac(prop, prop_test) {
            if (typeof test[prop] != "undefined")
               if (prop_test)
                  prop_test(context[prop], test[prop], prop);
               else
                  assert.deepEqual(context[prop], test[prop], prop + " element of context are equal");
         }

         function pos_compare(actual, expected, name) {
            assert.equal(actual.row, expected.row + rowOffset, "row of " + name + " position is not as expected");
            assert.equal(actual.column, expected.column, "column of " + name + " position is not as expected");
         }

         function range_compare(actual, expected, name) {
            pos_compare(actual.start, expected.start, name + ".start");
            pos_compare(actual.end, expected.end, name + ".end");
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

function context_tests(data, mapping, kb_schemes, endpoint, tests) {
   if (typeof data != "string") data = JSON.stringify(data, null, 3);
   for (var t = 0; t < tests.length; t++) {
      process_context_test(data, mapping, kb_schemes, endpoint, tests[t]);
   }
}

SEARCH_KB = {
   endpoints: {
      _search: {
         data_autocomplete_rules: {
            query: { match_all: {}, term: { "$FIELD$": ""}},
            size: {},
            facets: { "*": { terms: { field: "$FIELD$" }}, __template: {}}
         }
      }}
};

MAPPING = {
   "index1": {
      "type1.1": {
         "properties": {
            "field1.1.1": { "type": "string" },
            "field1.1.2": { "type": "string" }
         }
      }
   },
   "index2": {
      "type2.1": {
         "properties": {
            "field2.1.1": { "type": "string" },
            "field2.1.2": { "type": "string" }
         }
      }
   }
};

context_tests(
   {},
   MAPPING,
   SEARCH_KB,
   "_search",
   [
      {
         name: "Empty doc",
         cursor: { row: 0, column: 1},
         initialValue: "",
         addTemplate: true,
         prefixToAdd: "",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 0, column: 1 }, end: { row: 0, column: 1 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      }
   ]
);

context_tests(
   {},
   MAPPING,
   SEARCH_KB,
   "_no_context",
   [
      {
         name: "Missing KB",
         cursor: { row: 0, column: 1},
         no_context: true
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
   MAPPING,
   SEARCH_KB,
   "_search",
   [
      {
         name: "existing dictionary key, no template",
         cursor: { row: 1, column: 6},
         initialValue: "query",
         addTemplate: false,
         prefixToAdd: "",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 1, column: 3 }, end: { row: 1, column: 10 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      },
      {
         name: "existing inner dictionary key",
         cursor: { row: 2, column: 7},
         initialValue: "field",
         addTemplate: false,
         prefixToAdd: "",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 2, column: 6}, end: { row: 2, column: 13 }},
         autoCompleteSet: { completionTerms: ["match_all", "term"]}
      },
      {
         name: "existing dictionary key, yes template",
         cursor: { row: 4, column: 7},
         initialValue: "facets",
         addTemplate: true,
         prefixToAdd: "",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 4, column: 3 }, end: { row: 4, column: 15 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      }
   ]
);

context_tests(
   '{\n\
       "query": {\n\
         "field": "something"\n\
       },\n\
       "facets": {},\n\
       "size": 20 \n\
   }',
   MAPPING,
   SEARCH_KB,
   "_search",
   [
      {
         name: "trailing comma, end of line",
         cursor: { row: 4, column: 21},
         initialValue: "",
         addTemplate: true,
         prefixToAdd: "",
         suffixToAdd: ", ",
         rangeToReplace: { start: { row: 4, column: 20 }, end: { row: 4, column: 20 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      },
      {
         name: "trailing comma, beginning of line",
         cursor: { row: 5, column: 1},
         initialValue: "",
         addTemplate: true,
         prefixToAdd: "",
         suffixToAdd: ", ",
         rangeToReplace: { start: { row: 5, column: 1 }, end: { row: 5, column: 1 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      },
      {
         name: "prefix comma, beginning of line",
         cursor: { row: 6, column: 0},
         initialValue: "",
         addTemplate: true,
         prefixToAdd: ", ",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 6, column: 0 }, end: { row: 6, column: 0 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      },
      {
         name: "prefix comma, end of line",
         cursor: { row: 5, column: 21},
         initialValue: "",
         addTemplate: true,
         prefixToAdd: ", ",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 5, column: 18 }, end: { row: 5, column: 18 }},
         autoCompleteSet: { completionTerms: ["facets", "query", "size"]}
      }

   ]
);

context_tests(
   {
      "object": 1,
      "array": 1,
      "value_one_of": 1,
      "value": 2
   },
   MAPPING,
   {
      endpoints: {
         _test: {
            data_autocomplete_rules: {
               object: { bla: 1 },
               array: [ 1 ],
               value_one_of: { __one_of: [ 1, 2]},
               value: 3
            }
         }}
   },
   "_test",
   [
      {
         name: "not matching object when { is not opened",
         cursor: { row: 1, column: 12},
         initialValue: "",
         autoCompleteSet: { completionTerms: ["{"] }
      },
      {
         name: "not matching array when [ is not opened",
         cursor: { row: 2, column: 12},
         initialValue: "",
         autoCompleteSet: { completionTerms: ["["] }
      },
      {
         name: "matching value with one_of",
         cursor: { row: 3, column: 19},
         initialValue: "",
         autoCompleteSet: { completionTerms: [ 1, 2] }
      },
      {
         name: "matching value",
         cursor: { row: 4, column: 12},
         initialValue: "",
         autoCompleteSet: { completionTerms: [ 3 ] }
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
   MAPPING,
   SEARCH_KB,
   "_search",
   [
      {
         name: "$FIELD$ matching",
         cursor: { row: 5, column: 15},
         initialValue: "",
         addTemplate: true,
         prefixToAdd: "",
         suffixToAdd: "",
         rangeToReplace: { start: { row: 5, column: 15 }, end: { row: 5, column: 15 }},
         autoCompleteSet: { completionTerms: ["terms"] }
      }
//      , made redundent by inline auto complete. Still need to find a solution for templates
//      {
//         name: "$FIELD$ options",
//         cursor: { row: 5, column: 7},
//         initialValue: "name",
//         addTemplate: true,
//         prefixToAdd: "",
//         suffixToAdd: "",
//         autoCompleteSet: { completionTerms: [] }
//      }
   ]
);

context_tests(
   {
      "index": "123"
   },
   MAPPING,
   {
      endpoints: {
         _test: {
            data_autocomplete_rules: {
               index: "$INDEX$"
            }
         }}
   },
   "_test",
   [
      {
         name: "$INDEX$ matching",
         cursor: { row: 1, column: 15},
         autoCompleteSet: { completionTerms: ["index1", "index2"] }
      }
   ]
);

context_tests(
   {
      "array": [
         "a"
      ],
      "oneof": "1"
   },
   MAPPING,
   {
      endpoints: {
         _endpoint: {
            data_autocomplete_rules: {
               array: [ "a", "b"],
               number: 1,
               object: {},
               fixed: { __template: { "a": 1 }},
               oneof: { __one_of: [ "o1", "o2"]}
            }
         }
      }
   },
   "_endpoint",
   [
      {
         name: "Templates 1",
         cursor: { row: 1, column: 0},
         autoCompleteSet: { completionTerms: ["array", "fixed", "number", "object", "oneof"],
            templateByTerm: { array: [ "a" ], number: 1, object: {}, fixed: { a: 1}, oneof: "o1" }}
      },
      {
         name: "Templates - one off",
         cursor: { row: 4, column: 12},
         autoCompleteSet: { completionTerms: ["o1", "o2"],
            templateByTerm: { }
         }
      }
   ]
);


context_tests(
   {
      "any_of_numbers": [
         1
      ],
      "any_of_obj": [
         {
            "a": 1
         }
      ]
   },
   MAPPING,
   {
      endpoints: {
         _endpoint: {
            data_autocomplete_rules: {
               any_of_numbers: { __template: [1, 2], __any_of: [1, 2, 3]},
               any_of_obj: { __template: [
                  { c: 1}
               ], __any_of: [
                  { a: 1, b: 2 },
                  {c: 1}
               ]}
            }
         }
      }
   },
   "_endpoint",
   [
      {
         name: "Any of - templates",
         cursor: { row: 1, column: 0},
         autoCompleteSet: { completionTerms: ["any_of_numbers", "any_of_obj"],
            templateByTerm: { any_of_numbers: [ 1, 2 ], any_of_obj: [
               { c: 1}
            ]}
         }
      },
      {
         name: "Any of - numbers",
         cursor: { row: 2, column: 2},
         autoCompleteSet: { completionTerms: [1, 2, 3],
            templateByTerm: { }
         }
      },
      {
         name: "Any of - object",
         cursor: { row: 6, column: 2},
         autoCompleteSet: { completionTerms: ["a", "b"],
            templateByTerm: { a: 1, b: 2 }
         }
      }
   ]
);

context_tests(
   {

   },
   MAPPING,
   {
      endpoints: {
         _endpoint: {
            data_autocomplete_rules: {
               "query": ""
            }
         }}},
   "_endpoint",
   [
      {
         name: "Empty string as default",
         cursor: { row: 0, column: 1},
         autoCompleteSet: { completionTerms: ["query"],
            templateByTerm: { query: ""}}
      }
   ]
);

context_tests(
   {
      "a": {
         "b": {},
         "c": {},
         "d": {},
         "e": {},
         "f": [
            {}
         ]
      }
   },
   MAPPING,
   {
      globals: {
         gtarget: {
            t1: 2
         }
      },
      endpoints: {
         _current: {

            _id: "_current",
            data_autocomplete_rules: {
               "a": {
                  "b": {
                     __scope_link: ".a"
                  },
                  "c": {
                     __scope_link: "ext.target"
                  },
                  "d": {
                     __scope_link: "GLOBAL.gtarget"
                  },
                  "e": {
                     __scope_link: "ext"
                  },
                  "f": [
                     {
                        __scope_link: "ext.target"
                     }
                  ]
               }
            }},

         ext: {
            data_autocomplete_rules: {
               target: {
                  t2: 1
               }
            }}
      }
   },
   "_current",
   [
      {
         name: "Relative scope link test",
         cursor: { row: 2, column: 12},
         autoCompleteSet: { completionTerms: ["b", "c", "d", "e", "f"],
            templateByTerm: { b: {}, c: {}, d: {}, e: {}, f: [
               {}
            ]}}
      },
      {
         name: "External scope link test",
         cursor: { row: 3, column: 12},
         autoCompleteSet: { completionTerms: ["t2"],
            templateByTerm: { t2: 1}}
      },
      {
         name: "Global scope link test",
         cursor: { row: 4, column: 12},
         autoCompleteSet: { completionTerms: ["t1"],
            templateByTerm: { t1: 2}}
      },
      {
         name: "Entire endpoint scope link test",
         cursor: { row: 5, column: 12},
         autoCompleteSet: { completionTerms: ["target"],
            templateByTerm: { target: {}}}
      },
      {
         name: "A scope link within an array",
         cursor: { row: 7, column: 10},
         autoCompleteSet: { completionTerms: ["t2"],
            templateByTerm: { t2: 1}}
      }
   ]
);

context_tests(
   {
      "a": {}
   },
   MAPPING,
   {
      endpoints: {
         _endpoint: {
            data_autocomplete_rules: {
               "a": {},
               "b": {}
            }
         }}},
   "_endpoint",
   [
      {
         name: "Path after empty object",
         cursor: { row: 1, column: 10},
         autoCompleteSet: { completionTerms: ["a", "b"] }
      }
   ]
);

context_tests(
   {
      "": {}
   },
   MAPPING,
   SEARCH_KB,
   "_search",
   [
      {
         name: "Replace an empty string",
         cursor: { row: 1, column: 4},
         rangeToReplace: { start: { row: 1, column: 3 }, end: { row: 1, column: 9 }}
      }
   ]
);

context_tests(
   {
      "a": [
         {
            "c": {}
         }
      ]
   },
   MAPPING,
   {
      endpoints: {
         _endpoint: {
            data_autocomplete_rules: {
               "a": [
                  { b: 1}
               ]
            }
         }}},
   "_endpoint",
   [
      {
         name: "List of objects - internal autocomplete",
         cursor: { row: 3, column: 10},
         autoCompleteSet: { completionTerms: ["b"] }
      },
      {
         name: "List of objects - external template",
         cursor: { row: 0, column: 1},
         autoCompleteSet: { completionTerms: ["a"], templateByTerm: { a: [
            {}
         ]} }
      }
   ]
);

context_tests(
   {
      "query": {
         "term": {
            "field": "something"
         }
      },
      "facets": {
         "test": {
            "terms": {
               "field": "test"
            }
         }
      },
      "size": 20
   },
   MAPPING,
   SEARCH_KB,
   "index1/_search",
   [
      {
         name: "Field completion as scope",
         cursor: { row: 3, column: 10},
         autoCompleteSet: { completionTerms: ["field1.1.1", "field1.1.2"]}
      },
      {
         name: "Field completion as value",
         cursor: { row: 9, column: 23},
         autoCompleteSet: { completionTerms: ["field1.1.1", "field1.1.2"]}
      }
   ]
);


context_tests(
   "",
   MAPPING,
   SEARCH_KB,
   "_search",
   [
      {
         name: "initial doc start",
         cursor: { row: 1, column: 0},
         autoCompleteSet: { completionTerms: ["{"]},
         prefixToAdd: "", suffixToAdd: ""
      }
   ]
);

test("Test endpoint auto complete", function () {
   global.sense.kb.clear();
   global.sense.kb.addEndpointDescription("_multi_indices", {
      indices_mode: "multi"
   });
   global.sense.kb.addEndpointDescription("_one_or_more_indices", {
      indices_mode: "required_multi"
   });
   global.sense.kb.addEndpointDescription("_single_index", {
      match: "_single_index",
      endpoint_autocomplete: [
         "_single_index"
      ],
      indices_mode: "single"
   });
   global.sense.kb.addEndpointDescription("_no_index", {
      indices_mode: "none"
   });

   global.sense.mappings.clear();
   global.sense.mappings.loadMappings(MAPPING);
   global.sense.mappings.loadAliases({
      index1: {
         aliases: {
            alias1: {}
         }
      },
      index2: {
         aliases: {
            alias1: {}
         }
      }
   });

   deepEqual(global.sense.autocomplete.getEndpointAutoCompleteList("").sort(),
      ["_multi_indices", "_no_index", "alias1", "index1", "index2"]
   );
   deepEqual(global.sense.autocomplete.getEndpointAutoCompleteList("/index1,").sort(),
      ["/index1,alias1", "/index1,index1", "/index1,index2"]
   );
   deepEqual(global.sense.autocomplete.getEndpointAutoCompleteList("/index1/ty").sort(),
      ["/index1/type1.1"]
   );
   deepEqual(global.sense.autocomplete.getEndpointAutoCompleteList("/index1/_").sort(),
      ["/index1/_multi_indices", "/index1/_one_or_more_indices", "/index1/_single_index"]
   );
   deepEqual(global.sense.autocomplete.getEndpointAutoCompleteList("/alias1/_").sort(),
      ["/alias1/_multi_indices", "/alias1/_one_or_more_indices"]
   );
   deepEqual(global.sense.autocomplete.getEndpointAutoCompleteList("_").sort(),
      ["_multi_indices", "_no_index"]
   );
});


