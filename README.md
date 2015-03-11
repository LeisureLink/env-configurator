# env-configurator

env-configurator manages configuration look up for applications and their
libraries. Currently, env-configuration supports pulling configuration
from environment variables, Consul.io KV stores, and DNS SRV records.

The basic concept of the library is that an application gives it a configuration
spec with JSON ptrs that, when fulfilled, will correspond to configuration
values required by the application. See config-example.json for a basic example
of a configuration spec which may be given to env-configurator.

env-configuration manages configuration for the client library or application
and therefore **does not return** a configuration object. Instead, after indicating
that configuration is complete, env-configurator makes configuration
keys available via a #get function.

## Notes & TODOs

- Add logging support to the configurator in order to enable more transparent error handling
- Refactor the DNS resolution module (lib\dns.js). I don't like the way errors are currently handled
  and I really don't like how the module is dependent on having the app config passed to it for
  prefix and suffix resolution and DNS fallback. This module is currently what prevents the configuration providers (Consul, Env, others?)
  from being reordered.

## Installation

Clone this repository and use npm to install dependencies.

```npm install```

##Tests

```npm test```

or

```mocha -R spec```

## Configuring the configurator

env-configurator requires a configuration object in order to determine what 
configuration keys to fetch for the client. The configurator validates 
configuration specification passed to it against a JSON schema located
at lib\configuration-schema.json. An example configuration spec that would
validate is:

    {
        "name": "mylib",
        "services": [
            {
                "name": "someapi.service.consul",
                "key": "#/someapi/uri"
            },
            {
                "name": "authentic.service.consul",
                "key": "#/security/uri"
            }
        ],
        "keys": [
            "#/someapi/apikey",
            "#/privatekeyUri"
        ]
    }

The configuration spec declares names (in the keys array and key property
of the services array objects) at which it will make configuration 
available. For example, if the above config spec resulted in a successful
configuration then a configuration key could be retrieved by calling:

```configuratorObj.get('mylib', '#/someapi/apikey');```

### Optional keys

Optional keys get a separate section because they're special. Optional
keys should be used sparingly in order to avoid
unintentionally placing default values in your application. That being
said, sometimes it is useful to use the absence of a configuration key
as a configuration parameter.

Add an ```optional``` array in order to declare keys (defined in either 
the services or keys array) as optional. The functionality of the
```optional``` array is essentially the inverse of the ```required``` 
array in a JSON Schema definition.

Example:

    {
        "name": "myApp",
        "keys": [
            "#/foo"
        ],
        "optional": [
            "#/foo"
        ]
    }

In the above example if ```#/foo``` were missing **no errors** will 
be thrown by the library during configuration. Any subsequent call
to ```get('myApp', '#/foo')``` will return undefined.


## Lookup conventions

In order to retrieve configuration keys the configurator uses a
couple conventions.

### Environment lookup

The configurator uses the client's provided name and keys to retrieve
configuration from environmental varibles. Specifically, given:

    {
        "name": "a",
        "keys": [
            "#/foo"
        ]
    }

The configurator will look for an environment variable with the name
```A_FOO```. In short, names are prefixed with the provided app name,
'/' are transformed into '_', and all components are upper cased.

#### When naming variables

Keep in mind rules for POSIX and Windows environment variable names:

  - [POSIX](http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap08.html)
  - [Windows](https://msdn.microsoft.com/en-us/library/windows/desktop/ms682009(v=vs.85).aspx)

Generally speaking, things matching /[A-Z0-9_]+/ should be safe to use.

### Consul KV lookup

Given:

    {
        "name": "a",
        "keys": [
            "#/foo"
        ]
    }

The configurator will lookup all keys prefixed with ```a/``` in Consul and
attempt to find a key with the name full path name ```a/foo``` in the 
results.

### DNS SRV lookup

Services are handled slightly differently from keys in that they have
a separate configuration section and a fallback in case of lookup failure.

Given:

    {
        "name": "a",
        "sevices": [
            {
                "name": "foo.bar.com",
                "key": "#/foo/bar/uri"
            }
        ]
    }

The configurator will attempt to lookup a DNS **SRV** record with the
name ```foo.bar.com``` and assign it the config path ```#/foo/bar/uri```.
**If and only if** the SRV record lookup fails will the configurator
attempt to do an env or consul kv look up for the value based on the
key.

## Example usage

    var Configurator = require('env-configurator'),
           configurator = new Configurator();
       
       configurator.fulfill({
            "name": "mylib",
            "services": [
                {
                    "name": "someapi.service.consul",
                    "key": "#/someapi/uri"
                },
                {
                    "name": "authentic.service.consul",
                    "key": "#/security/uri"
                }
            ],
            "keys": [
                "#/someapi/apikey",
                "#/privatekeyUri"
            ]
        }, function(errs) {
            if (!errs) {
                //Config was successful
                console.log(configurator.get('mylib', '#/security/uri');
            } else {
                //errs contains one or more error objs
            }
        });

