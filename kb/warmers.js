sense.kb.addEndpointDescription('_warmer', {
  match: /_warmer/,
  def_method: "PUT",
  methods: ["GET", "PUT", "DELETE"],
  endpoint_autocomplete: [
    "_warmer", "_warmer/WARMER_ID"
  ],
  indices_mode: "multi",
  types_mode: "none",
  doc_id_mode: "none",
  data_autocomplete_rules: {
    query: {
      // populated by a global rule
    },
    facets: {
      // populated by a global rule
    }
  }
});