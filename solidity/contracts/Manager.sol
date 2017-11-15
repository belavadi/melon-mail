pragma solidity 0.4.18;

contract Manager {

    modifier onlyAdmins {
        require(admins[msg.sender] == true);
        _;
    }

    mapping(address => bool) public admins;

    address public activeContract;

    function Manager() public {
        admins[msg.sender] = true;
    }

    function setActiveContract(address newContract) public onlyAdmins {
        require(newContract != 0x0);

        activeContract = newContract;
    }

    // handle the admin logic 
    function addAdmin(address adminAddress) public onlyAdmins {
        admins[adminAddress] = true;
    }

    function removeAdmin(address adminAddress) public onlyAdmins {
        admins[adminAddress] = false;
    }

}