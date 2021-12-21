// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface IMasterFarmer {
    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function enterStaking(uint256 _amount) external;

    function leaveStaking(uint256 _amount) external;

    function pendingWigo(uint256 _pid, address _user) external view returns (uint256);

    function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256);
    
    function wigoBurn(uint256 _amount) external;

    function emergencyWithdraw(uint256 _pid) external;
}