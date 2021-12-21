// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./OpenZeppelin/token/ERC20/ERC20.sol";

// WigoToken
contract WigoToken is ERC20("WigoSwap Token", "WIGO") {
    uint256 private constant MAX_SUPPLY = 2000000000e18;
    uint256 public _totalMinted = 0;
    uint256 public _totalBurned = 0;
    address public treasuryAddr;

    event Mint(address indexed sender, address indexed to, uint256 amount);
    event Burn(address indexed sender, address indexed from, uint256 amount);

    constructor(address _treasuryAddr) public {
        treasuryAddr = _treasuryAddr;

        // Mints 160,000,000 WIGO (8%) for Airdrop, IDO and Seed Funders.
        _mint(treasuryAddr, 160000000e18);
        _totalMinted = _totalMinted.add(160000000e18);
        emit Mint(msg.sender, treasuryAddr, 160000000e18);
    }

    function maxSupply() public pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function totalMinted() public view returns (uint256) {
        return _totalMinted;
    }

    function totalBurned() public view returns (uint256) {
        return _totalBurned;
    }

    /// @notice Must only be called by the owner (MasterFarmer).
    function mint(address _to, uint256 _amount) public onlyOwner {
        require(
            totalSupply().add(_amount) <= MAX_SUPPLY,
            "ERC20: minting more than maxSupply"
        );
        _mint(_to, _amount);
        _totalMinted = _totalMinted.add(_amount);
        emit Mint(msg.sender, _to, _amount);
    }

    /// @notice Burns only from treasury address. Must only be called by MasterFarmer.
    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
        _totalBurned = _totalBurned.add(_amount);
        emit Burn(msg.sender, _from, _amount);
    }
}
