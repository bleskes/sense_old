sense.kb.addEndpointDescription('_template', {
  match: /\/?_template/,
  def_method: "PUT",
  methods: ["GET", "PUT", "DELETE"],
  endpoint_autocomplete: [
    "_template/TEMPLATE_ID"
  ],
  data_autocomplete_rules: {
    template: "index*",
    warmers: { }, // TODO - add scope links
    mappings: {},
    settings: {}
  }
});