/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Write your transction processor functions here
 */

/**
 * Issueing tokens before the moment when somebody actually receives them
 * @param {loyaltynetwork.issueTokens} issueTokens
 * @transaction
 */
async function issueTokens(tx) {
    const factory = getFactory();
    const tokenAssetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const participantRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    var allTokens = await tokenAssetRegistry.getAll();
    let i;

    for(i = 1; i <= tx.issuedTokens; i++){
        var idNumber = allTokens.length + i;
        var token = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token' + idNumber.toString());
        token.owner = tx.issuer;
        token.issuer = tx.issuer;
        await tokenAssetRegistry.add(token);
        tx.issuer.tokens.push(token);
    }
   
    await participantRegistry.update(tx.issuer);

    // Emit an event for the modified asset.
    // let event = getFactory().newEvent('loyaltynetwork', 'SampleEvent');
    // event.asset = tx.asset;
    // event.oldValue = oldValue;
    // event.newValue = tx.newValue;
    // emit(event);
}

/**
 * The transaction when a Customer buys something and earns tokens for his/her purchase(s)
 * @param {loyaltynetwork.earnTokens} earnTokens
 * @transaction
 */
async function earnTokens(tx) {
    let i; 
    const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');

    for(i = 0; i< tx.earnedTokens; i++){
        var token = tx.issuer.tokens.pop();
        token.owner = tx.earner;
        await assetRegistry.update(token);
        tx.earner.tokens.push(token);
    }

    await customerRegistry.update(tx.earner);
    await providerRegistry.update(tx.issuer);

}

/**
 * A redeem transaction when a customer wants to redeem his/her tokens at a Partner or a Provider
 * @param {loyaltynetwork.redeemTokens} redeemTokens
 * @transaction
 */
async function redeemTokens(tx) {
    let i; 
    const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');

    if(tx.redeemer.tokens.length < tx.redeemedTokens){
        throw new Error('Insufficient tokens to redeem');
    }

    if(tx.redeemer.tokens.length >= tx.redeemedTokens){
        for(i = 0; i < tx.redeemedTokens; i++){
            var token = tx.redeemer.tokens.pop();
            token.owner = tx.accepter;
            await assetRegistry.update(token);
            tx.accepter.tokens.push(token);
        }

        if(tx.accepter.role == "Partner"){
            await partnerRegistry.update(tx.accepter);
        }

        
        if(tx.accepter.role == "Provider"){
            await providerRegistry.update(tx.accepter);
        }
       
        await customerRegistry.update(tx.redeemer);
    }

    
}

/**
 * A transaction when a customers wants to trade his/her tokens with another customer
 * @param {loyaltynetwork.tradeTokens} tradeTokens
 * @transaction
 */
async function tradeTokens(tx) {
    const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const participantRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    let i; 
    
    if(tx.sender.tokens.length < tx.amountOfTokens){
        throw new Error('Insufficient tokens to trade');
    }

    if(tx.sender.tokens.length >= tx.amountOfTokens){
        for(i = 0; i< tx.amountOfTokens; i++){
            var token = tx.sender.tokens.pop();
            token.owner = tx.receiver;     
            await assetRegistry.update(token);
            tx.receiver.tokens.push(token);
        }

        await participantRegistry.update(tx.sender);
        await participantRegistry.update(tx.receiver);
    }

}

/**
 * A transaction when a customers wants to join a loyalty program
 * @param {loyaltynetwork.joinProgram} joinProgram
 * @transaction
 */
async function joinProgram(tx) {

    if(tx.joiner.role == "Customer"){
        tx.programOwner.customers.push(tx.joiner);
        tx.joiner.providers.push(tx.programOwner);
        const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
        await customerRegistry.update(tx.joiner);
        const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await providerRegistry.update(tx.programOwner);
    }

    if(tx.joiner.role == "Partner"){
        tx.programOwner.partners.push(tx.joiner);
        tx.joiner.provider = tx.programOwner;
        const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
        await partnerRegistry.update(tx.joiner);
        const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await providerRegistry.update(tx.programOwner);
    }

}

/**
 * A transaction when a customers wants to exit a loyalty program
 * @param {loyaltynetwork.exitProgram} exitProgram
 * @transaction
 */
async function exitProgram(tx) {

    if(tx.exiter.role == "Customer"){
        tx.programOwner.customers.splice(tx.programOwner.customers.indexOf(tx.exiter), 1);
        tx.exiter.providers.splice(tx.exiter.providers.indexOf(tx.programOwner), 1);
        const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
        await customerRegistry.update(tx.exiter);
        const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await providerRegistry.update(tx.programOwner);
    }

    if(tx.exiter.role == "Partner"){
        tx.programOwner.partners.splice(tx.programOwner.partners.indexOf(tx.exiter), 1);
        tx.exiter.provider = {};
        const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
        await partnerRegistry.update(tx.exiter);
        const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await providerRegistry.update(tx.programOwner);
    }

}

/**
 * A transaction when a customers wants to exit a loyalty program
 * @param {loyaltynetwork.returnIssuedTokensByProvider} returnIssuedTokensByProvider
 * @returns {Integer} 
 * @transaction
 */
async function returnIssuedTokensByProvider(tx) {
    var transactionArray = await query('selectAllIssuedTokenTransactions');
    let totalIssuedTokens = 0;
    let i;

    for(i = 0; i < transactionArray.length; i++){
        if(tx.issuer == transactionArray[i].issuer){
            totalIssuedTokens += transactionArray[i].issuedTokens.length;
        }
    }

    return totalIssuedTokens;

}

