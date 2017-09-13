// Initialize the state
state.transactions = state.transactions || [];
state.completedTransactions = state.completedTransactions || [];

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
    // Check for a "Status" request
    if(req.query.Action==="Status") {
        return renderer.renderStatusResponse(res, req.query.Format);
    }
    
    if(req.query.TransportKey!==undefined) {
        return processPayment(req, res);
    }
    
    return renderer.renderErrorResponse(res, "FAILED", "Unsupported function");

});

// Process a payment via Genius
function processPayment(req, res) {    
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
}

// MW4 Credit Mock - currently only supports 'Refund'
Sandbox.define('/Merchantware/ws/RetailTransaction/v4/Credit.asmx','POST', function(req, res) {
    // Check the request, make sure it is a compatible type
    if(req.xmlDoc.get("//*[local-name()='Refund']")===null) {
        return res.send(400); //TODO - send error deck
    }
    
    var txnToken = req.xmlDoc.get("//*[local-name()='token']").text(); // TODO - error checking
    // Find the transaction by token
    var txn = _.find(state.completedTransactions, { 'txnToken': txnToken });

    // Check for an override - limit it?
    var overrideAmount = req.xmlDoc.get("//*[local-name()='overrideAmount']").text();

    // Set the type of response, sets the content type.
    res.type('application/soap+xml');

    // Set the status code of the response.
    res.status(200);

//<ApprovalStatus>FAILED;1113;cannot exceed sales cap</ApprovalStatus>

//<AuthorizationCode>Cannot_Exceed_Sales_Cap</AuthorizationCode>

    if(overrideAmount===null || overrideAmount==="") {
        // Full refund.
        res.render('SOAP/FullRefund',{
            approvalStatus: overrideAmount,//"APPROVED",
            cardType: "4", // VISA
            entryMode: "1", // KEYED - i.e. the refund was keyed - txn token
            invoiceNumber:"123", // TODO - repeat invoice number in request
            token: utils.txnToken(), // Generate a new transaction token
            transactionDate: utils.getCurrentDate(),
            transactionType: "2" // Refund
        });
    } else if(overrideAmount > txn.amount) {
        // Refund requested is greater than original txn amount
        res.render('SOAP/FailedRefund',{
                amount: overrideAmount,
                approvalStatus: overrideAmount,//"FAILED;1113;cannot exceed sales cap",
                authorizationCode: "Cannot_Exceed_Sales_Cap",
                cardType: "4", // VISA
                entryMode: "1", // KEYED - i.e. the refund was keyed - txn token
                invoiceNumber:"123", // TODO - repeat invoice number in request
                token: utils.txnToken(), // Generate a new transaction token
                transactionDate: utils.getCurrentDate(),
                transactionType: "2" // Refund
            });
    } else {
        res.render('SOAP/Refund',{
                amount: overrideAmount,
                approvalStatus: "APPROVED",
                cardType: "4", // VISA
                entryMode: "1", // KEYED - i.e. the refund was keyed - txn token
                invoiceNumber:"123", // TODO - repeat invoice number in request
                token: utils.txnToken(), // Generate a new transaction token
                transactionDate: utils.getCurrentDate(),
                transactionType: "2" // Refund
            });
    }
});