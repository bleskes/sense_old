sense.kb.addGlobalAutocompleteRules("filter", {
  and: {
    __template: {
      filters: [
        {}
      ]
    },
    filters: [
      { __scope_link: ".filter" }
    ],
    _cache: {__one_of: [ false, true ]}
  },
  bool: {
    must: { __scope_link: ".filter"},
    must_not: { __scope_link: ".filter"},
    should: [
      { __scope_link: ".filter"}
    ],
    _cache: {__one_of: [ false, true ]}
  },
  exists: {
    __template: { "FIELD": "VALUE"},
    "$FIELD$": ""
  },
  ids: {
    __template: { "values": ["ID"] },
    "type": "$TYPE$",
    "values": [""]
  },
  limit: {
    __template: { value: 100},
    value: 100
  },
  type: {
    __template: { value: "TYPE"},
    value: "$TYPE$"
  },
  geo_bounding_box: {
    __template: {
      "FIELD": {
        "top_left": {
          "lat": 40.73,
          "lon": -74.1
        },
        "bottom_right": {
          "lat": 40.717,
          "lon": -73.99
        }
      }
    },

    "$FIELD$": {
      top_left: { lat: 40.73, lon: -74.1 },
      bottom_right: { lat: 40.73, lon: -74.1 }
    },
    type: { __one_of: ["memory", "indexed"]},
    _cache: {__one_of: [ false, true ]}
  },
  geo_distance: {
    __template: {
      distance: 100,
      distance_unit: "km",
      "FIELD": { lat: 40.73, lon: -74.1 }
    },
    distance: 100,
    distance_unit: { __one_of: [ "km", "miles"]},
    distance_type: { __one_of: [ "arc", "plane"]},
    optimize_bbox: { __one_of: [ "memory", "indexed", "none"]},
    "$FIELD$": { lat: 40.73, lon: -74.1 },
    _cache: {__one_of: [ false, true ]}
  },
  geo_polygon: {
    __template: {
      "FIELD": {
        "points": [
          { lat: 40.73, lon: -74.1 },
          { lat: 40.83, lon: -75.1 }
        ]
      }
    },
    "$FIELD$": {
      points: [
        { lat: 40.73, lon: -74.1 }
      ]
    },
    _cache: {__one_of: [ false, true ]}
  }


});
