// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import {Test} from 'forge-std/Test.sol';
interface ILivePass {
 function ownerOf(uint256) external view returns(address);
 function tokenURI(uint256) external view returns(string memory);
 function totalMinted() external view returns(uint256);
 function totalBurned() external view returns(uint256);
 function mintingOpen() external view returns(bool);
 function mintGenesis() external returns(uint256);
 function mintMystery() external returns(uint256);
 function reveal(uint256) external returns(uint256);
 function revealStatusOf(uint256) external view returns(uint8);
 function pendingReveals() external view returns(uint256);
 function BMC() external view returns(address);
}
interface ILiveBMC {
 function totalSupply() external view returns(uint256);
 function balanceOf(address) external view returns(uint256);
 function allowance(address,address) external view returns(uint256);
 function approve(address,uint256) external returns(bool);
}
contract LiveDeployedPassTest is Test {
 ILivePass constant pass=ILivePass(0x92789D9bb680a2Db8617270a530E9D0f80b48641);
 ILiveBMC constant bmc=ILiveBMC(0x38224239f2BDae357D47cb864BC533d7f72dF961);
 address constant founder=0x83027AD9d0D5374335086c539dADD1db983441B0;
 function test_ActualDeployedGenesisExactBurnAndOwner() public {
  assertTrue(pass.mintingOpen()); assertEq(pass.BMC(),address(bmc)); assertEq(pass.ownerOf(1),founder);
  address buyer=makeAddr('fork-only-buyer');deal(address(bmc),buyer,2_000_000 ether);
  uint256 supply=bmc.totalSupply();uint256 burned=pass.totalBurned();uint256 next=pass.totalMinted()+1;
  vm.startPrank(buyer);bmc.approve(address(pass),1_000_000 ether);uint256 id=pass.mintGenesis();vm.stopPrank();
  assertEq(id,next);assertEq(pass.ownerOf(id),buyer);assertEq(bmc.balanceOf(buyer),1_000_000 ether);
  assertEq(bmc.totalSupply(),supply-1_000_000 ether);assertEq(pass.totalBurned(),burned+1_000_000 ether);assertEq(bmc.allowance(buyer,address(pass)),0);
 }
 function test_ActualDeployedMysteryAndReveal() public {
  address buyer=makeAddr('fork-only-mystery-buyer');deal(address(bmc),buyer,50_000_000 ether);
  vm.startPrank(buyer);
  while(pass.totalMinted()<40){bmc.approve(address(pass),1_000_000 ether);pass.mintGenesis();}
  uint256 supply=bmc.totalSupply();uint256 balance=bmc.balanceOf(buyer);
  bmc.approve(address(pass),350_000 ether);uint256 id=pass.mintMystery();
  assertEq(id,41);assertEq(pass.ownerOf(id),buyer);assertEq(bmc.balanceOf(buyer),balance-350_000 ether);assertEq(bmc.totalSupply(),supply-350_000 ether);assertEq(pass.pendingReveals(),1);
  assertEq(pass.reveal(1),0);vm.roll(block.number+2);vm.setBlockhash(block.number-1,keccak256('fork-test-hash'));
  assertEq(pass.reveal(1),1);assertEq(pass.pendingReveals(),0);assertEq(pass.revealStatusOf(id),3);vm.stopPrank();
 }
 function test_ActualDeployedInsufficientApprovalRevertsWithoutBurn() public {
  address buyer=makeAddr('fork-only-low-allowance');deal(address(bmc),buyer,1_000_000 ether);
  uint256 supply=bmc.totalSupply();uint256 count=pass.totalMinted();vm.startPrank(buyer);bmc.approve(address(pass),999_999 ether);vm.expectRevert();pass.mintGenesis();vm.stopPrank();
  assertEq(pass.totalMinted(),count);assertEq(bmc.totalSupply(),supply);assertEq(bmc.balanceOf(buyer),1_000_000 ether);
 }
}
