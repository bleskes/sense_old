sense.kb.addGlobalAutocompleteRules("query", {
  term: { __template: { "FIELD": "VALUE" }},
  terms: { minimum_match: {}},
  match_all: {},
  match: { __template: { "FIELD": "TEXT" },
    "$FIELD$": {
      "query": "",
      "operator": { __one_of: ["and" , "or"]},
      "type": { __one_of: [ "phrase", "phrase_prefix", "boolean"]},
      "max_expansions": 10,
      "analyzer": "",
      "fuzziness": 1.0,
      "prefix_length": 1
    }  },
  match_phrase: { __template: { "FIELD": "PHRASE" },
    "$FIELD$": {
      query: "",
      analyzer: ""
    }  },
  match_phrase_prefix: { __template: { "FIELD": "PREFIX" },
    "$FIELD$": {
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
  bool: {
    must: { __scope_link: ".query"},
    must_not: { __scope_link: ".query"},
    should: [
      { __scope_link: ".query" }
    ],
    minimum_number_should_match: 1,
    boost: 1.0
  },
  boosting: {
    positive: { __scope_link: ".query" },
    negative: { __scope_link: ".query" },
    negative_boost: 0.2
  },
  ids: { type: "", values: [] },
  custom_score: {
    __template: { query: {}, script: ""},
    query: {},
    script: "",
    params: {},
    lang: "mvel"
  },
  custom_boost_factor: {
    __template: { query: {}, boost_factor: 1.1 },
    query: {},
    boost_factor: 1.1
  },
  constant_score: {
    __template: { filter: {}, boost: 1.2 },
    query: {},
    filter: {},
    boost: 1.2
  },
  dis_max: {
    __template: { tie_breaker: 0.7, boost: 1.2, queries: []},
    tie_breaker: 0.7,
    boost: 1.2,
    queries: [
      { __scope_link: ".query"}
    ]
  },
  field: {
    "$FIELD$": {
      query: "", boost: 2.0,
      enable_position_increments: { __template: false, __one_of: [ true, false ]}
    } },
  filtered: {
    query: {},
    filter: {}
  },
  fuzzy_like_this: {
    fields: [],
    like_text: "",
    max_query_terms: 12
  },
  flt: {
    __scope_link: ".query.fuzzy_like_this"
  },
  fuzzy: {
    "$FIELD$": {
      "value": "",
      "boost": 1.0,
      "min_similarity": 0.5,
      "prefix_length": 0
    }
  },
  has_child: {
    "type": "$TYPE$",
    "score_type": { __one_of: ["none", "max", "sum", "avg"]},
    "_scope": "",
    "query": {
    }
  },
  has_parent: {
    "parent_type": "$TYPE$",
    "score_type": { __one_of: ["none", "score"]},
    "_scope": "",
    "query": {
    }
  }

});