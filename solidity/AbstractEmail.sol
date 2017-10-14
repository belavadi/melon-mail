pragma solidity ^0.4.16;

contract AbstractEmail {
    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey);
    function sendEmail(address to, string mailHash, string threadHash, bytes32 threadId);
    function sendExternalEmail(AbstractEmail externalContractAddress, address to, string mailHash, string threadHash, bytes32 threadId) ;
    function updateContacts(bytes32 usernameHash, string ipfsHash);
}