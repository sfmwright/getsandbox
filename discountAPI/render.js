exports.renderSingleTenderResponse = function(res, validationKey, amount, format) {
    // Calculate the discount amount and charged amount. Force to 2dp
    var discountAmount = utils.getDiscount(amount);
    var chargedAmount = (amount - discountAmount).toFixed(2);
    
    // Generate a transaction token
    var txnToken = utils.txnToken();
    
    // Store the txn details against the token, to support refunds
    state.completedTransactions.push( {  txnToken: txnToken,
                                chargedAmount: parseFloat(chargedAmount),
                                amount: parseFloat(amount)});

    res.render(getTemplate(res,format,"applePayWithDiscountTemplate"), {
        amount: amount,
        validationKey: validationKey,
        discount: discountAmount,
        amountCharged: chargedAmount,
        txnDate: utils.getCurrentDate(),
        txnToken: txnToken
    });
};

exports.renderLoyaltyMultitenderResponse = function(res, validationKey, amount, format) {
    var loyaltyAmount = utils.getLoyaltyAmount(amount);
    var amountApproved = (amount - loyaltyAmount).toFixed(2);
    var discountAmount = utils.getDiscount(amountApproved);
    var amountCharged = (amountApproved - discountAmount).toFixed(2);
    
    // Create transaction tokens for both CC and Loyalty card payments

    res.render(getTemplate(res,format,"applePayMultitenderWithDiscountTemplate"), {
        amount: amount,
        validationKey: validationKey,
        loyaltyAmount: loyaltyAmount,
        discount: discountAmount,
        amountCharged: amountCharged,
        amountApproved: amountApproved,
        pointsEarned: 10,
        txnDate: utils.getCurrentDate(),
        txnToken: utils.txnToken()
    });
};

exports.renderErrorResponse = function(res, status, errorMessage, format) {

    res.render(getTemplate(res,format,"errorResponseTemplate"), {
        status: status,
        errorMessage: errorMessage
    });
};

exports.renderStatusResponse = function(res, format) {
    res.render(getTemplate(res,format,"statusResultTemplate"), {});
};

function getTemplate(res, format, file) {
    var directory="";
    
    if((/jsonp/i).test(format)) {
        directory="JSONP/";
        res.type('jsonp');
    } else if((/json/i).test(format)) {
        directory="JSON/";
        res.type('json');
    } else {
        // Default to the XML version
        directory="XML/";
        res.type('xml');
    }
    
    return directory + file;
}