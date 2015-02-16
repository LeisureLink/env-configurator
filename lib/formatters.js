'use strict';

module.exports = (function () {
  var formatters = {};
  /**
   * Uri Formatter
   * @param {string} prefix - A prefix to a URI, ex 'http://'
   * @param {string} name - A DNS name for the service
   * @param {number} port - A port number for the service
   * @param {string} postfix - Any post fix to add to the service
   */
  function uriFormatter(prefix, name, port, postfix) {
    var postfixStr = postfix || '';
    return prefix + name + ':' + port + postfix;
  }
  Object.defineProperty(formatters, 'mongodb', {
    value: function mongodbFormatter(addresses) {
      /**
       * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
       * the highest priority record (assumed to be first)
       * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
       * @returns {string} An incomplete mongodb url--the client must postpend a database name to the url
       */
      return uriFormatter('mongodb://', addresses[0].name, addresses[0].port, '/');
    }
  });
  Object.defineProperty(formatters, 'bareName', {
    value: function baseNameFormatter(addresses) {
      /**
       * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
       * the highest priority record (assumed to be first)
       * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
       * @returns {string} A bare DNS name
       */
      return addresses[0].name;
    }
  });
  Object.defineProperty(formatters, 'http', {
    value: function httpNameFormatter(addresses) {
      /**
       * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
       * the highest priority record (assumed to be first)
       * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
       * @returns {string} A HTTP service URL using the port specified by the service record
       */
      return uriFormatter('http://', addresses[0].name, addresses[0].port, '/');
    }
  });
  Object.defineProperty(formatters, 'https', {
    value: function httpsNameFormatter(addresses) {
      /**
       * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
       * the highest priority record (assumed to be first)
       * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
       * @returns {string} A HTTPS service URL using the port specified by the service record
       */
      return uriFormatter('https://', addresses[0].name, addresses[0].port, '/');
    }
  });
  return formatters;
}());