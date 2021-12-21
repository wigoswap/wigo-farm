import { ethers } from "hardhat";
import { expect } from "chai";
import { getBigNumber} from "./utilities"

// Initial Minting
const INIT_MINT = getBigNumber(160e6)

describe("WigoToken", function () {
  before(async function () {
    this.WigoToken = await ethers.getContractFactory("WigoToken")
    this.signers = await ethers.getSigners()
    
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.treasury = this.signers[3]
  })

  beforeEach(async function () {
    this.wigo = await this.WigoToken.deploy(this.treasury.address)
    await this.wigo.deployed()
  })

  it("should have correct name and symbol and decimal and maxSupply", async function () {
    const name = await this.wigo.name()
    const symbol = await this.wigo.symbol()
    const decimals = await this.wigo.decimals()
    const maxSupply = await this.wigo.maxSupply()
    expect(name).to.equal("WigoSwap Token")
    expect(symbol).to.equal("WIGO")
    expect(decimals).to.equal(18)
    expect(maxSupply).to.equal(getBigNumber(2e9))
  })

  it("should only allow owner to mint token", async function () {
    await this.wigo.mint(this.alice.address, getBigNumber(100))
    await this.wigo.mint(this.bob.address, getBigNumber(1000))
    await expect(this.wigo.connect(this.bob).mint(this.carol.address, getBigNumber(1000), { from: this.bob.address })).to.be.revertedWith(
      "Ownable: caller is not the owner"
    )
    const totalSupply = await this.wigo.totalSupply()
    const aliceBal = await this.wigo.balanceOf(this.alice.address)
    const bobBal = await this.wigo.balanceOf(this.bob.address)
    const carolBal = await this.wigo.balanceOf(this.carol.address)
    expect(totalSupply).to.equal(getBigNumber(1100).add(INIT_MINT))
    expect(aliceBal).to.equal(getBigNumber(100))
    expect(bobBal).to.equal(getBigNumber(1000))
    expect(carolBal).to.equal(0)
  })

  it("should only allow owner to burn token", async function () {
    await this.wigo.mint(this.alice.address, getBigNumber(100))
    await this.wigo.mint(this.bob.address, getBigNumber(1000))
    await this.wigo.mint(this.carol.address, getBigNumber(2000))
    await this.wigo.burn(this.alice.address, getBigNumber(50))
    await this.wigo.burn(this.bob.address, getBigNumber(200))
    await expect(this.wigo.connect(this.bob).burn(this.carol.address, getBigNumber(1000), { from: this.bob.address })).to.be.revertedWith(
      "Ownable: caller is not the owner"
    )
    const totalSupply = await this.wigo.totalSupply()
    const totalMinted = await this.wigo.totalMinted()
    const totalBurned = await this.wigo.totalBurned()
    const aliceBal = await this.wigo.balanceOf(this.alice.address)
    const bobBal = await this.wigo.balanceOf(this.bob.address)
    const carolBal = await this.wigo.balanceOf(this.carol.address)
    expect(totalSupply).to.equal(getBigNumber(2850).add(INIT_MINT))
    expect(totalMinted).to.equal(getBigNumber(3100).add(INIT_MINT))
    expect(totalBurned).to.equal(getBigNumber(250))
    expect(aliceBal).to.equal(getBigNumber(50))
    expect(bobBal).to.equal(getBigNumber(800))
    expect(carolBal).to.equal(getBigNumber(2000))
  })

  it("should supply token transfers properly", async function () {
    await this.wigo.mint(this.alice.address, getBigNumber(100))
    await this.wigo.mint(this.bob.address, getBigNumber(1000))
    await this.wigo.transfer(this.carol.address, getBigNumber(10))
    await this.wigo.connect(this.bob).transfer(this.carol.address, getBigNumber(100), {
      from: this.bob.address,
    })
    const totalSupply = await this.wigo.totalSupply()
    const totalMinted = await this.wigo.totalMinted()
    const totalBurned = await this.wigo.totalBurned()
    const aliceBal = await this.wigo.balanceOf(this.alice.address)
    const bobBal = await this.wigo.balanceOf(this.bob.address)
    const carolBal = await this.wigo.balanceOf(this.carol.address)
    expect(totalSupply).to.equal(getBigNumber(1100).add(INIT_MINT))
    expect(totalMinted).to.equal(getBigNumber(1100).add(INIT_MINT))
    expect(totalBurned).to.equal(0)
    expect(aliceBal).to.equal(getBigNumber(90))
    expect(bobBal).to.equal(getBigNumber(900))
    expect(carolBal).to.equal(getBigNumber(110))
  })

  it("should fail if you try to do bad transfers", async function () {
    await this.wigo.mint(this.alice.address, getBigNumber(100))
    await expect(this.wigo.transfer(this.carol.address, getBigNumber(110))).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    await expect(this.wigo.connect(this.bob).transfer(this.carol.address, getBigNumber(1), { from: this.bob.address })).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    )
  })
})
