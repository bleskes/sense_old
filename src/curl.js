(function (global) {
   var sense = global.sense = (global.sense || {});

   // multi-line, case insensitive, searching for a curl call somewhere at the begining of a line
   var curlishRE = /^curl ([a-z\/][^ ]+ )?((-|("|')[a-z])|$)/mi;
   var curlMethodFlagRE = /(?:^| )-X([A-Z]+)/;
   var hasProtocolRE = /^(\w{2,}:)?\/\//;
   var edgeWhiteSpaceRE = /(^\s+|\s+$)/g;

   var curl = sense.curl = {};

   curl.detectCURL = function (text) {
      // returns true if text matches a curl request
      return curlishRE.test(text);
   };

   /**
    * Parse out all of the curl statements that can be found in the string ignoring everything else
    *
    * @param  {String} text - The text to parse
    * @return {Object[]} - An array of objects from the parseFirst method
    *
    * @see sense.curl.parseFirst
    */
   curl.parseAll = function (text) {
      var calls = [];
      var match;
      var chunk = text;
      var call;

      for (var i = 0; i < 100 && chunk.length && (match = curlishRE.exec(chunk)); i++) {
         chunk = chunk.substring(match.index);
         call = curl.parseFirst(chunk);
         if (call) {
            chunk = chunk.substring(call.string.length);
            calls.push(call);
         } else {
            chunk = chunk.substring(match[0].length);
         }
      }

      return calls;
   };

   /**
    * Find the first curl statement in the string, parse it's args and return the
    * useful args normalized
    *
    * @param  {String} text - The text to search
    * @return {Object} - An object containing method, server, endpoint, data, and string keys describing
    *                    the curl call.
    */
   curl.parseFirst = function (text) {
      var args = splitIntoArgs(text);

      // minimist will transport this list into a comprehensible object
      // skip the "curl" token
      var argv = minimist(args.slice(1), {
         boolean: [
            'I', 'head'
         ],
         alias: {
            I: 'head',
            X: 'method',
            request: 'method',
            d: 'data',
            'data-ascii': 'data',
            'data-binary': 'data'
         }
      });

      // parse the servername and endpoint
      var href = argv._.length ? resolveHref(argv._[0]) : {};

      var ret = {
         method: '',
         server: href.server || '',
         url: href.url || '',
         data: (argv.data || '').replace(edgeWhiteSpaceRE, ''),
         string: args.body || ''
      };

      if (argv.method) {
         ret.method = argv.method;
      } else if (!ret.method && argv.head) {
         ret.method = 'HEAD';
      }

      return ret;
   };

   /**
    * Split the string into tokens, repecting quoted strings (' or ") and finishing
    * after the first unquoted newline.
    *
    * @param  {String} str - The string to split
    * @return {Array} - An array of tokens, with an extra property "body" which contains
    * the full text used to make the token list.
    */
   function splitIntoArgs(str) {
      var args = [];
      var inQuotes = false;
      var part = '';
      for (var i = 0; i < str.length; i++) {
         prev = str[i - 1];
         cur = str[i];
         next = str[i + 1];

         // toggle inQuotes
         if (inQuotes) {
            // only way out is matching inQuotes
            if (cur === inQuotes && prev+cur !== "\\" + inQuotes) {
               inQuotes = false;
               continue;
            }
         }
         else if (cur === ' ') {
            // oooo! a word!
            args.push(part);
            part = '';
            continue;
         }
         else if((cur === '"' && prev+cur !== '\\"') || (cur === "'" && prev+cur !== "\\'")) {
            // we're on the record
            inQuotes = inQuotes ? false : cur;
            continue;
         }
         else if (cur+next === '\r\n' || cur === '\n') {
            // it's the end of the non-quoted line sir
            break;
         }

         part += cur;
      }
      if (part) {
         args.push(part);
      }

      var tokens = [];
      args.forEach(function (token) {
         // split up -XMETHOD formatted tokens
         if ((match = token.match(curlMethodFlagRE)) !== null) {
            tokens.push('-X');
            tokens.push(match[1]);
         } else {
            tokens.push(token);
         }
      });

      tokens.body = str.substring(0, i);

      return tokens;
   }

   function resolveHref(href) {
      if (!hasProtocolRE.test(href)) {
         href = 'http://' + href;
      }
      var a = document.createElement('a');
      a.href = href;
      return {
         server: a.protocol + '//' + a.host,
         url: a.pathname + a.search
      };
   }

})(this);
