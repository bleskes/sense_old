sense.kb.addEndpointDescription('_search', {
  def_method: "POST",
  methods: ["GET", "POST"],
  endpoint_autocomplete: [
    "_search"
  ],
  indices_mode: "multi",
  types_mode: "multi",
  doc_id_mode: "none",
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
      }
      // populated by a global rule
    },
    size: { __template: 20 },
    from: {},
    sort: {
      __template: [
        { "FIELD": { "order": "desc"} }
      ]
    },

    search_type: {},
    fields: {},
    partial_fields: {},
    highlight: {
      // populated by a global rule
    }

  }
});