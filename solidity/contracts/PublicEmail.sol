pragma solidity ^0.4.18;

import './AbstractEmail.sol';

contract PublicEmail is AbstractEmail {
    mapping (bytes32 => bool) usernameHashExists;
    
    event UserRegistered(bytes32 indexed usernameHash, address indexed addr, string encryptedUsername, string publicKey);
    event EmailSent(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    event ContactsUpdated(bytes32 indexed usernameHash, string fileHash);

    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey) public {
        require(usernameHashExists[usernameHash] == false);

        usernameHashExists[usernameHash] = true;

        UserRegistered(usernameHash, msg.sender, encryptedUsername, publicKey);
    }

    function sendEmail(address[] recipients, string mailHash, string threadHash, bytes32 threadId) public {
        
        for (uint i = 0; i < recipients.length; ++i) {
            EmailSent(tx.origin, recipients[i], mailHash, threadHash, threadId);
        }
    }

    function sendExternalEmail(AbstractEmail externalContractAddress, address[] recipients, string mailHash, string threadHash, bytes32 threadId) public {
        sendEmail(recipients, mailHash, threadHash, threadId);

        AbstractEmail externalEmailContract = AbstractEmail(externalContractAddress);
        externalEmailContract.sendEmail(recipients, mailHash, threadHash, threadId);
    }

    function updateContacts(bytes32 usernameHash, string fileHash) public {
        ContactsUpdated(usernameHash, fileHash);
    }
}