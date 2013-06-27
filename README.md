Sense
=====

A JSON aware developer's interface to ElasticSearch. Comes with handy machinery such as syntax highlighting, autocomplete,
formatting and code folding.

[![Build Status](https://travis-ci.org/bleskes/sense.png)](https://travis-ci.org/bleskes/sense)

Honesty first
-------------
This is an evening project which have gotten out of hand.

I find it very useful. I hope you do too.

Installation
------------

Sense is installed as a Chrome Extension. Install it from
the [Chrome Webstore](http://bit.ly/es_sense) .

Screenshots
-----------

### Syntax highlighting
![Syntax highlighting](https://github.com/bleskes/sense/raw/master/docs/syntaxhighlighting.png)

### Auto complete
![Auto complete](https://github.com/bleskes/sense/raw/master/docs/autocomplete.png)

### Broken JSON detection
![Broken JSON](https://github.com/bleskes/sense/raw/master/docs/broken.png)

## History
![History](https://github.com/bleskes/sense/raw/master/docs/history.png)

Changes
-------


### v0.7 (master only)
- Increased history size to 500 elements
- Add mappings to the KB.

### v0.6
- Added support for username passwords in the url.
- Added support for cURL copy & paste.
    - You can now copy current request in curl format (using menu button or a keyboard shortcut)
    - Paste a curl command into the editor and it will be parsed and all the correct fields populated

### v0.5
- Mapping integration - autocomplete on indices, aliases and fields.
- Added facets to the KB.
- Enabled soft wrap in both input and output editors

### v0.4
- Completed knowledge base and autocomplete for Query DSL

### v0.3
- Moved to a Chrome Extension for better deployment and upgrading infrastructure.
- Introduced a knowledge base system to better manage growing size.
- Added an automated test suite.

### v0.2
- History support

### v0.1
- Initial release
