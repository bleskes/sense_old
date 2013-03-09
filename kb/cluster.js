sense.kb.addEndpointDescription('_cluster/nodes/stats', {
  methods: ["GET"]
});
sense.kb.addEndpointDescription('_cluster/state', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cluster/state']
});

sense.kb.addEndpointDescription('_cluster/health', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cluster/health']
});
