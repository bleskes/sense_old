sense.kb.addEndpointDescription('_warmer', {
  match: /(\w+,?)*\/?_warmer/,
  def_method: "PUT",
  methods: ["GET", "PUT", "DELETE"],
  endpoint_autocomplete: [
    "_warmer", "index1,index2/_warmer/WARMER_ID"
  ],
  data_autocomplete_rules: {
    query: {
      // populated by a global rule
    },
    facets: {
      // populated by a global rule
    }
  }
});