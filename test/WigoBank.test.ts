import { ethers } from "hardhat";
import { expect } from "chai";
import { getBigNumber} from "./utilities"

describe("WigoBank", function () {
  before(async function () {
    this.WigoToken = await ethers.getContractFactory("WigoToken")
    this.WigoBank = await ethers.getContractFactory("WigoBank")

    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.treasury = this.signers[3]
  })

beforeEach(async function () {
    this.wigo = await this.WigoToken.deploy(this.treasury.address)
    await this.wigo.deployed()
    this.bank = await this.WigoBank.deploy(this.wigo.address)
    await this.bank.deployed()
  })

  it("should have correct name and symbol and decimal", async function () {
    const name = await this.bank.name()
    const symbol = await this.bank.symbol()
    const decimals = await this.bank.decimals()
    expect(name).to.equal("WigoBank Token")
    expect(symbol).to.equal("xWIGO")
    expect(decimals).to.equal(18)
  })

  it("should only allow owner to mint token", async function () {
    await this.bank.mint(this.alice.address, getBigNumber(100))
    await this.bank.mint(this.bob.address, getBigNumber(1000))
    await expect(this.bank.connect(this.bob).mint(this.carol.address, getBigNumber(1000), { from: this.bob.address })).to.be.revertedWith(
      "Ownable: caller is not the owner"
    )
    const totalSupply = await this.bank.totalSupply()
    const aliceBal = await this.bank.balanceOf(this.alice.address)
    const bobBal = await this.bank.balanceOf(this.bob.address)
    const carolBal = await this.bank.balanceOf(this.carol.address)
    expect(totalSupply).to.equal(getBigNumber(1100))
    expect(aliceBal).to.equal(getBigNumber(100))
    expect(bobBal).to.equal(getBigNumber(1000))
    expect(carolBal).to.equal(0)
  })

  it("should only allow owner to burn token", async function () {
    await this.bank.mint(this.alice.address, getBigNumber(100))
    await this.bank.mint(this.bob.address, getBigNumber(1000))
    await this.bank.mint(this.carol.address, getBigNumber(2000))
    await this.bank.burn(this.alice.address, getBigNumber(50))
    await this.bank.burn(this.bob.address, getBigNumber(200))
    await expect(this.bank.connect(this.bob).burn(this.carol.address, getBigNumber(1000), { from: this.bob.address })).to.be.revertedWith(
      "Ownable: caller is not the owner"
    )
    const totalSupply = await this.bank.totalSupply()
    const aliceBal = await this.bank.balanceOf(this.alice.address)
    const bobBal = await this.bank.balanceOf(this.bob.address)
    const carolBal = await this.bank.balanceOf(this.carol.address)
    expect(totalSupply).to.equal(getBigNumber(2850))
    expect(aliceBal).to.equal(getBigNumber(50))
    expect(bobBal).to.equal(getBigNumber(800))
    expect(carolBal).to.equal(getBigNumber(2000))
  })

  it("should supply token transfers properly", async function () {
    await this.bank.mint(this.alice.address, getBigNumber(100))
    await this.bank.mint(this.bob.address, getBigNumber(1000))
    await this.bank.transfer(this.carol.address, getBigNumber(10))
    await this.bank.connect(this.bob).transfer(this.carol.address, getBigNumber(100), {
      from: this.bob.address,
    })
    const totalSupply = await this.bank.totalSupply()
    const aliceBal = await this.bank.balanceOf(this.alice.address)
    const bobBal = await this.bank.balanceOf(this.bob.address)
    const carolBal = await this.bank.balanceOf(this.carol.address)
    expect(totalSupply).to.equal(getBigNumber(1100))
    expect(aliceBal).to.equal(getBigNumber(90))
    expect(bobBal).to.equal(getBigNumber(900))
    expect(carolBal).to.equal(getBigNumber(110))
  })

  it("should fail if you try to do bad transfers", async function () {
    await this.bank.mint(this.alice.address, getBigNumber(100))
    await expect(this.bank.transfer(this.carol.address, getBigNumber(110))).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    await expect(this.bank.connect(this.bob).transfer(this.carol.address, getBigNumber(1), { from: this.bob.address })).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    )
  })
})
