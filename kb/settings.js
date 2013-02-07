sense.kb.addEndpointDescription('index1/_settings', {
  match: /(\w+,?)+\/_settings/,
  methods: ["GET", "PUT"],
  endpoint_autocomplete: ['index1/_settings'],
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
