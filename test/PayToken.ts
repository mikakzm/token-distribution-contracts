import { expect, use } from "chai"
import { ethers } from "hardhat"
import { Signer, BigNumber, BigNumberish, Contract } from "ethers"
import { Address } from "hardhat-deploy/dist/types";
import { solidity, MockProvider } from "ethereum-waffle"

import { PayToken } from "../typechain/PayToken"
import { PayToken__factory } from "../typechain/factories/PayToken__factory"
import { TokenProxy__factory } from "../typechain/factories/TokenProxy__factory"

use(solidity)

describe("PayToken", async () => {
    let tokenName = "Pay"
    let tokenSymbol = "PT"
    let tokenCurrency = "NullCurrency"

    let masterMinter: Signer
    let signer1: Signer
    let signer2: Signer
    let signer3: Signer
    let signer4: Signer
    let vip1: Signer
    let vip2: Signer
    let proxyOwner: Signer

    let masterMinterAddr: Address
    let signer1Addr: Address
    let signer2Addr: Address
    let signer3Addr: Address
    let signer4Addr: Address
    let vip1Addr: Address
    let vip2Addr: Address
    let proxyOwnerAddr: Address

    const oneUnit = BigNumber.from(10).pow(18);
    const _initialSupply =  oneUnit.mul(300).mul(1000000);
    const oneHundred = BigNumber.from(10).pow(18).mul(100);
    const theReferralCode = BigNumber.from(10).pow(3).mul(12334455);


    let PayToken: Contract

    beforeEach(async () => {
        [masterMinter, signer1, signer2, signer3, signer4, vip1, vip2, proxyOwner] = await ethers.getSigners()
        masterMinterAddr = await masterMinter.getAddress()
        signer1Addr = await signer1.getAddress()
        signer2Addr = await signer2.getAddress()
        signer3Addr = await signer3.getAddress()
        signer4Addr = await signer4.getAddress()
        vip1Addr = await vip1.getAddress()
        vip2Addr = await vip2.getAddress()
        proxyOwnerAddr = await proxyOwner.getAddress()
        
        PayToken = await deployPayToken()
        await setVIPaccounts()
    })

    const setVIPaccounts = async () => {
        let PayTokenMM = PayToken.connect(masterMinter)
        expect(
            await PayTokenMM.changeLevel(vip1Addr, 1)
        ).to.emit(PayTokenMM, "ChangeLevel")
        expect(
            await PayTokenMM.changeLevel(vip2Addr, 2)
        ).to.emit(PayTokenMM, "ChangeLevel")

        await PayToken.transfer(
            vip1Addr,
            oneHundred.mul(2)
        )

        await PayToken.transfer(
            vip2Addr,
            oneHundred.mul(3)
        )
    }

    const deployPayToken = async (_signer?: Signer): Promise<PayToken> => {
        const tokenLogicFactory = new PayToken__factory(_signer || signer1)

        const tokenLogic = await tokenLogicFactory.deploy();

        const tokenProxyFactory = new TokenProxy__factory(_signer || proxyOwner)

        const tokenProxy = await tokenProxyFactory.deploy(
          tokenLogic.address, 
          proxyOwnerAddr,
          "0x"
        );

        const token = await tokenLogic.attach(
          tokenProxy.address
        );

        await token.__Token_init(
            tokenName,
            tokenSymbol,
            signer1Addr,
            masterMinterAddr,
            _initialSupply
        )

        return token
    }

    it("initialize contract correctly", async () => {
        expect(await PayToken.name()).to.equal("Pay")
        expect(await PayToken.symbol()).to.equal("PT")
        expect(await PayToken.decimals()).to.equal(18)

        expect(await PayToken.balanceOf(PayToken.address)).to.equal(
            0
        )
    })

    it("non master minter can not add new minters", async () => {
        let PayTokenS2 = PayToken.connect(signer2)

        await expect(
            PayTokenS2.configureMinter(
                signer3Addr,
                oneHundred
            )
        ).to.be.revertedWith("PayToken: caller is not the masterMinter")
    })

    it("master minter can add new minters", async () => {
        let PayTokenMM = PayToken.connect(masterMinter)

        await PayTokenMM.configureMinter(
            signer3Addr,
            oneHundred
        )

        expect(
            await PayToken.minterAllowance(signer3Addr)
        ).to.equal(oneHundred)

        expect(
            await PayToken.isMinter(signer3Addr)
        ).to.equal(true)
    })

    it("non master minter can not remove a minter", async () => {
        let PayTokenMM = PayToken.connect(masterMinter)

        await PayTokenMM.configureMinter(
            signer3Addr,
            oneHundred
        )

        expect(
            await PayToken.isMinter(signer3Addr)
        ).to.equal(true)

        let PayTokenS2 = PayToken.connect(signer2)

        await expect(
            PayTokenS2.removeMinter(signer3Addr)
        ).to.be.revertedWith("PayToken: caller is not the masterMinter")
    })

    it("master minter can remove a minter", async () => {
        let PayTokenMM = PayToken.connect(masterMinter)

        await PayTokenMM.configureMinter(
            signer3Addr,
            oneHundred
        )

        expect(
            await PayToken.isMinter(signer3Addr)
        ).to.equal(true)

        await PayTokenMM.removeMinter(signer3Addr)

        expect(
            await PayToken.isMinter(signer3Addr)
        ).to.equal(false)
    })

    it("only owner can update master minter", async () => {
        let PayTokenS2 = PayToken.connect(signer2)

        await expect(
            PayTokenS2.updateMasterMinter(
                signer3Addr
            )
        ).to.be.revertedWith("Ownable: caller is not the owner")


        let PayTokenS1 = PayToken.connect(signer1)

        await PayTokenS1.updateMasterMinter(signer3Addr)

        expect(
            await PayToken.theMasterMinter()
        ).to.equal(signer3Addr)
    })

    it("non minters can not mint new tokens", async () => {
        let PayTokenMM = PayToken.connect(masterMinter)

        await PayTokenMM.configureMinter(
            signer3Addr,
            oneHundred.mul(4)
        )

        let PayTokenS4 = PayToken.connect(signer4)

        await expect(
            PayTokenS4.mintAndDistribute(
                oneHundred.mul(4),
                [5000, 2500, 2500]
            )
        ).to.be.revertedWith("PayToken: caller is not a minter")

    })

    // it("minters can mint new tokens", async () => {
    //     let PayTokenMM = PayToken.connect(masterMinter)

    //     await PayTokenMM.configureMinter(
    //         signer3Addr,
    //         oneHundred.mul(4)
    //     )

    //     let PayTokenS3 = PayToken.connect(signer3)

    //     await PayTokenS3.mintAndDistribute(
    //         oneHundred.mul(4)
    //     )

    //     expect(
    //         await PayToken.balanceOf(signer4Addr)
    //     ).to.equal(oneHundred)

    // })

    it("non minters can not burn tokens", async () => {
        let PayTokenMM = PayToken.connect(masterMinter)

        await PayTokenMM.configureMinter(
            signer3Addr,
            oneHundred
        )

        let PayTokenS4 = PayToken.connect(signer4)

        await expect(
            PayTokenS4.burn(
                oneHundred
            )
        ).to.be.revertedWith("PayToken: caller is not a minter")

    })

    // it("minters can burn tokens", async () => {
    //     let PayTokenMM = PayToken.connect(masterMinter)

    //     await PayTokenMM.configureMinter(
    //         signer3Addr,
    //         oneHundred.mul(4)
    //     )

    //     let PayTokenS3 = PayToken.connect(signer3)

    //     await PayTokenS3.mintAndDistribute(
    //         oneHundred.mul(4)
    //     )

    //     expect(
    //         await PayToken.balanceOf(signer3Addr)
    //     ).to.equal(oneHundred)

    //     expect(
    //         await PayTokenS3.burn(oneHundred)
    //     ).to.emit(PayToken, "Burn")

    // })

    it("transferWithReferralCode", async () => {
        await PayToken.transfer(
            signer4Addr,
            oneHundred.mul(2)
        )

        let PayTokenS4 = PayToken.connect(signer4)

        expect(
            await PayTokenS4.transferWithReferralCode(
                signer1Addr,
                oneHundred,
                theReferralCode
            )
        ).to.emit(PayToken, "TransferWithReferralCode")

    })

    it("transferFromWithReferralCode", async () => {
        await PayToken.transfer(
            signer4Addr,
            oneHundred.mul(2)
        )

        let PayTokenS4 = PayToken.connect(signer4)

        await PayTokenS4.approve(signer2Addr, oneHundred)

        let PayTokenS2 = PayToken.connect(signer2)

        expect(
            await PayTokenS2.transferFromWithReferralCode(
                signer4Addr,
                signer1Addr,
                oneHundred,
                theReferralCode
            )
        ).to.emit(PayToken, "TransferWithReferralCode")

    })

    // it("mint for VIP", async () => {
    //     let PayTokenMM = PayToken.connect(masterMinter)

    //     await PayTokenMM.configureMinter(
    //         signer3Addr,
    //         oneHundred.mul(4)
    //     )

    //     let PayTokenS3 = PayToken.connect(signer3)

    //     expect(
    //         await PayTokenS3.mintForVIP(
    //             vip1Addr,
    //             oneHundred.mul(2)
    //         )
    //     ).to.emit(PayTokenS3, "MintForVIP")
    // })

    // it("mint for normal", async () => {
    //     let PayTokenMM = PayToken.connect(masterMinter)

    //     await PayTokenMM.configureMinter(
    //         signer3Addr,
    //         oneHundred.mul(4)
    //     )

    //     let PayTokenS3 = PayToken.connect(signer3)

    //     expect(
    //         await PayTokenS3.mintForNormal(
    //             signer4Addr,
    //             oneHundred.mul(2)
    //         )
    //     ).to.emit(PayTokenS3, "MintForNormal")
    // })
})
