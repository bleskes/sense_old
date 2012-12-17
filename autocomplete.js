

var ES_SCHEME_BY_ENDPOINT = {
    '_cluster/nodes/stats' : {

    },
    '_percolator' : {

    },
    '_search' : {
      autocomplete_rules: {
        query : { term: {}, match_all : {}},
        facets : { "*" : { terms : { field : [] } } },
        size: {},
        from: {},
        search_type: {},
        fields : {},
        partial_fields : {},
        highlight : {}

      }
    },
    '_stats' : {
    },
    '_status' : {

    }
};

