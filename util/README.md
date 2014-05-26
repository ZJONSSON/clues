# express-clues

A simple express wrapper around a clues API. The module.exports is a function that returns an express route when given a custom API object as an argument. Results for each API call are returned as a JSON string. The requested function should be specified as fn in the query params.

Typical usage from a running express server would be as follows:

app.all('/api/:fn',require('express-clues')(api))
Two standard functions are added to the API:

multi

The multi function returns multiple solved facts in one function call. The list of required facts should be defined in the data parameter as a comma separated string. An error in any of the required facts will not prevent other facts to be reported.

help

Returns a list of the functions defined in the api