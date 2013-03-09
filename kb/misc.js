sense.kb.addEndpointDescription('_stats', {
  methods: ["GET"],
  endpoint_autocomplete: ['_stats', 'index1,index2/_stats']

});
sense.kb.addEndpointDescription('_cache/clear', {
  methods: ["GET"],
  endpoint_autocomplete: ['_cache/clear', 'index1,index2/ _cache/clear']

});
sense.kb.addEndpointDescription('_status', {
  methods: ["GET"],
  endpoint_autocomplete: ['_status', 'index1,index2/_status']
});

