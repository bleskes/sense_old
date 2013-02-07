sense.kb.addEndpointDescription('_cluster/nodes/stats', {
  methods: ["GET"]
});
sense.kb.addEndpointDescription('_stats', {
  methods: ["GET"],
  endpoint_autocomplete: ['_stats', 'index1,index2/_stats']

});
sense.kb.addEndpointDescription('_status', {
  methods: ["GET"],
  endpoint_autocomplete: ['_status', 'index1,index2/_status']
});

