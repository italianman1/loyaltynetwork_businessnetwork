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
    let allTokens = await tokenAssetRegistry.getAll();
    let i;
    let highestIdNumber = 0;

    for(i = 0; i < allTokens.length; i++){ 
      let idNumber = parseInt(allTokens[i].tokenId.split('#')[1], 10);
      if(idNumber > highestIdNumber){
        highestIdNumber = idNumber;
      }
    }

    for(i = 1; i <= tx.issuedTokens; i++){
        let idNumber = highestIdNumber + i;
        let token = factory.newResource('loyaltynetwork', 'LoyaltyToken', 'Token#' + idNumber.toString());
        token.owner = tx.issuer;
        token.issuer = tx.issuer;
        await tokenAssetRegistry.add(token);
        tx.issuer.tokens.push(token);
    }

    tx.issuer.amountOfIssuedTokensInEuros += tx.amountOfEuros;
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
    let amountOfTokensThatAreEarned = 0; 
    let amountOfTokensToBeEarned;
    let amountOfTokensInReserve;
    const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');

    //calculate the amount of earned tokens from the amount of euros 
        amountOfTokensToBeEarned = tx.amountOfEuros * tx.issuer.conversionRate;
        amountOfTokensInReserve = tx.issuer.tokens.length;

        if(amountOfTokensInReserve < amountOfTokensToBeEarned){
            throw new Error('The token reserve is not enough to give out the tokens');
        }

        if(amountOfTokensInReserve >= amountOfTokensToBeEarned){
            for(i = 0; i < amountOfTokensInReserve; i++){
                let token = tx.issuer.tokens[i];
                if(token && token.issuer.userId == tx.issuer.userId){
                    tx.issuer.tokens.splice(i, 1);
                    token.owner = tx.earner;
                    await assetRegistry.update(token);
                    tx.earner.tokens.push(token);
                    await customerRegistry.update(tx.earner);
                    await providerRegistry.update(tx.issuer);
                    amountOfTokensThatAreEarned++;
                    i--;
                }
    
                if(amountOfTokensThatAreEarned >= amountOfTokensToBeEarned){
                    return;
                }
            }
        }
    }

/**
 * A redeem transaction when a customer wants to redeem his/her tokens at a Partner or a Provider
 * @param {loyaltynetwork.redeemTokens} redeemTokens
 * @transaction
 */
async function redeemTokens(tx) {
    let EurosThatAreRedeemed = 0;
    let EurosToBeRedeemed = 0;
    let totalTokenValue = 0;
    let amountOfTokensInReserve = 0;
    const assetRegistry = await getAssetRegistry('loyaltynetwork.LoyaltyToken');
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');

    //calculate the amount of the tokens to be redeemed from the amount of euros 
    EurosToBeRedeemed = tx.amountOfDiscount;
    amountOfTokensInReserve = tx.redeemer.tokens.length;

    //calculate the total worth of tokens 
    for(i = 0; i < amountOfTokensInReserve; i++) {
        let token = tx.redeemer.tokens[i];
        if(token){
            totalTokenValue += 1 / token.issuer.conversionRate; 
        }
    }

    if(totalTokenValue < EurosToBeRedeemed){
        throw new Error('The value of the tokens alltogether is insufficient to get the discount');
    }

    for(i = 0; i < amountOfTokensInReserve; i++){
        let token = tx.redeemer.tokens[i];
        if(token && token.issuer.userId == tx.accepter.userId && EurosThatAreRedeemed < EurosToBeRedeemed){
            tx.redeemer.tokens.splice(i, 1);
            EurosThatAreRedeemed += 1 / token.issuer.conversionRate;
            await assetRegistry.remove(token);
            i--;
        }

        if(EurosThatAreRedeemed >= EurosToBeRedeemed){
            return;
        }
    }

    if(EurosThatAreRedeemed < EurosToBeRedeemed){
        for(i = 0; i < amountOfTokensInReserve; i++) {
            let token = tx.redeemer.tokens[i];
            if(token && EurosThatAreRedeemed < EurosToBeRedeemed){
                tx.redeemer.tokens.splice(i, 1);
                EurosThatAreRedeemed += 1 / token.issuer.conversionRate;
                await assetRegistry.remove(token);
                i--;
            }
        }
    } 

    tx.accepter.amountOfRedeemedTokensInEuros += EurosThatAreRedeemed;
    await providerRegistry.update(tx.accepter);
    
   
    await customerRegistry.update(tx.redeemer);
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
            let token = tx.sender.tokens.pop();
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
        tx.programOwner.registrations.splice(tx.programOwner.registrations.indexOf(tx.joiner), 1);
        tx.programOwner.partners.push(tx.joiner);
        tx.joiner.provider = tx.programOwner;
        const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
        await partnerRegistry.update(tx.joiner);
        const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
        await providerRegistry.update(tx.programOwner);
    }

}

