// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./OpenZeppelin/token/ERC20/ERC20.sol";
import "./WigoToken.sol";

// WigoBank
contract WigoBank is ERC20("WigoBank Token", "xWIGO") {
    // The WIGO TOKEN!
    WigoToken public wigo;

    event Mint(address indexed sender, address indexed to, uint256 amount);
    event Burn(address indexed sender, address indexed from, uint256 amount);

    constructor(WigoToken _wigo) public {
        wigo = _wigo;
    }

    /// @notice Must only be called by the owner (MasterFarmer).
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
        emit Mint(msg.sender, _to, _amount);
    }

    /// @notice Must only be called by the owner (MasterFarmer).
    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
        emit Burn(msg.sender, _from, _amount);
    }

    // Safe wigo transfer function, just in case if rounding error causes pool to not have enough WIGOs.
    function safeWigoTransfer(address _to, uint256 _amount) public onlyOwner {
        uint256 wigoBal = wigo.balanceOf(address(this));
        if (_amount > wigoBal) {
            wigo.transfer(_to, wigoBal);
        } else {
            wigo.transfer(_to, _amount);
        }
    }
}
