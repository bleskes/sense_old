sense.kb.addGlobalAutocompleteRules("highlight", {
      pre_tags: {}, post_tags: {}, tags_schema: {},
      fields: { "$FIELD$": { "fragment_size": {}, "number_of_fragments": {} }}
    }
);

// only used with scope links as there is no common name for scripts
sense.kb.addGlobalAutocompleteRules("SCRIPT_ENV", {
      __template: { "script": ""},
      script: "",
      lang: "",
      params: {}
    }
);
