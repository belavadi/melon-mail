pragma solidity 0.4.18;

import "./DelegateProxy.sol";
import "./Manager.sol";

contract Relay is DelegateProxy {
    
    Manager public manager;
    address owner;

    function Relay(address managerAddress) public {
        manager = Manager(managerAddress);
        owner = msg.sender;
    }

    function byzantiumUpgraded() public {
        require(msg.sender == owner);
        IS_BYZANTIUM = true;
    }

    function () payable public {
        delegatedFwd(manager.activeContract(), msg.data);
    }
}