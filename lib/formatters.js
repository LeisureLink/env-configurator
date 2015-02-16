/**
 * Service url formatters
 * @module lib/formatters
 */
module.exports = (function () {
  'use strict';
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
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#mongodb
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @returns {string} An incomplete mongodb url--the client must postpend a database name to the url
   */
  Object.defineProperty(formatters, 'mongodb', {
    value: function mongodbFormatter(addresses) {
      return uriFormatter('mongodb://', addresses[0].name, addresses[0].port, '/');
    }
  });
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#bareName
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @returns {string} A bare DNS name
   */
  Object.defineProperty(formatters, 'bareName', {
    value: function baseNameFormatter(addresses) {
      return addresses[0].name;
    }
  });
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#http
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @returns {string} A HTTP service URL using the port specified by the service record
   */
  Object.defineProperty(formatters, 'http', {
    value: function httpNameFormatter(addresses) {
      return uriFormatter('http://', addresses[0].name, addresses[0].port, '/');
    }
  });
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#https
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @returns {string} A HTTPS service URL using the port specified by the service record
   */
  Object.defineProperty(formatters, 'https', {
    value: function httpsNameFormatter(addresses) {
      return uriFormatter('https://', addresses[0].name, addresses[0].port, '/');
    }
  });
  return formatters;
}());