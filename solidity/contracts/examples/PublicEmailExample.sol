pragma solidity ^0.4.16;

import '../AbstractEmail.sol';

///@title This is an example of a user written Email contract where an admin registers users
///@dev Contract is an example of a user defined contract that implements the standard AbstractEmail interface
///@dev We have a custom registration logic here so only an admin can approve mails for registration
contract PublicEmailExample is AbstractEmail {

    modifier onlyOwner {
        require(owner == msg.sender);
        _;
    }

    mapping (bytes32 => bool) usernameHashExists;
    mapping(address => bool) public admins;
    mapping(address => bool) public approvedAddresses;

    address public owner;
    
    event UserRegistered(bytes32 indexed usernameHash, address indexed addr, string encryptedUsername, string publicKey);
    event EmailSent(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    event ContactsUpdated(bytes32 indexed usernameHash, string ipfsHash);

    function PublicEmailExample() public {
        owner = msg.sender;
    }

    function approveUser(address usernameAddress) public {
        require(admins[msg.sender] == true);

        approvedAddresses[usernameAddress] = true;
    }
  
    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey) public {
        require(usernameHashExists[usernameHash] == false && approvedAddresses[msg.sender] == true);

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

    function updateContacts(bytes32 usernameHash, string ipfsHash) public {
        ContactsUpdated(usernameHash, ipfsHash);
    }

    function addAdmin(address adminAddress) public onlyOwner {
        admins[msg.sender] = true;
    }

    function removeAdmin(address adminAddress) public onlyOwner {
        admins[msg.sender] = false;
    }
}