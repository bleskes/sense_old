sense.kb.addEndpointDescription('_refresh', {
   def_method: "POST",
   methods: ["POST"],
   endpoint_autocomplete: [
      "_refresh"
   ],
   indices_mode: "multi"
});

sense.kb.addEndpointDescription('_stats', {
   def_method: "GET",
   methods: ["GET"],
   endpoint_autocomplete: [
      "_stats"
   ],
   indices_mode: "multi"
});

sense.kb.addEndpointDescription('_segments', {
   def_method: "GET",
   methods: ["GET"],
   endpoint_autocomplete: [
      "_segments"
   ],
   indices_mode: "_segments"
});

