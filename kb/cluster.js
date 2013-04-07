sense.kb.addEndpointDescription('_cluster/nodes/stats', {
  methods: ["GET"],
  indices_mode: "none",
  types_mode: "none"
});
sense.kb.addEndpointDescription('_cluster/state', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cluster/state'],
  indices_mode: "none",
  types_mode: "none"
});

sense.kb.addEndpointDescription('_cluster/health', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cluster/health'],
  indices_mode: "none",
  types_mode: "none"
});
