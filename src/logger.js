'use strict';
import Debug from 'debug';
/**
  * Takes in a module name so the debug logs can output namespaced logging
  */
export default moduleName =>{
  let nameSpace = `env-config:${moduleName}`;
  let debug = Debug(nameSpace);
  return {
    log: console.log,
    error: console.error,
    debug: debug
  };
};
