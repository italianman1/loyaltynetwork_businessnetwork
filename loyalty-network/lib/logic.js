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

    var issuedTokens = [];

    let i;

    for(i = 0; i< issuedTokens; i++){
        const tokenAssetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
        var factory = getFactory();
        var randomNumber = Math.floor((Math.random() * 100000) + 1);
        var token = await factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token' + randomNumber.toString());   
        token.owner = tx.issuer;
        issuedTokens.push(token);
        await tokenAssetRegistry.add(token);
    }

    tx.issuer.tokens.push(issuedTokens);
    const participantRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
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
    var earnedTokens = [];

    let i; 

    for(i = 0; i< earnedTokens; i++){
        var token = tx.issuer.tokens.pop();
        token.owner = tx.earner;
        earnedTokens.push(token);
        const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
        await assetRegistry.update(token);
    }

    tx.earner.tokens.push(earnedTokens);
    const userRegistry = await getParticipantRegistry('loyaltynetwork.User');
    await userRegistry.update(tx.earner);
    await userRegistry.update(tx.issuer);

}

/**
 * A redeem transaction when a customer wants to redeem his/her tokens at a Partner or a Provider
 * @param {loyaltynetwork.redeemTokens} redeemTokens
 * @transaction
 */
async function redeemTokens(tx) {
    var redeemedTokens = [];

    let i; 

    if(tx.redeemer.tokens.length > tx.redeemedTokens){
        for(i = 0; i< redeemedTokens; i++){
            var token = tx.redeemer.tokens.pop();
            token.owner = tx.accepter;
            redeemedTokens.push(token);
            const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
            await assetRegistry.update(token);
        }
    
        tx.accepter.tokens.push(redeemedTokens);
        const userRegistry = await getParticipantRegistry('loyaltynetwork.User');
        await userRegistry.update(tx.accepter);
        await userRegistry.update(tx.redeemer);
    }

    if(tx.redeemer.tokens.length < tx.redeemedTokens){
        throw new Error('Insufficient tokens to redeem');
    }
   

}

/**
 * A transaction when a customers wants to trade his/her tokens with another customer
 * @param {loyaltynetwork.tradeTokens} tradeTokens
 * @transaction
 */
async function tradeTokens(tx) {

    var tradedTokens = [];

    let i; 

    if(tx.sender.tokens.length > tx.amountOfTokens){
        for(i = 0; i< amountOfTokens; i++){
            var token = tx.sender.tokens.pop();
            token.owner = tx.receiver;     
            tradedTokens.push(token);
            const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
            await assetRegistry.update(token);
        }

        tx.receiver.tokens.push(tradedTokens);
        const participantRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
        await participantRegistry.update(tx.sender);
        await participantRegistry.update(tx.receiver);
    }

    if(tx.sender.tokens.length < tx.amountOfTokens){
        throw new Error('Insufficient tokens to trade');
    }
    

}

/**
 * A transaction when a customers wants to join a loyalty program
 * @param {loyaltynetwork.joinProgram} joinProgram
 * @transaction
 */
async function joinProgram(tx) {
    if(tx.joiner.role == "Customer"){
        tx.programOwner.customers.add(joiner);
        tx.joiner.providers.add(programOwner);
        const participantRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await participantRegistry.update(tx.joiner);
        await participantRegistry.update(tx.programOwner);
    }

    if(tx.joiner.role == "Partner"){
        tx.programOwner.partners.add(joiner);
        tx.joiner.provider = programOwner;
        const participantRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await participantRegistry.update(tx.joiner);
        await participantRegistry.update(tx.programOwner);
    }

}

/**
 * A transaction when a customers wants to exit a loyalty program
 * @param {loyaltynetwork.exitProgram} exitProgram
 * @transaction
 */
async function exitProgram(tx) {
    if(tx.joiner.role == "Customer"){
        tx.programOwner.customers.add(joiner);
        tx.joiner.providers.add(programOwner);
        const participantRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await participantRegistry.update(tx.joiner);
        await participantRegistry.update(tx.programOwner);
    }

    if(tx.joiner.role == "Partner"){
        tx.programOwner.partners.add(joiner);
        tx.joiner.provider = programOwner;
        const participantRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await participantRegistry.update(tx.joiner);
        await participantRegistry.update(tx.programOwner);
    }

}

/**
 * A transaction to initiate the network with some dummy data
 * @param {loyaltynetwork.initiateNetwork} initiateNetwork
 * @transaction
 */
async function initiateNetwork(tx) {
    //retrieving registries and factories to create and add the different resources
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    const factory = getFactory();

    //adding customers
    var customer1 = factory.newResource('loyaltynetwork', 'Customer', 'Henk1');
    customer1.firstName = "Henk";
    customer1.lastName = "Sentjens";
    customer1.providers = [];

    var customer2 = factory.newResource('loyaltynetwork', 'Customer', 'Kees1');
    customer2.firstName = "Kees";
    customer2.lastName = "Boer";
    customer2.providers = [];

    var customer3 = factory.newResource('loyaltynetwork', 'Customer', 'Piet1');
    customer3.firstName = "Piet";
    customer3.lastName = "Oosterhout";
    customer3.providers = [];

    await customerRegistry.addAll([customer1, customer2, customer3]);
    
    //adding partners
    var partner1 = factory.newResource('loyaltynetwork', 'LoyaltyPartner', 'Keeskroket1');
    partner1.companyName = "Kees Kroket";
    partner1.provider = ''

    var partner2 = factory.newResource('loyaltynetwork', 'LoyaltyPartner', 'Hanscurryworst1');
    partner2.companyName = "Hans Curryworst";

    await partnerRegistry.addAll([partner1, partner2]);

    //adding providers
    var provider1 = factory.newResource('loyaltynetwork', 'LoyaltyProvider', 'Action0');
    provider1.companyName = "Action";
    provider1.partners = [];
    provider1.customers = [customer1, customer2, customer3]

    await providerRegistry.add(provider1);

    //adding the provider to the customers and partners
    partner1.provider = provider1;
    partner2.provider = provider1;
    customer1.providers = [provider1];
    customer2.providers = [provider1];
    customer3.providers = [provider1];

    //updating customers and partners
    await customerRegistry.updateAll([customer1, customer2, customer3]);
    await partnerRegistry.updateAll([partner1, partner2]);
}

