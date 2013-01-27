Sense
=====

A JSON aware interface to ElasticSearch. Comes with handy machinery such as syntax highlighting, autocomplete,
formatting and code folding.

[![Build Status](https://travis-ci.org/bleskes/sense.png)](https://travis-ci.org/bleskes/sense)

Honesty first
-------------
This is an evening project which have gotten out of hand.
It has rough edges and probably bugs.The basic machinery is in place but there is still a lot that still needs to be done.

I find it very useful. I hope you do too.

Installation
------------

Sense is installed as a Chrome Extension.Install it from
the [Chrome Webstore](https://chrome.google.com/webstore/detail/sense/doinijnbnggojdlcjifpdckfokbbfpbo) .

As Chrome Extensions are piratically a website, you can still install a Sense as a ElasticSearch site plugin:

    bin/plugin -install bleskes/sense
   
Note: this may note work in future releases.

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
### v0.3
- Moved to a Chrome Extension for better deployment and upgrading infrastructure.
- Introduced a knowledge base system to better manage growing size.
- Added an automated test suite.

### v0.2
- History support

### v0.1
- Initial release