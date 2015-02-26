# env-configurator

Currently a small module intended to handle resolving services from DNS SRV records. The module
requires a either a minimal configuration object or a path to a configuration file in order
to do anything useful.

In the future I'll try to expand the scope of this to handle environment variables and act as a general
configuration utility for LL node projects.

## Installation

Clone this repository and use npm to install dependencies.

```npm install```

##Tests

```npm test```

or

```mocha -R spec```

## Configuring the configurator

env-configurator requires a configuration object in order to determine what services
to lookup in DNS and how to format the result SRV records. The general format of the
configuration object is (in JSON):


    {
        "consulAgent": {
            "host": "127.0.0.1",
            "port": "8500",
            "secure": true
        },
        "services": [
            {
                "name": "The DNS name to look up",
                "formatter": "The name of the formatter to use on the DNS SRV record response",
                "prefix": "A prefix to prepend to the name in the DNS SRV record response",
                "suffix": "A suffix to postpend to the formatter DNS SRV record"
            }
        ],
        "keyValues": {
            "prefix": "SomeAppNamePrefix",
            "keys": {
                "env": {
                    "name": "env",
                    "required": false
                },
                "endpointKeyFile": {
                    "name": "endpointKeyFile",
                    "required": true
                }
            }
        }
    }

There can be one or more services to look up defined in the services array. The ```prefix```
and ```suffix``` properties are optional and default to '' when not provided. Currently,
env-configurator supports 4 different formatter values, ```mongodb```, ```bareName```, 
```http```, and ```https```. Specifying an unsupported formatter name will result in just
the DNS name for the service being returned without the port or any further formatting.

The ```keyValues``` block defines optionally required key-value pairs that the application needs
to be configured. Key-values will be returned in the configuration object along with any
services. If the key is marked as required then the configuration process will stop and throw an
error (what error??). 

By default env-configurator will search the application's runtime environment variables according to the following
pattern for the ith key in the configuration structure:

```keyValues.prefix + '_' + keys[i].name```

If a ```consulAgent``` property is defined in the env-configurator's config object then it will attempt to search the local
consul agent as well for key values. Please note that environmental variables take precedence over the values stored
in any remote consul agent. 