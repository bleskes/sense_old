

var ES_SCHEME_BY_ENDPOINT = {
    '_cluster/nodes/stats' : {

    },
    '_percolator' : {

    },
    '_search' : {
      autocomplete_rules: {
          "{" : [ "query","facets","size","from","search_type","fields","partial_fields","highlight" ],
          "{query{" : [ "term","match_all" ]
      }
    },
    '_stats' : {
    },
    '_status' : {

    }
};

