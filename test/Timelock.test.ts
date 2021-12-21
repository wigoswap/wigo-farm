import { ethers } from "hardhat";
import { expect } from "chai";
import { encodeParameters, latest, duration, increase, getBigNumber} from "./utilities"

describe("Timelock", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.dev = this.signers[3]
    this.minter = this.signers[4]
    this.treasury = this.signers[5]

    this.WigoToken = await ethers.getContractFactory("WigoToken")
    this.WigoBank = await ethers.getContractFactory("WigoBank")
    this.Timelock = await ethers.getContractFactory("Timelock")
    this.MockERC20 = await ethers.getContractFactory("MockERC20", this.minter)
    this.MasterFarmer = await ethers.getContractFactory("MasterFarmer")
  })

  beforeEach(async function () {
    this.wigo = await this.WigoToken.deploy(this.treasury.address)
    this.bank = await this.WigoBank.deploy(this.wigo.address)
    this.timelock = await this.Timelock.deploy(this.bob.address, 259200)
  })

  it("should not allow non-owner to do operation", async function () {
    await this.wigo.transferOwnership(this.timelock.address)
    await expect(this.wigo.transferOwnership(this.carol.address)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(this.wigo.connect(this.bob).transferOwnership(this.carol.address)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(this.wigo.connect(this.alice).transferOwnership(this.carol.address)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(this.wigo.connect(this.treasury).transferOwnership(this.carol.address)).to.be.revertedWith("Ownable: caller is not the owner")

    await expect(
      this.timelock.queueTransaction(
        this.wigo.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [this.carol.address]),
        (await latest()).add(duration.days(4))
      )
    ).to.be.revertedWith("Timelock::queueTransaction: Call must come from admin.")
  })

  it("should do the timelock thing", async function () {
    await this.wigo.transferOwnership(this.timelock.address)
    const eta = (await latest()).add(duration.days(4))

    await this.timelock
      .connect(this.bob)
      .queueTransaction(this.wigo.address, "0", "transferOwnership(address)", encodeParameters(["address"], [this.carol.address]), eta)

    await increase(duration.days(1))

    await expect(
      this.timelock
        .connect(this.bob)
        .executeTransaction(this.wigo.address, "0", "transferOwnership(address)", encodeParameters(["address"], [this.carol.address]), eta)
    ).to.be.revertedWith("Timelock::executeTransaction: Transaction hasn't surpassed time lock.")

    await increase(duration.days(4))

    await this.timelock
      .connect(this.bob)
      .executeTransaction(this.wigo.address, "0", "transferOwnership(address)", encodeParameters(["address"], [this.carol.address]), eta)

    expect(await this.wigo.owner()).to.equal(this.carol.address)
  })

  it("should also work with MasterFarmer", async function () {
    this.lp1 = await this.MockERC20.deploy("LPToken", "LP", getBigNumber(10000000000))
    this.lp2 = await this.MockERC20.deploy("LPToken", "LP", getBigNumber(10000000000))
    this.farmer = await this.MasterFarmer.deploy(this.wigo.address, this.bank.address, this.treasury.address, this.dev.address, getBigNumber(1), 5000, 10000)

    await this.wigo.transferOwnership(this.farmer.address)
    await this.farmer.add("100", this.lp1.address, true)
    await this.farmer.transferOwnership(this.timelock.address)
    const eta = (await latest()).add(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .queueTransaction(
        this.farmer.address,
        "0",
        "set(uint256,uint256,bool)",
        encodeParameters(["uint256", "uint256", "bool"], ["1", "200", false]),
        eta
      )
    await this.timelock
      .connect(this.bob)
      .queueTransaction(
        this.farmer.address,
        "0",
        "add(uint256,address,bool)",
        encodeParameters(["uint256", "address", "bool"], ["100", this.lp2.address, false]),
        eta
      )
    await increase(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .executeTransaction(
        this.farmer.address,
        "0",
        "set(uint256,uint256,bool)",
        encodeParameters(["uint256", "uint256", "bool"], ["1", "200", false]),
        eta
      )
    await this.timelock
      .connect(this.bob)
      .executeTransaction(
        this.farmer.address,
        "0",
        "add(uint256,address,bool)",
        encodeParameters(["uint256", "address", "bool"], ["100", this.lp2.address, false]),
        eta
      )
    expect((await this.farmer.poolInfo("1")).allocPoint).to.equal("200")
    expect(await this.farmer.totalAllocPoint()).to.equal("375")
    expect(await this.farmer.poolLength()).to.equal("3")
  })
})
