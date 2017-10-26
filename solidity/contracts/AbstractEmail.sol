pragma solidity ^0.4.11;

contract AbstractEmail {
    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey) public;
    function sendEmail(address[] recipients, string mailHash, string threadHash, bytes32 threadId) public;
    function sendExternalEmail(AbstractEmail externalContractAddress, address[] recipients, string mailHash, string threadHash, bytes32 threadId) public;
    function updateContacts(bytes32 usernameHash, string ipfsHash) public;
}