/**
 * A transaction when a customers wants to join a loyalty program
 * @param {loyaltynetwork.registerForAProgram} registerForAProgram
 * @transaction
 */
async function registerForAProgram(tx) {

    tx.programOwner.registrations.push(tx.register);
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    await providerRegistry.update(tx.programOwner);
}

/**
 * A transaction when a customers wants to join a loyalty program
 * @param {loyaltynetwork.declineForAProgram} declineForAProgram
 * @transaction
 */
async function declineForAProgram(tx) {
    tx.programOwner.registrations.splice(tx.programOwner.registrations.indexOf(tx.declinedPartner), 1);
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    await providerRegistry.update(tx.programOwner);
    const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
    await partnerRegistry.remove(tx.declinedPartner);
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
        tx.exiter.provider = null;
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
    const transactionArray = await query('selectAllIssuedTokenTransactions');
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
    let allTransactions = await query('selectAllTransactions');
   

    if(tx.user.role == "Customer") {
        allTransactions.forEach(transaction => {
            if(transaction.transactionType == "loyaltynetwork.joinProgram"){
                if(transaction.transactionInvoked.joiner == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            } 
            if(transaction.transactionType == "loyaltynetwork.exitProgram"){
                if(transaction.transactionInvoked.exiter == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            } 
            if(transaction.transactionType == "loyaltynetwork.earnTokens"){
                if(transaction.transactionInvoked.earner == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
            if(transaction.transactionType == "loyaltynetwork.redeemTokens"){
                if(transaction.transactionInvoked.redeemer == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
            if(transaction.transactionType == "loyaltynetwork.tradeTokens"){
                if(transaction.transactionInvoked.sender == tx.user || transaction.transactionInvoked.receiver == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
        });
    }

    if(tx.user.role == "Partner") {
        allTransactions.forEach(transaction => {
            if(transaction.transactionType == "loyaltynetwork.earnTokens"){
                if(transaction.transactionInvoked.issuer == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            } 
            if(transaction.transactionType == "loyaltynetwork.redeemTokens") {
                if(transaction.transactionInvoked.accepter == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
        });
    }

    if(tx.user.role == "Provider") {
        allTransactions.forEach(transaction => {
            transactions.push(transaction.transactionInvoked);
            if(transaction.transactionType == "loyaltynetwork.joinProgram"){
                if(transaction.transactionInvoked.programOwner == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            } 
            if(transaction.transactionType == "loyaltynetwork.exitProgram"){
                if(transaction.transactionInvoked.programOwner == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            } 
            if(transaction.transactionType == "loyaltynetwork.earnTokens"){
                if(transaction.transactionInvoked.issuer == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
            if(transaction.transactionType == "loyaltynetwork.redeemTokens"){
                if(transaction.transactionInvoked.accepter == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
            if(transaction.transactionType == "loyaltynetwork.issueTokens"){
                if(transaction.transactionInvoked.issuer == tx.user){
                    transactions.push(transaction.transactionInvoked);
                }
            }
        });
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
    const customerRegistry = await getParticipantRegistry('loyaltynetwork.Customer');
    const partnerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyPartner');
    const providerRegistry = await getParticipantRegistry('loyaltynetwork.LoyaltyProvider');
    const solutionProviderRegistry = await getParticipantRegistry('loyaltynetwork.SolutionProvider');
    const factory = getFactory();

    //create every instance
    var solutionprovider1 = factory.newResource('loyaltynetwork', 'SolutionProvider', 'Ctac0')
    var customer1 = factory.newResource('loyaltynetwork', 'Customer', 'Henk1');
    var customer2 = factory.newResource('loyaltynetwork', 'Customer', 'Kees1');
    var customer3 = factory.newResource('loyaltynetwork', 'Customer', 'Piet1');
    var partner1 = factory.newResource('loyaltynetwork', 'LoyaltyPartner', 'Keeskroket1');
    var partner2 = factory.newResource('loyaltynetwork', 'LoyaltyPartner', 'Hanscurryworst1');
    var provider1 = factory.newResource('loyaltynetwork', 'LoyaltyProvider', 'Action0');
    var provider2 = factory.newResource('loyaltynetwork', 'LoyaltyProvider', 'Praxis0');

    solutionprovider1.role = "SolutionProvider";

    //add solutionprovider to the network
    await solutionProviderRegistry.add(solutionprovider1);

    //editing the customers
    customer1.firstName = "Henk";
    customer1.lastName = "Sentjens";
    customer1.email = "henk@gmail.com";
    customer1.role = "Customer";
    customer1.tokens = [];
    customer1.providers = [provider1];

    customer2.firstName = "Kees";
    customer2.lastName = "Boer";
    customer2.email = "kees.boer@gmail.com";
    customer2.role = "Customer";
    customer2.tokens = [];
    customer2.providers = [provider1];

    //editing partner
    partner1.companyName = "Kees Kroket";
    partner1.email = "kees.kroket@gmail.com";
    partner1.role = "Partner";
    partner1.tokens = [];
    partner1.provider = provider1;

    //editing provider
    provider1.companyName = "Action";
    provider1.email = "action@gmail.com";
    provider1.role = "Provider";
    provider1.partners = [partner1];
    provider1.customers = [customer1, customer2];
    provider1.tokens = [];
    provider1.registrations = [];
    provider1.conversionRate = 1;
    provider1.amountOfRedeemedTokensInEuros = 0;
    provider1.amountOfIssuedTokensInEuros = 0;

     //adding the customers to the blockchain network
     await customerRegistry.addAll([customer1, customer2]);
     await partnerRegistry.add(partner1);
     await providerRegistry.add(provider1);


    //editing customer3
    customer3.firstName = "Piet";
    customer3.lastName = "Oosterhout";
    customer3.email = "piet@gmail.com"
    customer3.role = "Customer";
    customer3.tokens = [];
    customer3.providers = [provider2];
    
    //editing partner2
    partner2.companyName = "Hans Curryworst";
    partner2.email = "hans@gmail.com";
    partner2.role = "Partner";
    partner2.tokens = []; 
    partner2.provider = provider2;

   
    //editing provider2
    provider2.companyName = "Praxis";
    provider2.email = "praxis@gmail.com";
    provider2.role = "Provider";
    provider2.partners = [partner2];
    provider2.customers = [customer3];
    provider2.tokens = [];
    provider2.registrations = [];
    provider2.conversionRate = 5;
    provider2.amountOfRedeemedTokensInEuros = 0;
    provider2.amountOfIssuedTokensInEuros = 0;

    //adding the customer3 to the blockchain network
    await customerRegistry.add(customer3);

    //adding the partner2 to the blockchain network
    await partnerRegistry.add(partner2);

    //adding providers to the network
    await providerRegistry.add(provider2);


    // let actualProvider1 = await providerRegistry.get('Action0');
    // let actualProvider2 = await providerRegistry.get('Praxis0');
    // let actualPartner1 = await partnerRegistry.get('Keeskroket1');
    // let actualPartner2 = await partnerRegistry.get('Hanscurryworst1');
    // let actualCustomer1 = await customerRegistry.get('Henk1');
    // let actualCustomer2 = await customerRegistry.get('Kees1');
    // let actualCustomer3 = await customerRegistry.get('Piet1');

    // //adding providers to the customers and partners
    // actualCustomer1.providers = [actualProvider1];
    // actualCustomer2.providers = [actualProvider1];
    // actualCustomer3.providers = [actualProvider2];
    // actualPartner1.provider = actualProvider1;
    // actualPartner2.provider = actualProvider2;  

    // //update customers and partners
    // await customerRegistry.updateAll([actualCustomer1, actualCustomer2, actualCustomer3]);
    // await partnerRegistry.updateAll([actualPartner1, actualPartner2]);
    
    // //adding customers and partners to the providers
    // actualProvider1.partners = [actualPartner1];
    // actualProvider1.customers = [actualCustomer1, actualCustomer2];
    // actualProvider2.partners = [actualPartner2];
    // actualProvider2.customers = [actualCustomer3];

    // //update providers
    // await providerRegistry.updateAll([actualProvider1, actualProvider2]);
}

