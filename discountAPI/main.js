// Initialize the state
state.transactions = state.transactions || [];

var utils = require('./utility.js');
var renderer = require('./render.js');

// 'CreateTransaction' mock
Sandbox.define('/v4/transportService.asmx', 'POST', function(req, res) {
    if(req.xmlDoc.get("//*[local-name()='CreateTransaction']")===null) {
        return res.send(400);
    }

    // Read and store the staged total amount and ClerkId
    var amount = req.xmlDoc.get("//*[local-name()='Amount']").text();
    var clerkId = req.xmlDoc.get("//*[local-name()='ClerkId']").text();
        
    // Generate random UUIDs to represent the Transport Key and Validation Key
    var transportKey = utils.uuidv4();
    var validationKey = utils.uuidv4();
    
    // Store the transaction details against the Transport Key
    state.transactions.push( {  transportKey: transportKey,
                                validationKey: validationKey,
                                amount: amount,
                                clerkId: clerkId});
        
    // Return the CreateTransaction response using the template
    // Need to explicitly set this Content-Type as it is a SOAP transaction
    // and must match exactly.
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.status(200);
    return res.render('SOAP/createTransactionResponseTemplate', {
        'transportKey': transportKey,
        'validationKey': validationKey
    });
});

// CED initiate transaction mock
Sandbox.define('/v2/pos', 'GET', function(req, res){
    // Find the transaction by transport key
    var txn = _.find(state.transactions, { 'transportKey': req.query.TransportKey });

    if (txn===undefined) {
        return renderer.renderErrorResponse(res, "FAILED", "Invalid Transport Key", req.query.Format);
    }

    // Send the appropriate response body.
    if((/multitender/i).test(txn.clerkId)) {
        renderer.renderLoyaltyMultitenderResponse(res, txn.validationKey, txn.amount, req.query.Format);
    } else {
        renderer.renderSingleTenderResponse(res, txn.validationKey, txn.amount, req.query.Format);
    }
    
    // Remove the transaction now that the transport key has been used
    state.transactions = _.reject(state.transactions, { 'transportKey': req.query.TransportKey });
});