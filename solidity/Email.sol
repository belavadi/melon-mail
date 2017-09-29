pragma solidity ^0.4.16;

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
    
    event SendExternalEmail(address indexed from, address recieversRegistar, bytes32 recieversNode, string mailHash, string threadHash, bytes32 indexed threadId);
    event ReceiveExternalEmail(address indexed to, address sendersRegistar, bytes32 sendersNode, string mailHash, string threadHash, bytes32 indexed threadId);
    
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
    
    function getEncryptedUsername(address userAddress) returns (string) {
        return addressToEncryptedUsername[userAddress];
    }

    function internalEmail(address to, string mailHash, string threadHash, bytes32 threadId) {
        InternalEmail(msg.sender, to, mailHash, threadHash, threadId);
    }
    
    function sendExternalEmail(address from, address registar, bytes32 node, string mailHash, string threadHash, bytes32 threadId) {
        SendExternalEmail(from, registar, node, mailHash, threadHash, threadId);
    }
    
    function receiveExternalEmail(address to, address registar, bytes32 node, string mailHash, string threadHash, bytes32 threadId) {
        ReceiveExternalEmail(to, registar, node, mailHash, threadHash, threadId);
    }
}
