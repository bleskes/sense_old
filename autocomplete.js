

var ES_SCHEME_BY_ENDPOINT = {
  '_cluster/nodes/stats': {

  },
  '_percolator': {

  },
  '_search': {
    autocomplete_rules: {
      query: {
        term: {},
        terms: { minimun_match : {}},
        match_all: {},
        match: {},
        filtered: {
          query: {},
          filter: {}
        },
        ids: { type: {}, values: {} },
        bool : {
          must : {},
          must_not : {},
          should : {},
          minimum_number_should_match: {},
          boost: {}
        },
        field : {
          "*" : {
          query : {}, boost : {}, enable_position_increments: {}
        } }

      },
      facets: { "*": { terms: { field: [] } } },
      size: {},
      from: {},
      search_type: {},
      fields: {},
      partial_fields: {},
      highlight: {
        pre_tags: {}, post_tags: {}, tags_schema: {},
        fields: { "*": { "fragment_size": {}, "number_of_fragments": {} }}}

    }
  },
  '_stats': {
  },
  '_status': {

  }
};

