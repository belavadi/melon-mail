pragma solidity ^0.4.16;

contract EmailStorage {
    
    modifier onlyOwners {
        require(owners[msg.sender] == true);
        _;
    }
    
    mapping(bytes32 => bool) usernameHashExists;
    mapping(address => bool) owners;
    
    event UserRegistered(bytes32 indexed usernameHash, address indexed addr, string encryptedUsername, string publicKey);
    event EmailSent(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    event ContactsUpdated(bytes32 indexed usernameHash, string ipfsHash);
    
    function EmailStorage() public {
        owners[msg.sender] = true;
    }
    
    function callUserRegistered(bytes32 usernameHash, address addr, string encryptedUsername, string publicKey) public onlyOwners {
        UserRegistered(usernameHash, addr, encryptedUsername, publicKey);
    }
    
    function callEmailSent(address from, address to, string mailHash, string threadHash, bytes32 threadId) public onlyOwners {
        EmailSent(from, to, mailHash, threadHash, threadId);
    }
    
    function callContactsUpdated(bytes32 usernameHash, string ipfsHash) public onlyOwners {
        ContactsUpdated(usernameHash, ipfsHash);
    }
    
    function getUsernamHashMapping(bytes32 usernameHash) public constant onlyOwners returns(bool) {
        return usernameHashExists[usernameHash];
    }
    
    function setUsernamHashMapping(bytes32 usernameHash) public onlyOwners {
        require(usernameHashExists[usernameHash] == false);

        usernameHashExists[usernameHash] = true;
    }
    
    //owner modification
    function addOwner(address _address) public onlyOwners {
        owners[_address] = true;
    }
    
    function removeOwner(address _address) public onlyOwners {
        owners[_address] = false;
    }
}