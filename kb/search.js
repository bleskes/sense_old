sense.kb.addEndpointDescription('_search', {
  match: /(\w+,?)*\/?_search/,
  def_method: "POST",
  methods: ["GET", "POST"],
  endpoint_autocomplete: [
    "_search", "index1,index2/_search"
  ],
  data_autocomplete_rules: {
    query: {
      // populated by a global rule
    },
    facets: {
      __template: {
        "NAME": {
          "TYPE": {
          }
        }
      },
      "$FIELD$": {
        terms: {
          field: []
        }
      }
    },
    size: { __template: 20 },
    from: {},
    search_type: {},
    fields: {},
    partial_fields: {},
    highlight: {
      // populated by a global rule
    }
  }
});