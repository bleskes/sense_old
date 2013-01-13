sense.kb.addGlobalAutocompleteRules("query", {
  term: { __template: { "FIELD": "VALUE" }},
  terms: { minimum_match: {}},
  match_all: {},
  match: {},
  filtered: {
    query: {},
    filter: {}
  },
  ids: { type: {}, values: {} },
  bool: {
    must: {},
    must_not: {},
    should: {},
    minimum_number_should_match: {},
    boost: {}
  },
  field: {
    "*": {
      query: {}, boost: {}, enable_position_increments: {}
    } }
});

sense.kb.addGlobalAutocompleteRules("highlight", {
      pre_tags: {}, post_tags: {}, tags_schema: {},
      fields: { "*": { "fragment_size": {}, "number_of_fragments": {} }}
    }
);
