sense.kb.addEndpointDescription('_aliases', {
  match: /(\w+,?)*\/?_aliases/,
  def_method: "GET",
  methods: ["GET", "POST"],
  endpoint_autocomplete: [
    "_aliases", "index1,index2/_aliases"
  ],
  data_autocomplete_rules: {
    "actions": {
      __template: [
        { "add": { "index": "test1", "alias": "alias1" } }
      ],
      // TODO: change this when autocomplete understands lists of objects.
      add: {
        index: "",
        alias: "",
        filter: {},
        routing: "1",
        search_routing: "1,2",
        index_routing: "1"
      },
      remove: {
        index: "",
        alias: ""
      }
    }
  }
});