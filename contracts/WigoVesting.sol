// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./OpenZeppelin/token/ERC20/IERC20.sol";
import "./OpenZeppelin/token/ERC20/TokenTimeLock.sol";
import "./OpenZeppelin/token/ERC20/SafeERC20.sol";
import "./OpenZeppelin/math/SafeMath.sol";

// To see openzepplin's audits goto: https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/audit
contract WigoVesting {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public wigo;
    IERC20 public wigoLP;
    address public coreTeam;
    address public seedFunder1;
    address public seedFunder2;

    TokenTimelock[] public Locks;

    event Release(uint256 lockNumber, address indexed beneficiary);

    constructor(
        IERC20 _wigo,
        IERC20 _wigoLP,
        address _coreTeam,
        address _seedFunder1,
        address _seedFunder2
    ) public {
        wigo = _wigo;
        wigoLP = _wigoLP;
        coreTeam = _coreTeam;
        seedFunder1 = _seedFunder1;
        seedFunder2 = _seedFunder2;
        uint256 currentTime = block.timestamp;

        // Seed Funder 1 Vesting Contracts
        createLock(wigo, seedFunder1, currentTime.add(60 days)); // Lock 0
        createLock(wigo, seedFunder1, currentTime.add(120 days)); // Lock 1
        createLock(wigo, seedFunder1, currentTime.add(180 days)); // Lock 2
        createLock(wigo, seedFunder1, currentTime.add(240 days)); // Lock 3

        // Seed Funder 2 Vesting Contracts
        createLock(wigo, seedFunder2, currentTime.add(60 days)); // Lock 4
        createLock(wigo, seedFunder2, currentTime.add(120 days)); // Lock 5
        createLock(wigo, seedFunder2, currentTime.add(180 days)); // Lock 6
        createLock(wigo, seedFunder2, currentTime.add(240 days)); // Lock 7

        // Core Team Vesting Contract
        createLock(wigoLP, coreTeam, currentTime.add(365 days)); // Lock 8
    }

    function createLock(
        IERC20 token,
        address sender,
        uint256 time
    ) internal {
        TokenTimelock lock = new TokenTimelock(token, sender, time);
        Locks.push(lock);
    }

    // Attempts to release tokens. This is done safely with
    // OpenZeppelin which checks the proper time has passed.
    // To see their code go to:
    // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/utils/TokenTimelock.sol
    function release(uint256 lock) external {
        Locks[lock].release();
        emit Release(lock, Locks[lock].beneficiary());
    }

    function getLockAddress(uint256 lock) external view returns (address) {
        require(lock <= 8, "getLockAddress: lock doesnt exist");
        return address(Locks[lock]);
    }

}