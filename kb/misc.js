sense.kb.addEndpointDescription('_cluster/nodes/stats', {
  method: "GET"
});
sense.kb.addEndpointDescription('_stats', {
  method: "GET",
  endpoint_autocomplete: ['_stats', 'index1,index2/_stats']

});
sense.kb.addEndpointDescription('_status', {
  method: "GET",
  endpoint_autocomplete: ['_status', 'index1,index2/_status']
});

