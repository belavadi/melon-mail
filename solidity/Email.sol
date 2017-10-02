pragma solidity ^0.4.16;

import './AbstractEmail.sol';

contract mortal {
    address public administrator;

    function mortal() {
        administrator = msg.sender;
    }

    function withdraw() {
        if (msg.sender == administrator) {
            while(!administrator.send(this.balance)){}
        }
    }

    function kill() {
        selfdestruct(administrator);
    }
}

contract Email is mortal {
    mapping (bytes32 => address) usernameHashToAddress;
    mapping (address => string) addressToEncryptedUsername;

    event BroadcastPublicKey(bytes32 indexed usernameHash, address indexed addr, string publicKey);

    event InternalEmail(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);

    event SendExternalEmail(address indexed from, string mailHash, string threadHash, bytes32 indexed threadId);
    event ReceiveExternalEmail(address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);

    function registerUser(bytes32 username, string encryptedUsername, string publicKey, string welcomeMailHash, string welcomeMailThreadHash) returns (bool) {
        if(usernameHashToAddress[sha3(username)] != 0x0) {
            return false;
        }

        usernameHashToAddress[sha3(username)] = msg.sender;
        addressToEncryptedUsername[msg.sender] = encryptedUsername;

        BroadcastPublicKey(sha3(username), msg.sender, publicKey);
        InternalEmail(msg.sender, msg.sender, welcomeMailHash, welcomeMailThreadHash, 0);

        return true;
    }

    function getEncryptedUsername() constant returns (string) {
        return addressToEncryptedUsername[msg.sender];
    }
    
    function getUsernameHash(bytes32 hashedUsername) constant returns (address) {
        return usernameHashToAddress[hashedUsername];
    }

    function internalEmail(address to, string mailHash, string threadHash, bytes32 threadId) {
        InternalEmail(msg.sender, to, mailHash, threadHash, threadId);
    }

    function sendExternalEmail(AbstractEmail contractAddress, address from, address to, string mailHash, string threadHash, bytes32 threadId) {
        AbstractEmail externalEmail = contractAddress;

        SendExternalEmail(from, mailHash, threadHash, threadId);
        externalEmail.receiveExternalEmail(to, mailHash, threadHash, threadId);
    }

    function receiveExternalEmail(address to, string mailHash, string threadHash, bytes32 threadId) {
        ReceiveExternalEmail(to, mailHash, threadHash, threadId);
    }
}
