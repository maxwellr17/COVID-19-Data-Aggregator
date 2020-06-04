
/ ------ WEBSOCKET SERVER
/ ------ CREATED BY MAX ROLING
/ ------ IMPLEMENTS A (VERY) BASIC KDB+ BACKEND TO RETRIEVE AND FORMAT 
/ ------ COVID-19 CASE AND MORTALITY RATES FOR VARIOUS COUNTRIES. 


/ read csv files
/ 267 columns, all integers
/ TODO: CHANGE FILE PATHS TO RUN ON ANOTHER MACHINE
confirmed:(267#"I";enlist ",") 0: `:/Users/max/q/m32/confirmed_data_cleaned.csv
deaths:(267#"I";enlist ",") 0: `:/Users/max/q/m32/deaths_cleaned.csv

/ define global dict to return for all websocket queries. This dictionary is modified on every endpoint call,
/ and subsequently passed through a websocket connection to the client. NOTE: this is generally bad practice in functional
/ programming, but fine for these purposes
d:()!()
/ d will have the format d[`func] = (function called and parameters passed); d[`data] = (result of function call)


/ get column names endpoint: returns all countries in database
get_cols: {[]; d[`func]:: enlist `get_countries; res: enlist cols confirmed; d[`data]::res; res};

/ FOR TESTING: UNCOMMENT THESE FOR SIMPLER VERSIONS OF GET_COUNTRY
/ get_country: {[country] confirmed[;country]}
/ WORKING: get_country: {[country; dataset] $[dataset=`confirmed; confirmed[;country]; dataset=`deaths; deaths[;country]; null]}


/ select specified country data
/ example: get_country [`US; `confirmed] or get_country [`US; `deaths]
get_country: {[country; dataset] $[dataset=`confirmed; [d[`func]:: enlist[`get_country; country; dataset]; d[`data]:: enlist confirmed[;country]; confirmed[;country]]; dataset=`deaths; [d[`func]:: enlist[`get_country; country; dataset]; d[`data]:: enlist deaths[;country]; deaths[;country]]; null]}


/ get day by day change of cases for specified country
get_deltas: {[country; dataset] c:get_country[country;dataset]; d[`func]::enlist[`get_deltas; country; dataset]; d[`data]::deltas c; deltas c}

/ get n day moving average for specified country
get_mavg: {[country; dataset; n] c:get_country[country;dataset]; d[`func]::enlist[`get_mavg; country; dataset;n];d[`data]::n mavg c;n mavg c}

/ get bollinger bands: example: http://localhost:5420/?bollinger_bands[2;20;`US;`confirmed]
/ NOTE: CODE TAKEN FROM ONLINE (https://code.kx.com/q/wp/trend-indicators/#bollinger-bands), MODIFIED SLIGHTLY
bollinger_bands: {[k;n;country;dataset] data: get_country[country;dataset]; movingAvg: mavg[n;data]; md: sqrt mavg[n;data*data]-movingAvg*movingAvg; movingAvg+/:(k*-1 0 1)*\:md};



/ ------ NOW THAT ALL ENDPOINTS ARE DEFINED, START SERVER ON PORT 5420
\p 5420

/ Now, define functions to support WebSocket functionality
activeWSConnections: ([] handle:(); connectTime:())

/ Setup WebSocket Open and Close methods, and keep track of active connections:
/ x argument supplied to .z.wc & .z.wo is the connection handle
.z.wo:{`activeWSConnections upsert (x;.z.t)}
.z.wc:{ delete from `activeWSConnections where handle =x}


/ various earlier versions of socket message handling functions
/ .z.ws:{neg[.z.w].Q.s value x;}
/ .z.ws:{neg[.z.w].Q.s .j.j value x;}
/ .z.ws:{neg[.z.w] .j.j value x;}
/ .z.ws:{neg[.z.w].j.j @[value;x;{`$ "'",x}];}
/ WORKING SERIALIZED SEND: .z.ws:{neg[.z.w] -8! @[value;x;{`$"'",x}]}
/ WORKING JSON SEND: .z.ws:{neg[.z.w] .j.j value x;}



/ The below (final) WS onMessage function does the following: 
/ 1. retrieve input message from client, in the form of Q code to run one of the above endpoints
/ 2. Evaluate the Q code, subsequently running one (or more) of the above endpoints, and saving the result
/ 	of the most recent endpoint run to a dictionary d
/ 3. Parse the dictionary d as a JSON object, and send back to the client in this format.
/ Note that it is important to send the information back to the client as a dictionary containing the result and the function called,
/ because the WebSocket can return function results out of order to the client, so it is imperative that the client sees
/ not only the data returned, but also the function call that caused that particular data to be fetched. 

write: {[x]; value x; .j.j d}
.z.ws:{neg[.z.w] write(x)}