/**
 * A transaction which returns the transaction of a particular user involved
 * @param {loyaltynetwork.returnTransactionsByUser} returnTransactionByUser
 * @returns {org.hyperledger.composer.system.Transaction[]} 
 * @transaction
 */
async function returnTransactionsByUser(tx) {
    let transactions = []; 

    if(tx.role == "Customer") {
        let allJoinTransactions = await query('selectAllJoinProgramTransactionsByCustomer', { customer: tx.resourceString});
        let allExitTransactions = await query('selectAllExitProgramTransactionsByCustomer', { customer: tx.resourceString});
        let allEarnTransactions = await query('selectAllEarnTokenTransactionsByCustomer', { customer: tx.resourceString});
        let allRedeemTransactions = await query('selectAllRedeemedTokenTransactionsByCustomer', { customer: tx.resourceString});
        let allTradeTransactions = await query('selectAllTradeTokenTransactionsByCustomer', { customer: tx.resourceString});
        transactions.concat(allJoinTransactions, allExitTransactions, allEarnTransactions, allRedeemTransactions, allTradeTransactions);
    }

    if(tx.role == "Partner") {
        let allEarnTransactions = await query('selectAllEarnTokenTransactionsByProviderOrPartner', { provider: tx.resourceString});
        let allRedeemTransactions = await query('selectAllRedeemedTokenTransactionsByProviderOrPartner', { provider: tx.resourceString});
        transactions.concat(allEarnTransactions, allRedeemTransactions);
    }

    if(tx.role == "Provider") {
        let allJoinTransactions = await query('selectAllJoinProgramTransactionsByProvider', { provider: tx.resourceString});
        let allExitTransactions = await query('selectAllExitProgramTransactionsByProvider', { provider: tx.resourceString});
        let allEarnTransactions = await query('selectAllEarnTokenTransactionsByProviderOrPartner', { provider: tx.resourceString});
        let allRedeemTransactions = await query('selectAllRedeemedTokenTransactionsByProviderOrPartner', { provider: tx.resourceString});
        let allIssueTransactions = await query('selectAllIssuedTokenTransactionsByProvider', { provider: tx.resourceString});
        transactions.concat(allJoinTransactions, allExitTransactions, allEarnTransactions, allRedeemTransactions, allIssueTransactions);
    }

    return transactions;

}

/**
 * A transaction to initiate the network with some dummy data
 * @param {loyaltynetwork.initiateNetwork} initiateNetwork
 * @transaction
 */
async function initiateNetwork(tx) {
    //retrieving registries and factories to create and add the different resources
    const tokenRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    const factory = getFactory();

    //adding tokens
    var token1 = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token1');
    var token2 = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token2');
    var token3 = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token3');
    var token4 = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token4');
    var token5 = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token5');

    //adding customers
    var customer1 = factory.newResource('loyaltynetwork', 'Customer', 'Henk1');
    customer1.firstName = "Henk";
    customer1.lastName = "Sentjens";
    customer1.email = "henk@gmail.com";
    customer1.role = "Customer";
    customer1.tokens = [];
    customer1.providers = [];

    var customer2 = factory.newResource('loyaltynetwork', 'Customer', 'Kees1');
    customer2.firstName = "Kees";
    customer2.lastName = "Boer";
    customer2.email = "kees.boer@gmail.com";
    customer2.role = "Customer";
    customer2.tokens = [];
    customer2.providers = [];

    var customer3 = factory.newResource('loyaltynetwork', 'Customer', 'Piet1');
    customer3.firstName = "Piet";
    customer3.lastName = "Oosterhout";
    customer3.email = "piet@gmail.com"
    customer3.role = "Customer";
    customer3.tokens = [];
    customer3.providers = [];
    
    //adding partners
    var partner1 = factory.newResource('loyaltynetwork', 'LoyaltyPartner', 'Keeskroket1');
    partner1.companyName = "Kees Kroket";
    partner1.email = "kees.kroket@gmail.com";
    partner1.role = "Partner";
    partner1.tokens = [];
    partner1.provider = provider1;

    var partner2 = factory.newResource('loyaltynetwork', 'LoyaltyPartner', 'Hanscurryworst1');
    partner2.companyName = "Hans Curryworst";
    partner2.email = "hans@gmail.com";
    partner2.role = "Partner";
    partner2.tokens = [];
    partner2.provider = provider1;

    //adding providers
    var provider1 = factory.newResource('loyaltynetwork', 'LoyaltyProvider', 'Action0');
    provider1.companyName = "Action";
    provider1.partners = [];
    provider1.customers = [customer1, customer2, customer3]
    provider1.email = "action@gmail.com";
    provider1.role = "Provider";
    provider1.tokens = [];


    //adding the provider to the customers and partners
    partner1.provider = provider1;
    partner2.provider = provider1;
    customer1.providers = [provider1];
    customer2.providers = [provider1];
    customer3.providers = [provider1];
    partner1.tokens = [token1];
    partner2.tokens = [token2];
    customer1.tokens = [token3];
    customer2.tokens = [token4];
    customer3.tokens = [token5];

    //adding owner and issuers to the tokens
    token1.owner = partner1;
    token2.owner = partner2;
    token3.owner = customer1;
    token4.owner = customer2;
    token5.owner = customer3;
    token1.issuer = provider1;
    token2.issuer = provider1;
    token3.issuer = provider1;
    token4.issuer = provider1;
    token5.issuer = provider1;


    //adding everything to the network
    await customerRegistry.addAll([customer1, customer2, customer3]);
    await partnerRegistry.addAll([partner1, partner2]);
    await providerRegistry.add(provider1);
    await tokenRegistry.addAll([token1, token2, token3, token4, token5]);
}

