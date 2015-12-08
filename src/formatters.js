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
    return prefix + name + ':' + port + postfix;
  }
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a mongodb driver URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#mongodb
   * @kind function
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @param {string} prefix - A prefix that can optionally be added formatted service locator URLs 
   * @param {string} suffix - A suffix that can optionally be added formatted service locator URLs
   * @returns {string} An incomplete mongodb url--the client must postpend a database name to the url
   */
  Object.defineProperty(formatters, 'mongodb', {
    value: function mongodbFormatter(addresses, prefix, postfix) {
      prefix = prefix !== undefined ? prefix : '';
      postfix = postfix !== undefined ? postfix : '';
      return uriFormatter('mongodb://', prefix + addresses[0].name, addresses[0].port, '/' + postfix);
    }
  });
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a bare DNS name from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#bareName
   * @kind function
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @param {string} prefix - A prefix that can optionally be added formatted service locator URLs 
   * @param {string} suffix - A suffix that can optionally be added formatted service locator URLs
   * @returns {string} A bare DNS name
   */
  Object.defineProperty(formatters, 'bareName', {
    value: function baseNameFormatter(addresses, prefix, postfix) {
      prefix = prefix !== undefined ? prefix : '';
      postfix = postfix !== undefined ? postfix : '';
      return uriFormatter(prefix, addresses[0].name, addresses[0].port, postfix);
    }
  });
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a http URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#http
   * @kind function
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @param {string} prefix - A prefix that can optionally be added formatted service locator URLs 
   * @param {string} suffix - A suffix that can optionally be added formatted service locator URLs
   * @returns {string} A HTTP service URL using the port specified by the service record
   */
  Object.defineProperty(formatters, 'http', {
    value: function httpNameFormatter(addresses, prefix, postfix) {
      prefix = prefix !== undefined ? prefix : '';
      postfix = postfix !== undefined ? postfix : '';
      return uriFormatter('http://', prefix + addresses[0].name, addresses[0].port, '/' + postfix);
    }
  });
  /**
   * Accepts a array of DNS SRV records from the DNS package and returns a https URL from
   * the highest priority record (assumed to be first)
   * @name module:lib/formatters#https
   * @kind function
   * @param {object} addresses - An array of address objects from the DNS package @see {@link http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback }
   * @param {string} prefix - A prefix that can optionally be added formatted service locator URLs 
   * @param {string} suffix - A suffix that can optionally be added formatted service locator URLs
   * @returns {string} A HTTPS service URL using the port specified by the service record
   */
  Object.defineProperty(formatters, 'https', {
    value: function httpsNameFormatter(addresses, prefix, postfix) {
      prefix = prefix !== undefined ? prefix : '';
      postfix = postfix !== undefined ? postfix : '';
      return uriFormatter('https://', prefix + addresses[0].name, addresses[0].port, '/' + postfix);
    }
  });
  return formatters;
}());