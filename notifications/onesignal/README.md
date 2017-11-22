# OneSignal
Potential notification provider, this module provides web push notifications 
using OneSignal.


## Hosting on ipfs
If you want to host on IPFS, to make OneSignals web workers to work, you need
to provide a path attribute to the `init` object.

`path: document.location.pathname`

For this to work you also need to add an additional header to your gateway
 
```
$ ipfs config --json Gateway.HTTPHeaders.Service-Worker-Allowed '["/"]'
```