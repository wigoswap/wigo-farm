import { ethers } from "hardhat"
import { expect } from "chai"
import { advanceTime, increase, duration, getBigNumber } from "./utilities"

// Initial Minting
const INIT_MINT = getBigNumber(160e6)

describe("WigoVault2", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.dev = this.signers[3]
    this.minter = this.signers[4]
    this.treasury = this.signers[5]
    this.pot = this.signers[6]

    this.WigoVault = await ethers.getContractFactory("WigoVault2")
    this.MasterFarmer = await ethers.getContractFactory("MasterFarmer")
    this.WigoToken = await ethers.getContractFactory("WigoToken")
    this.WigoBank = await ethers.getContractFactory("WigoBank")
  })

  beforeEach(async function () {
    this.wigo = await this.WigoToken.deploy(this.treasury.address)
    await this.wigo.deployed()
    this.bank = await this.WigoBank.deploy(this.wigo.address)
    await this.bank.deployed()
    this.farmer = await this.MasterFarmer.deploy(
      this.wigo.address,
      this.bank.address,
      this.treasury.address,
      this.dev.address,
      getBigNumber(1),
      5000,
      10000
    )
    await this.farmer.deployed()
    await this.wigo.transferOwnership(this.farmer.address)
    await this.bank.transferOwnership(this.farmer.address)
  })

  it("should set correct state variables", async function () {
    this.vault = await this.WigoVault.deploy(this.wigo.address, this.bank.address, this.farmer.address, this.carol.address, this.pot.address)
    await this.vault.deployed()

    const token = await this.vault.token()
    const receiptToken = await this.vault.receiptToken()
    const admin = await this.vault.admin()
    const pot = await this.vault.pot()
    const performanceFee = await this.vault.performanceFee()
    const callFee = await this.vault.callFee()
    const withdrawFee = await this.vault.withdrawFee()
    const withdrawFeePeriod = await this.vault.withdrawFeePeriod()
    const MAX_PERFORMANCE_FEE = await this.vault.MAX_PERFORMANCE_FEE()
    const MAX_CALL_FEE = await this.vault.MAX_CALL_FEE()
    const MAX_WITHDRAW_FEE = await this.vault.MAX_WITHDRAW_FEE()
    const MAX_WITHDRAW_FEE_PERIOD = await this.vault.MAX_WITHDRAW_FEE_PERIOD()

    expect(token).to.equal(this.wigo.address)
    expect(receiptToken).to.equal(this.bank.address)
    expect(admin).to.equal(this.carol.address)
    expect(pot).to.equal(this.pot.address)
    expect(performanceFee).to.equal(100)
    expect(callFee).to.equal(25)
    expect(withdrawFee).to.equal(1000)
    expect(withdrawFeePeriod).to.equal(2592000)
    expect(MAX_PERFORMANCE_FEE).to.equal(200)
    expect(MAX_CALL_FEE).to.equal(50)
    expect(MAX_WITHDRAW_FEE).to.equal(1000)
    expect(MAX_WITHDRAW_FEE_PERIOD).to.equal(5184000)
  })

  context("Owner Permissions", function () {
    beforeEach(async function () {
      this.vault = await this.WigoVault.deploy(this.wigo.address, this.bank.address, this.farmer.address, this.carol.address, this.pot.address)
      await this.vault.deployed()
    })

    it("should allow owner and only owner to set admin", async function () {
      expect(await this.vault.admin()).to.equal(this.carol.address)

      await expect(this.vault.connect(this.bob).setAdmin(this.bob.address, { from: this.bob.address })).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )

      await this.vault.connect(this.alice).setAdmin(this.bob.address, { from: this.alice.address })
      expect(await this.vault.admin()).to.equal(this.bob.address)

      await expect(this.vault.connect(this.bob).setAdmin(this.alice.address, { from: this.bob.address })).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
      await expect(this.vault.connect(this.carol).setAdmin(this.alice.address, { from: this.carol.address })).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
    })

    it("should allow owner and only owner to set pot", async function () {
      expect(await this.vault.pot()).to.equal(this.pot.address)

      await expect(this.vault.connect(this.bob).setPot(this.bob.address, { from: this.bob.address })).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )

      await this.vault.connect(this.alice).setPot(this.bob.address, { from: this.alice.address })
      expect(await this.vault.pot()).to.equal(this.bob.address)

      await expect(this.vault.connect(this.bob).setPot(this.alice.address, { from: this.bob.address })).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
      await expect(this.vault.connect(this.carol).setPot(this.alice.address, { from: this.carol.address })).to.be.revertedWith(
        "Ownable: caller is not the owner"
      )
    })
  })

  context("Admin Permissions", function () {
    beforeEach(async function () {
      this.vault = await this.WigoVault.deploy(this.wigo.address, this.bank.address, this.farmer.address, this.carol.address, this.pot.address)
      await this.vault.deployed()
    })

    it("should allow admin and only admin to set Performance Fee", async function () {
      expect(await this.vault.performanceFee()).to.equal(100)

      await expect(this.vault.connect(this.bob).setPerformanceFee(200, { from: this.bob.address })).to.be.revertedWith("admin: wut?")
      await expect(this.vault.connect(this.alice).setPerformanceFee(200, { from: this.alice.address })).to.be.revertedWith("admin: wut?")

      await this.vault.connect(this.carol).setPerformanceFee(200, { from: this.carol.address })
      expect(await this.vault.performanceFee()).to.equal(200)
    })

    it("should allow admin and only admin to set Call Fee", async function () {
      expect(await this.vault.callFee()).to.equal(25)

      await expect(this.vault.connect(this.bob).setCallFee(50, { from: this.bob.address })).to.be.revertedWith("admin: wut?")
      await expect(this.vault.connect(this.alice).setCallFee(50, { from: this.alice.address })).to.be.revertedWith("admin: wut?")

      await this.vault.connect(this.carol).setCallFee(50, { from: this.carol.address })
      expect(await this.vault.callFee()).to.equal(50)
    })

    it("should allow admin and only admin to set Withdraw Fee", async function () {
      expect(await this.vault.withdrawFee()).to.equal(1000)

      await expect(this.vault.connect(this.bob).setWithdrawFee(100, { from: this.bob.address })).to.be.revertedWith("admin: wut?")
      await expect(this.vault.connect(this.alice).setWithdrawFee(100, { from: this.alice.address })).to.be.revertedWith("admin: wut?")

      await this.vault.connect(this.carol).setWithdrawFee(100, { from: this.carol.address })
      expect(await this.vault.withdrawFee()).to.equal(100)
    })

    it("should allow admin and only admin to set Withdraw Fee Period", async function () {
      expect(await this.vault.withdrawFeePeriod()).to.equal(2592000)

      await expect(this.vault.connect(this.bob).setWithdrawFeePeriod(129100, { from: this.bob.address })).to.be.revertedWith("admin: wut?")
      await expect(this.vault.connect(this.alice).setWithdrawFeePeriod(129100, { from: this.alice.address })).to.be.revertedWith("admin: wut?")

      await this.vault.connect(this.carol).setWithdrawFeePeriod(129100, { from: this.carol.address })
      expect(await this.vault.withdrawFeePeriod()).to.equal(129100)
    })

    it("should allow admin and only admin to call Emergency Withdraw", async function () {
      await this.wigo.connect(this.treasury).transfer(this.alice.address, getBigNumber(1000), { from: this.treasury.address })
      await this.wigo.connect(this.alice).approve(this.vault.address, getBigNumber(1000))
      await this.vault.connect(this.alice).deposit(getBigNumber(400), { from: this.alice.address })
      expect(await this.wigo.balanceOf(this.vault.address)).to.equal(getBigNumber(0))

      await expect(this.vault.connect(this.alice).emergencyWithdraw()).to.be.revertedWith("admin: wut?")
      await expect(this.vault.connect(this.bob).emergencyWithdraw()).to.be.revertedWith("admin: wut?")
      await expect(this.vault.connect(this.treasury).emergencyWithdraw()).to.be.revertedWith("admin: wut?")

      await this.vault.connect(this.carol).emergencyWithdraw()
      expect(await this.wigo.balanceOf(this.vault.address)).to.equal(getBigNumber(400))
    })
  })

  it("Deposit and Withdraw", async function () {
    this.vault = await this.WigoVault.deploy(this.wigo.address, this.bank.address, this.farmer.address, this.carol.address, this.pot.address)
    await this.vault.deployed()

    await this.wigo.connect(this.treasury).transfer(this.alice.address, getBigNumber(1000), { from: this.treasury.address })
    await this.wigo.connect(this.alice).approve(this.vault.address, getBigNumber(1000))

    await this.vault.connect(this.alice).deposit(getBigNumber(400), { from: this.alice.address })
    expect(await this.wigo.balanceOf(this.vault.address)).to.equal(0)
    expect(await this.bank.balanceOf(this.vault.address)).to.equal(getBigNumber(400))
    expect(await this.wigo.totalBurned()).to.equal(0)

    // Wthdraw amount = 400 - 400*(10/100) = 360
    await this.vault.connect(this.alice).withdrawAll()
    expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(960))
    expect(await this.bank.balanceOf(this.vault.address)).to.equal(0)
    expect(await this.wigo.totalBurned()).to.equal(getBigNumber(40))
  })

  it("Harvest", async function () {
    this.vault = await this.WigoVault.deploy(this.wigo.address, this.bank.address, this.farmer.address, this.carol.address, this.pot.address)
    await this.vault.deployed()

    await this.wigo.connect(this.treasury).transfer(this.alice.address, getBigNumber(1000), { from: this.treasury.address })
    await this.wigo.connect(this.alice).approve(this.vault.address, getBigNumber(1000))

    await this.vault.connect(this.alice).deposit(getBigNumber(400), { from: this.alice.address })
    expect(await this.wigo.balanceOf(this.vault.address)).to.equal(0)
    expect(await this.bank.balanceOf(this.vault.address)).to.equal(getBigNumber(400))
    expect(await this.wigo.balanceOf(this.bob.address)).to.equal(0)

    await increase(duration.days(1))
    expect(await this.farmer.pendingWigo(0, this.vault.address)).to.equal(getBigNumber(86400))
    await this.vault.connect(this.bob).harvest() // Pending Reward: 86401 WIGO
    expect(await this.bank.balanceOf(this.vault.address)).to.equal(getBigNumber(857209875).div(1e4))
    expect(await this.wigo.balanceOf(this.farmer.address)).to.equal(getBigNumber(857209875).div(1e4))
    expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(2160025).div(1e4))
    expect(await this.wigo.balanceOf(this.pot.address)).to.equal(getBigNumber(86401).div(1e2))
    expect(await this.wigo.balanceOf(this.vault.address)).to.equal(0)
    expect(await this.farmer.pendingWigo(0, this.vault.address)).to.equal(0)
  })
})
