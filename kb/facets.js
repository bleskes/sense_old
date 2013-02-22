sense.kb.addGlobalAutocompleteRules("facets", {
      "*": {
        terms: {
          field: "FIELD",
          fields: ["FIELD"],
          size: 10,
          script: "",
          script_field: "",
          order: { __one_of: ["count", "term", "reverse_count", "reverse_term"]},
          all_terms: { __one_of: [false, true]},
          exclude: ["TERM"],
          regex: "",
          regex_flags: ""
        }
      }
    }
);
