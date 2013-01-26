sense.kb.addGlobalAutocompleteRules("query", {
  term: { __template: { "FIELD": "VALUE" }},
  terms: { minimum_match: {}},
  match_all: {},
  match: { __template: { "FIELD": "TEXT" },
    "*": {
      "query": "",
      "operator": { __one_of: ["and" , "or"]},
      "type": { __one_of: [ "phrase", "phrase_prefix", "boolean"]},
      "max_expansions": 10,
      "analyzer": "",
      "fuzziness": 1.0,
      "prefix_length": 1
    }  },
  match_phrase: { __template: { "FIELD": "PHRASE" },
    "*": {
      query: "",
      analyzer: ""
    }  },
  match_phrase_prefix: { __template: { "FIELD": "PREFIX" },
    "*": {
      query: "",
      analyzer: "",
      max_expansions: 10,
      prefix_length: 1,
      fuzziness: 0.1
    }  },
  multi_match: { __template: { "query": {}, "fields": [] },
    query: {},
    fields: [],
    use_dis_max: { __template: true, __one_of: [ true, false ]},
    tie_breaker: 0.0
  },
  filtered: {
    query: {},
    filter: {}
  },
  ids: { type: {}, values: {} },
  bool: {
    must: { __scope_link: "query"},
    must_not: { __scope_link: "query"},
    should: [
      { __scope_link: "query" }
    ],
    minimum_number_should_match: 1,
    boost: 1.0
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
