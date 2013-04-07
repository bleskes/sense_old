sense.kb.addEndpointDescription('index1/_settings', {
  match: /_settings/,
  methods: ["GET", "PUT"],
  endpoint_autocomplete: ['_settings'],
  indices_mode: "multi",
  types_mode: "none",
  doc_id_mode: "none",
  data_autocomplete_rules: {
    "index": {
      "routing": {
        "allocation": {
          "include": { "tag": "" },
          "exclude": { "tag": ""}
        }
      }
    }
  }
});
