'use strict';

import Logger from './src/logger';

let logger = Logger('index');
logger.debug('loaded');

export default connection => {
  console.log(connection);
};
