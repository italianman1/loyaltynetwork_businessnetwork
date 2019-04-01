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

    var IssuedTokens = [];

    let i;

    for(i = 0; i< issuedTokens; i++){
        const tokenAssetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
        var factory = getFactory();
        var randomNumber = Math.floor((Math.random() * 100000) + 1);
        var token = await factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token' + randomNumber.toString());   
        token.owner = tx.issuer;
        issuedTokens.add(token);
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
    for(i = 0; i< earnedTokens; i++){
        var token = tx.issuer.tokens.pop();
        tx.earner.tokens.add(token);
        token.owner = tx.earner;
        const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
        await assetRegistry.update(token);
    }

    const participantRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    await participantRegistry.update(tx.earner);
    await participantRegistry.update(tx.issuer);

}

/**
 * A redeem transaction when a customer wants to redeem his/her tokens at a Partner or a Provider
 * @param {loyaltynetwork.redeemTokens} redeemTokens
 * @transaction
 */
async function redeemTokens(tx) {
    for(i = 0; i< redeemedTokens; i++){
        var token = tx.redeemer.tokens.pop();
        tx.accepter.tokens.add(token);
        token.owner = tx.accepter;
        const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
        await assetRegistry.update(token);
    }

    const participantRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    await participantRegistry.update(tx.accepter);
    await participantRegistry.update(tx.redeemer);

}

/**
 * A transaction when a customers wants to trade his/her tokens with another customer
 * @param {loyaltynetwork.tradeTokens} tradeTokens
 * @transaction
 */
async function tradeTokens(tx) {
    for(i = 0; i< amountOfTokens; i++){
        var token = tx.sender.tokens.pop();
        tx.receiver.tokens.add(token);
        token.owner = tx.receiver;                         
        const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
        await assetRegistry.update(token);
    }

    const participantRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    await participantRegistry.update(tx.sender);
    await participantRegistry.update(tx.receiver);

}

/**
 * A transaction when a customers wants to trade his/her tokens with another customer
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
 * A transaction when a customers wants to trade his/her tokens with another customer
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

