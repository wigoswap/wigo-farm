
import { ethers } from "hardhat";
import { expect } from "chai";
import { advanceTime, latest, duration, getBigNumber} from "./utilities"

// Initial Minting
const INIT_MINT = getBigNumber(160e6)

describe("MasterFarmer", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.dev = this.signers[3]
    this.minter = this.signers[4]
    this.treasury = this.signers[5]

    this.MasterFarmer = await ethers.getContractFactory("MasterFarmer")
    this.WigoToken = await ethers.getContractFactory("WigoToken")
    this.WigoBank = await ethers.getContractFactory("WigoBank")
    this.MockERC20 = await ethers.getContractFactory("MockERC20", this.minter)
  })

  beforeEach(async function () {
    this.wigo = await this.WigoToken.deploy(this.treasury.address)
    await this.wigo.deployed()
    this.bank = await this.WigoBank.deploy(this.wigo.address)
    await this.bank.deployed()
  })

  it("should set correct state variables", async function () {
    // start at 5000s and change multiplier after 10000s
    this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
    await this.farmer.deployed()

    await this.wigo.transferOwnership(this.farmer.address)
    await this.bank.transferOwnership(this.farmer.address)

    const wigo = await this.farmer.wigo()
    const bank = await this.farmer.bank()
    const treasuryAddr = await this.farmer.treasuryAddr()
    const devAddr = await this.farmer.devAddr()
    const wigoOwner = await this.wigo.owner()
    const bankOwner = await this.wigo.owner()
    const startBlockTime = await this.farmer.startBlockTime()
    const wigoPerSecond = await this.farmer.wigoPerSecond()
    const changeMultiplierAtTime = await this.farmer.CHANGE_MULTIPLIER_AT_TIME(0)
    const finishBonusAtTime = await this.farmer.FINISH_BONUS_AT_TIME()

    expect(wigo).to.equal(this.wigo.address)
    expect(bank).to.equal(this.bank.address)
    expect(treasuryAddr).to.equal(this.treasury.address)
    expect(devAddr).to.equal(this.dev.address)
    expect(wigoOwner).to.equal(this.farmer.address)
    expect(bankOwner).to.equal(this.farmer.address)
    expect(startBlockTime).to.equal(5000)
    expect(wigoPerSecond).to.equal(getBigNumber(1))
    expect(changeMultiplierAtTime).to.equal(15000)
    expect(finishBonusAtTime).to.equal(85000)
  })

  it ('should correct multiplier', async function () {
    // start at 5000s and change multiplier after 10000s
    this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
    await this.farmer.deployed()
    expect(await this.farmer.getMultiplier(2500, 3200)).to.equal(0)
    expect(await this.farmer.getMultiplier(2500, 5000)).to.equal(0)
    expect(await this.farmer.getMultiplier(2500, 5001)).to.equal(9)
    expect(await this.farmer.getMultiplier(5000, 5001)).to.equal(9)
    expect(await this.farmer.getMultiplier(6000, 14000)).to.equal(72000)
    expect(await this.farmer.getMultiplier(14000, 15001)).to.equal(9008)
    expect(await this.farmer.getMultiplier(16000, 24000)).to.equal(64000)
    expect(await this.farmer.getMultiplier(24000, 25001)).to.equal(8007)
    expect(await this.farmer.getMultiplier(26000, 34000)).to.equal(56000)
    expect(await this.farmer.getMultiplier(34000, 35001)).to.equal(7006)
    expect(await this.farmer.getMultiplier(36000, 44000)).to.equal(48000)
    expect(await this.farmer.getMultiplier(44000, 45001)).to.equal(6005)
    expect(await this.farmer.getMultiplier(46000, 54000)).to.equal(40000)
    expect(await this.farmer.getMultiplier(54000, 55001)).to.equal(5004)
    expect(await this.farmer.getMultiplier(56000, 64000)).to.equal(32000)
    expect(await this.farmer.getMultiplier(64000, 65001)).to.equal(4003)
    expect(await this.farmer.getMultiplier(66000, 74000)).to.equal(24000)
    expect(await this.farmer.getMultiplier(74000, 75001)).to.equal(3002)
    expect(await this.farmer.getMultiplier(76000, 84000)).to.equal(16000)
    expect(await this.farmer.getMultiplier(84999, 85000)).to.equal(2)
    expect(await this.farmer.getMultiplier(85000, 85001)).to.equal(1)
    expect(await this.farmer.getMultiplier(2142456, 2152456)).to.equal(10000)
    expect(await this.farmer.getMultiplier(80000, 90000)).to.equal(15000)
    expect(await this.farmer.getMultiplier(2500, 90000)).to.equal(445000)
    expect(await this.farmer.getMultiplier(17210, 63456)).to.equal(276144)
  })

  it("should allow treasury and only treasury to update treasury address", async function () {
    // start at 5000s and change multiplier after 10000s
    this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
    await this.farmer.deployed()

    expect(await this.farmer.treasuryAddr()).to.equal(this.treasury.address)

    await expect(this.farmer.connect(this.bob).setTreasury(this.bob.address, { from: this.bob.address })).to.be.revertedWith("Set Treasury: wut?")

    await this.farmer.connect(this.treasury).setTreasury(this.bob.address, { from: this.treasury.address })
    expect(await this.farmer.treasuryAddr()).to.equal(this.bob.address)

    await this.farmer.connect(this.bob).setTreasury(this.alice.address, { from: this.bob.address })
    expect(await this.farmer.treasuryAddr()).to.equal(this.alice.address)
  })

  it("should allow dev and only dev to update dev address", async function () {
    // start at 5000s and change multiplier after 10000s
    this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
    await this.farmer.deployed()

    expect(await this.farmer.devAddr()).to.equal(this.dev.address)

    await expect(this.farmer.connect(this.bob).setDev(this.bob.address, { from: this.bob.address })).to.be.revertedWith("Set Dev: wut?")

    await this.farmer.connect(this.dev).setDev(this.bob.address, { from: this.dev.address })
    expect(await this.farmer.devAddr()).to.equal(this.bob.address)

    await this.farmer.connect(this.bob).setDev(this.alice.address, { from: this.bob.address })
    expect(await this.farmer.devAddr()).to.equal(this.alice.address)
  })

  context("With ERC/LP token added to the field", function () {
    beforeEach(async function () {
      this.lp = await this.MockERC20.deploy("LPToken", "LP", getBigNumber(10000000000))

      await this.lp.transfer(this.alice.address, getBigNumber(1000))
      await this.lp.transfer(this.bob.address, getBigNumber(1000))
      await this.lp.transfer(this.carol.address, getBigNumber(1000))

      this.lp2 = await this.MockERC20.deploy("LPToken2", "LP2", getBigNumber(10000000000))

      await this.lp2.transfer(this.alice.address, getBigNumber(1000))
      await this.lp2.transfer(this.bob.address, getBigNumber(1000))
      await this.lp2.transfer(this.carol.address, getBigNumber(1000))
    })

    it("should allow farming emergency withdraw", async function () {
      // start at 5000s and change multiplier after 10000s
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
      await this.farmer.deployed()

      await this.farmer.add(getBigNumber(100), this.lp.address, true)

      await this.lp.connect(this.bob).approve(this.farmer.address, getBigNumber(1000))

      await this.farmer.connect(this.bob).deposit(1, getBigNumber(100))

      expect(await this.lp.balanceOf(this.bob.address)).to.equal(getBigNumber(900))

      await this.farmer.connect(this.bob).emergencyWithdraw(1)

      expect(await this.lp.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))
    })

    it("should allow staking emergency withdraw", async function () {
      // start at 5000s and change multiplier after 10000s
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
      await this.farmer.deployed()

      await this.bank.transferOwnership(this.farmer.address)

      await this.wigo.mint(this.bob.address, getBigNumber(1000))

      await this.wigo.connect(this.bob).approve(this.farmer.address, getBigNumber(1000))
      
      expect(await this.bank.totalSupply()).to.equal(0)
      await this.farmer.connect(this.bob).enterStaking(getBigNumber(100))
      expect(await this.bank.totalSupply()).to.equal(getBigNumber(100))

      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(100))


      await this.farmer.connect(this.bob).emergencyWithdraw(0)
      expect(await this.bank.totalSupply()).to.equal(0)

      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(0)

    })
    it("should give out WIGOs only after farming time", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.farmer.add(getBigNumber(100), this.lp.address, true) // 4s

      await this.lp.connect(this.bob).approve(this.farmer.address, getBigNumber(1000)) // 5s
      await this.farmer.connect(this.bob).deposit(1, getBigNumber(100)) // 6s

      await advanceTime(100) 
      await this.farmer.connect(this.bob).deposit(1, 0) // 106s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(0)
      
      await advanceTime(50) 
      await this.farmer.connect(this.bob).deposit(1, 0) // 156s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(0)

      await advanceTime(44) 
      await this.farmer.connect(this.bob).deposit(1, 0) // 200s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(0)

      await advanceTime(1) 
      await this.farmer.connect(this.bob).deposit(1, 0) // 201s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(720).div(1e2))

      await advanceTime(10) 
      await this.farmer.connect(this.bob).deposit(1, 0) // 211s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(792).div(10))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(99).div(10))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(198).div(100).add(INIT_MINT))
      expect(await this.wigo.totalSupply()).to.equal((getBigNumber(792).div(10)).add(getBigNumber(1188).div(100)).add(INIT_MINT))
      expect(await this.wigo.totalMinted()).to.equal((getBigNumber(792).div(10)).add(getBigNumber(1188).div(100)).add(INIT_MINT))
    })

    it("should give out Staking Rewards only after farming time", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.wigo.connect(this.treasury).transfer(this.bob.address, getBigNumber(1000), { from: this.treasury.address }) // 4s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))


      await this.wigo.connect(this.bob).approve(this.farmer.address, getBigNumber(1000)) // 5s
      await this.farmer.connect(this.bob).enterStaking(getBigNumber(100)) // 6s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(100))

      await advanceTime(100) 
      await this.farmer.connect(this.bob).enterStaking(0) // 106s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))
      
      await advanceTime(50) 
      await this.farmer.connect(this.bob).enterStaking(0) // 156s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))

      await advanceTime(44) 
      await this.farmer.connect(this.bob).enterStaking(0) // 200s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))

      await advanceTime(1) 
      await this.farmer.connect(this.bob).enterStaking(0) // 201s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(909))

      await advanceTime(10) 
      await this.farmer.connect(this.bob).enterStaking(0) // 211s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(999))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(12375).div(1000))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(159999002475).div(1000))
      expect(await this.wigo.totalSupply()).to.equal((getBigNumber(11385).div(100)).add(INIT_MINT))
      expect(await this.wigo.totalMinted()).to.equal((getBigNumber(11385).div(100)).add(INIT_MINT))

      await advanceTime(9) 
      await this.farmer.add(getBigNumber(120), this.lp.address, true) // 220s
      await this.farmer.connect(this.bob).enterStaking(0) // 221s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(10818).div(10))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(22725).div(1000))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(159999004545).div(1000))
      expect(await this.wigo.totalSupply()).to.equal((getBigNumber(20907).div(100)).add(INIT_MINT))
      expect(await this.wigo.totalMinted()).to.equal((getBigNumber(20907).div(100)).add(INIT_MINT))
    })


    it("should not distribute WIGOs if no one deposit", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.farmer.add(getBigNumber(100), this.lp.address, true) // 4s

      await this.lp.connect(this.bob).approve(this.farmer.address, getBigNumber(1000)) // 5s
      
      await advanceTime(194)
      await this.farmer.connect(this.bob).deposit(1, 0) // 199s
      expect(await this.wigo.totalSupply()).to.equal(INIT_MINT)

      await advanceTime(5)
      await this.farmer.connect(this.bob).deposit(1, 0) // 204s
      expect(await this.wigo.totalSupply()).to.equal(INIT_MINT)

      await advanceTime(5)
      await this.farmer.connect(this.bob).deposit(1, getBigNumber(10)) // 209s
      expect(await this.wigo.totalSupply()).to.equal(INIT_MINT)
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(INIT_MINT)
      expect(await this.lp.balanceOf(this.bob.address)).to.equal(getBigNumber(990))

      await advanceTime(10)
      await this.farmer.connect(this.bob).withdraw(1, getBigNumber(10)) // 219s
      expect(await this.wigo.totalSupply()).to.equal((getBigNumber(72)).add(getBigNumber(108).div(10)).add(INIT_MINT))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(72))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(9))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(18).div(10).add(INIT_MINT))
      expect(await this.lp.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))
    })

    it("should distribute WIGOs properly for each staker", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.farmer.add(getBigNumber(100), this.lp.address, true) // 4s
      await this.lp.connect(this.alice).approve(this.farmer.address, getBigNumber(1000), {
        from: this.alice.address,
      }) // 5s
      await this.lp.connect(this.bob).approve(this.farmer.address, getBigNumber(1000), {
        from: this.bob.address,
      }) // 6s
      await this.lp.connect(this.carol).approve(this.farmer.address, getBigNumber(1000), {
        from: this.carol.address,
      }) // 7s

      // Alice deposits 10 LPs at 210s
      await advanceTime(203)
      await this.farmer.connect(this.alice).deposit(1, getBigNumber(10), { from: this.alice.address }) // 210s
      // Bob deposits 20 LPs at 214s
      await advanceTime(4)
      await this.farmer.connect(this.bob).deposit(1, getBigNumber(20), { from: this.bob.address }) // 214s
      // Carol deposits 30 LPs at 218s
      await advanceTime(4)
      await this.farmer.connect(this.carol).deposit(1, getBigNumber(30), { from: this.carol.address }) // 218s
      // Alice deposits 10 more LPs at 220s. At this point:
      // Alice should have: 4*7.2 + 4*1/3*7.2 + 2*1/6*7.2 = 40.8
      // WigoBank should have the remaining: 72 - 40.8 = 31.2
      await advanceTime(2)
      await this.farmer.connect(this.alice).deposit(1, getBigNumber(10), { from: this.alice.address }) // 220s
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(72).add(getBigNumber(108).div(10)).add(INIT_MINT))
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(408).div(10))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.carol.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.bank.address)).to.equal(getBigNumber(312).div(10))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(9))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(18).div(10).add(INIT_MINT))
      // Bob withdraws 5 LPs at 230s. At this point:
      // Bob should have: 4*2/3*7.2 + 2*2/6*7.2 + 10*2/7*7.2 = 44.57142857142
      // WigoBank should have the remaining: 144 - 40.8 - 44.57142857142 = 58.62857142858
      await advanceTime(10)
      await this.farmer.connect(this.bob).withdraw(1, getBigNumber(5), { from: this.bob.address }) // 230s
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(144).add(getBigNumber(216).div(10)).add(INIT_MINT))
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(408).div(10))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(44571428571420).div(1e12))
      expect(await this.wigo.balanceOf(this.carol.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.bank.address)).to.equal(getBigNumber(58628571428580).div(1e12))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(18))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(36).div(10).add(INIT_MINT))
      // Alice withdraws 20 LPs at 240s.
      // Bob withdraws 15 LPs at 250s.
      // Carol withdraws 30 LPs at 260s.
      await advanceTime(10)
      await this.farmer.connect(this.alice).withdraw(1, getBigNumber(20), { from: this.alice.address }) // 240s
      await advanceTime(10)
      await this.farmer.connect(this.bob).withdraw(1, getBigNumber(15), { from: this.bob.address }) // 250s
      await advanceTime(10)
      await this.farmer.connect(this.carol).withdraw(1, getBigNumber(30), { from: this.carol.address }) // 260s
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(360).add(getBigNumber(54)).add(INIT_MINT))

      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(45))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(9).add(INIT_MINT))

      // Alice should have: 40.8 + 10*2/7*7.2 + 10*2/6.5*7.2 = 83.52527472526
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(83525274725260).div(1e12))
      // Bob should have: 44.571428571428 + 10*1.5/6.5*7.2 + 10*1.5/4.5*7.2 = 85.1868131868
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(85186813186800).div(1e12))
      // Carol should have: 2*3/6*7.2 + 10*3/7*7.2 + 10*3/6.5*7.2 + 10*3/4.5*7.2 + 10*7.2 = 191.28791208789
      expect(await this.wigo.balanceOf(this.carol.address)).to.equal(getBigNumber(191287912087890).div(1e12))

      // All of them should have 1000 LPs back.
      expect(await this.lp.balanceOf(this.alice.address)).to.equal(getBigNumber(1000))
      expect(await this.lp.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))
      expect(await this.lp.balanceOf(this.carol.address)).to.equal(getBigNumber(1000))
    })

    it("should give proper WIGOs allocation to each pool", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.lp.connect(this.alice).approve(this.farmer.address, getBigNumber(1000), { from: this.alice.address }) // 4s
      await this.lp2.connect(this.bob).approve(this.farmer.address, getBigNumber(1000), { from: this.bob.address }) // 5s
      
      // Add first LP to the pool with allocation 10
      await this.farmer.add(getBigNumber(10), this.lp.address, true) // 6s

      // Alice deposits 10 LPs at 210s
      await advanceTime(204)
      await this.farmer.connect(this.alice).deposit(1, getBigNumber(10), { from: this.alice.address }) // 210

      // Add LP2 to the pool with allocation 2 at 220s
      await advanceTime(10)
      await this.farmer.add(getBigNumber(20), this.lp2.address, true) // 220s

      // Alice should have 10*7.2 pending reward
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(getBigNumber(72))
      
      // Bob deposits 10 LP2s at 225s
      await advanceTime(5)
      await this.farmer.connect(this.bob).deposit(2, getBigNumber(10), { from: this.bob.address }) // 225s

      // Alice should have 10*7.2 + 5*1/3*7.2 = 84 pending reward
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(getBigNumber(84))
      
      // At 230s Bob should get 5*2/3*7.2 = 24. Alice should get 12 more.
      await advanceTime(5)
      await this.farmer.connect(this.bob).deposit(1, 0) // 230s
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(getBigNumber(96))
      expect(await this.farmer.pendingWigo(2, this.bob.address)).to.equal(getBigNumber(24))
    })

    it("should stop giving bonus WIGOs after the bonus period ends", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.lp.connect(this.alice).approve(this.farmer.address, getBigNumber(1000), { from: this.alice.address }) // 4s
      await this.lp.connect(this.bob).approve(this.farmer.address, getBigNumber(1000), { from: this.bob.address }) // 5s
      await this.farmer.add(getBigNumber(100), this.lp.address, true) // 6s

      // Alice deposits 10 LPs at 989s
      await advanceTime(983)
      await this.farmer.connect(this.alice).deposit(1, getBigNumber(10), { from: this.alice.address }) // 989s

      // At 1005s, she should have 1*2*11*4/5 + 1*1*5*4/5 = 21.6 pending.
      await advanceTime(16)
      await this.farmer.connect(this.bob).deposit(1, 0, { from: this.bob.address }) // 1005s
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(getBigNumber(216).div(10))

      // At 1006, Alice withdraws all pending rewards and should get 22.4.
      await this.farmer.connect(this.alice).deposit(1, 0, { from: this.alice.address }) // 1006s
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(224).div(10))
    })

    it("ensure user can't add duplicate pools", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.farmer.add(getBigNumber(100), this.lp.address, true) // 4s
  
      await advanceTime(500)

      await expect(this.farmer.add(getBigNumber(200), this.lp.address, true)).to.be.revertedWith("Add: pool already exists!!!!") // 504s
    })

    it("should set correct new allocPoint", async function () {
      // start at 5000s and change multiplier after 10000s
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
      await this.farmer.deployed()
  
      await this.farmer.add(getBigNumber(100), this.lp.address, true)
  
      expect((await this.farmer.poolInfo(1)).allocPoint).to.equal(getBigNumber(100))
      expect((await this.farmer.poolInfo(0)).allocPoint).to.equal(getBigNumber(100).div(4))

      // try to set new allocPoint for staking pool
      await expect(this.farmer.set(0, getBigNumber(500), true)).to.be.revertedWith("You can't set allocPoint for staking pool.")

      // set new allocPoint for farming pool
      await this.farmer.set(1, getBigNumber(500), true)

      expect((await this.farmer.poolInfo(1)).allocPoint).to.equal(getBigNumber(500))
      expect((await this.farmer.poolInfo(0)).allocPoint).to.equal(getBigNumber(500).div(4))
    })

    it("should mint rewards based on wigo remaining supply", async function () {
      // 1 per second farming rate starting at 200s. Reward multiplier will decrease every 100s.
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), (await latest()).add(duration.seconds(200)), 100)
      await this.farmer.deployed() // 1s

      await this.wigo.transferOwnership(this.farmer.address) // 2s
      await this.bank.transferOwnership(this.farmer.address) // 3s

      await this.wigo.connect(this.treasury).transfer(this.bob.address, getBigNumber(1000), { from: this.treasury.address }) // 4s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))


      await this.wigo.connect(this.bob).approve(this.farmer.address, getBigNumber(1000)) // 5s
      await this.farmer.connect(this.bob).enterStaking(getBigNumber(100)) // 6s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(100))

      await this.farmer.add(getBigNumber(100), this.lp.address, true) // 7S

      await this.lp.connect(this.alice).approve(this.farmer.address, getBigNumber(1000)) // 8S
      await this.farmer.connect(this.alice).deposit(1, getBigNumber(10), { from: this.alice.address }) // 9s
      expect(await this.lp.balanceOf(this.alice.address)).to.equal(getBigNumber(990))

      await advanceTime(191) 
      await this.farmer.connect(this.bob).enterStaking(0) // 200s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(900))
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(159999000))
      expect(await this.wigo.totalSupply()).to.equal(INIT_MINT)
      expect(await this.wigo.totalMinted()).to.equal(INIT_MINT)

      await advanceTime(10)
      await this.farmer.connect(this.bob).enterStaking(0) // 210s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(918))
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(0)
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(getBigNumber(72))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(225).div(100))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(15999900045).div(100))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(2070).div(100).add(INIT_MINT))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(2070).div(100).add(INIT_MINT))

      await advanceTime(790)
      await this.farmer.connect(this.bob).enterStaking(0) //1000s
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1780))
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(0)
      expect(await this.farmer.pendingWigo(1, this.alice.address)).to.equal(getBigNumber(3520))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(110))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(159999022))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(1012).add(INIT_MINT))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(1012).add(INIT_MINT))

      await advanceTime(1000)
      await this.farmer.connect(this.alice).deposit(1, 0, { from: this.alice.address }) //2000s
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(4320))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1780))
      expect(await this.farmer.pendingWigo(0, this.bob.address)).to.equal(getBigNumber(200))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(650))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(159999130))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(5980).add(INIT_MINT))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(5980).add(INIT_MINT))

      await advanceTime(79000000)
      await this.farmer.connect(this.alice).withdraw(1, getBigNumber(10), { from: this.alice.address }) //79002000s
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(63204320))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1780))
      expect(await this.farmer.pendingWigo(0, this.bob.address)).to.equal(getBigNumber(15800200))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(7900650))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(161579130))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(232685980))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(232685980))
      
      await advanceTime(7800000000)
      const wigoCanMint = 2000000000 - 232685980
      await this.farmer.connect(this.bob).leaveStaking(getBigNumber(100))
      // Reward is bigger than wigoCanMint
      // Reward = wigoCanMint*(1000/1150)
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(wigoCanMint).mul(1000).div(1150).add(getBigNumber(1880)))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(0)
      expect(await this.bank.totalSupply()).to.equal(0)
      expect(await this.wigo.balanceOf(this.alice.address)).to.equal(getBigNumber(63204320))
      expect(await this.farmer.pendingWigo(0, this.bob.address)).to.equal(0)
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(200000000))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(199999000))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(2e9))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(2e9))

      await advanceTime(1000)
      await this.farmer.connect(this.bob).enterStaking(getBigNumber(400))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1536796280))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(400))

      await advanceTime(10000000)
      await this.farmer.connect(this.bob).enterStaking(0)
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1536796280))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(400))
      expect(await this.farmer.pendingWigo(0, this.bob.address)).to.equal(0)

      // Dev burns 1m wigo
      await advanceTime(999)
      await this.farmer.connect(this.dev).wigoBurn(getBigNumber(1e6))
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(199000000))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(199999000))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(2e9).sub(getBigNumber(1e6)))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(2e9))
      expect(await this.wigo.totalBurned()).to.equal(getBigNumber(1e6))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1536796280))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(400))
      expect(await this.farmer.pendingWigo(0, this.bob.address)).to.equal(getBigNumber(1998).div(10))

      // Minting for dev and treasury will stop when total minted exceeds max supply.
      await advanceTime(1)
      await this.farmer.connect(this.bob).leaveStaking(getBigNumber(400))
      // No change in dev and treasury balance
      expect(await this.wigo.balanceOf(this.dev.address)).to.equal(getBigNumber(199000000))
      expect(await this.wigo.balanceOf(this.treasury.address)).to.equal(getBigNumber(199999000))
      expect(await this.wigo.totalSupply()).to.equal(getBigNumber(2e9).sub(getBigNumber(1e6)).add(getBigNumber(200)))
      expect(await this.wigo.totalMinted()).to.equal(getBigNumber(2e9).add(getBigNumber(200)))
      expect(await this.wigo.totalBurned()).to.equal(getBigNumber(1e6))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1536796280).add(getBigNumber(200)).add(getBigNumber(400)))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(0)
      expect(await this.bank.totalSupply()).to.equal(0)
      expect(await this.farmer.pendingWigo(0, this.bob.address)).to.equal(0)
    })

    it("should not leave staking if not have xWIGOs enough", async function () {
      // start at 5000s and change multiplier after 10000s
      this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)
      await this.farmer.deployed()

      await this.wigo.transferOwnership(this.farmer.address)
      await this.bank.transferOwnership(this.farmer.address)

      await this.wigo.connect(this.treasury).transfer(this.bob.address, getBigNumber(1000), { from: this.treasury.address })
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1000))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(0))

      await this.wigo.connect(this.bob).approve(this.farmer.address, getBigNumber(1000))
      await this.farmer.connect(this.bob).enterStaking(getBigNumber(320))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(680))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(320))
      expect(await this.bank.totalSupply()).to.equal(getBigNumber(320))

      await this.bank.connect(this.bob).transfer(this.alice.address, getBigNumber(120), { from: this.bob.address })
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(680))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(200))
      expect(await this.bank.balanceOf(this.alice.address)).to.equal(getBigNumber(120))
      expect(await this.bank.totalSupply()).to.equal(getBigNumber(320))

      await expect(this.farmer.connect(this.bob).leaveStaking(getBigNumber(220))).to.be.revertedWith("withdraw: You do not have enough xWIGO!")
      await expect(this.farmer.connect(this.bob).emergencyWithdraw(0)).to.be.revertedWith("EmergencyWithdraw: You do not have enough xWIGO!")
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(680))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(200))
      expect(await this.bank.balanceOf(this.alice.address)).to.equal(getBigNumber(120))
      expect(await this.bank.totalSupply()).to.equal(getBigNumber(320))

      await this.bank.connect(this.alice).transfer(this.bob.address, getBigNumber(120), { from: this.alice.address })
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(680))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(320))
      expect(await this.bank.balanceOf(this.alice.address)).to.equal(0)
      expect(await this.bank.totalSupply()).to.equal(getBigNumber(320))

      await this.farmer.connect(this.bob).leaveStaking(getBigNumber(220))
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(905))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(getBigNumber(100))
      expect(await this.bank.balanceOf(this.alice.address)).to.equal(0)
      expect(await this.bank.totalSupply()).to.equal(getBigNumber(100))

      await this.farmer.connect(this.bob).emergencyWithdraw(0)
      expect(await this.wigo.balanceOf(this.bob.address)).to.equal(getBigNumber(1005))
      expect(await this.bank.balanceOf(this.bob.address)).to.equal(0)
      expect(await this.bank.balanceOf(this.alice.address)).to.equal(0)
      expect(await this.bank.totalSupply()).to.equal(0)
    })
  })
})
