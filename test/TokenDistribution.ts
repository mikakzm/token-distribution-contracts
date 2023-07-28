import { expect, use } from "chai"
import { ethers } from "hardhat"
import { Signer, BigNumber, BigNumberish, Contract } from "ethers"
import { Address } from "hardhat-deploy/dist/types";
import { solidity, MockProvider } from "ethereum-waffle"
import { PayToken } from "../typechain/PayToken"
import { PayToken__factory } from "../typechain/factories/PayToken__factory"
import { TokenProxy__factory } from "../typechain/factories/TokenProxy__factory"

use(solidity)

describe("Token Distribution", async () => {
    let tokenName = "Paytoken"
    let tokenSymbol = "PT"
    // let tokenCurrency = "NullCurrency"

    let masterMinter: Signer
    let fundWallet: Signer
    let signer1: Signer
    let signer2: Signer
    let signer3: Signer
    let coreSigner1: Signer
	let coreSigner2: Signer
    let founderSigner1: Signer
	let founderSigner2: Signer
    let proxyOwner: Signer
    

    let masterMinterAddr: Address
    let fundWalletAddr: Address
    let signer1Addr: Address
    let signer2Addr: Address
    let signer3Addr: Address
    let coreSigner1Addr: Address
	let coreSigner2Addr: Address
    let founder1Addr: Address
	let founder2Addr: Address
    let proxyOwnerAddr: Address

    const oneHundred = BigNumber.from(10).pow(18).mul(100);
    const oneUnit = BigNumber.from(10).pow(18);
    const _initialSupply =  oneUnit.mul(300).mul(1000000);
	const _totalSupply =  oneUnit.mul(300).mul(1000000);

    const founder = 2;
    const core = 1;
    const user = 0;

    let Paytoken: Contract

    beforeEach(async () => {
        [masterMinter, fundWallet, signer1, signer2, signer3, coreSigner1, coreSigner2, founderSigner1, founderSigner2, proxyOwner] = await ethers.getSigners()
        masterMinterAddr = await masterMinter.getAddress()
        fundWalletAddr = await fundWallet.getAddress()
        signer1Addr = await signer1.getAddress()
        signer2Addr = await signer2.getAddress()
        signer3Addr = await signer3.getAddress()
        coreSigner1Addr = await coreSigner1.getAddress()
		coreSigner2Addr = await coreSigner2.getAddress()
        founder1Addr = await founderSigner1.getAddress()
		founder2Addr = await founderSigner2.getAddress()
        proxyOwnerAddr = await proxyOwner.getAddress()
        Paytoken = await deployPayToken()
        await initializeLevels();
		await initializeBalances();
    })

    const initializeLevels = async () => {
		expect(
			await Paytoken.changeLevel(
				founder1Addr,
				founder
			)
		).to.emit(Paytoken, "ChangeLevel");

		expect(
			await Paytoken.changeLevel(
				founder2Addr,
				founder
			)
		).to.emit(Paytoken, "ChangeLevel");

		expect(
			await Paytoken.changeLevel(
				coreSigner1Addr,
				core
			)
		).to.emit(Paytoken, "ChangeLevel");

		expect(
			await Paytoken.changeLevel(
				coreSigner2Addr,
				core
			)
		).to.emit(Paytoken, "ChangeLevel");
    }

	const initializeBalances = async () => {
        await Paytoken.transfer(
			signer2Addr,
			oneUnit.mul(100)
		  )
  
		  await Paytoken.transfer(
			signer3Addr,
			oneUnit.mul(200)
		  )
  
		  await Paytoken.transfer(
			coreSigner1Addr,
			oneUnit.mul(250)
		  )

		  await Paytoken.transfer(
			coreSigner2Addr,
			oneUnit.mul(200)
		  )
  
		  await Paytoken.transfer(
			founder1Addr,
			oneUnit.mul(400)
		  )

		  await Paytoken.transfer(
			founder2Addr,
			oneUnit.mul(500)
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
            fundWalletAddr,
            signer1Addr,
            _initialSupply
        )

        return token
    }

    it("initialize contract correctly", async () => {
        expect(await Paytoken.name()).to.equal("Paytoken")
        expect(await Paytoken.symbol()).to.equal("PT")
        expect(await Paytoken.decimals()).to.equal(18)

        expect(await Paytoken.balanceOf(Paytoken.address)).to.equal(
          0
        )
		expect(await Paytoken.totalSupply()).to.equal(_initialSupply);
        expect(await Paytoken.fund_wallet()).to.equal(await fundWallet.getAddress());
    })

    it("initialize levels correctly", async () => {
        expect(
          await Paytoken.levelOf(coreSigner1Addr)
        ).to.equal(core)
        expect(
          await Paytoken.levelOf(founder1Addr)
        ).to.equal(founder)
    })

    it("initialize balances correctly", async () => {
        expect(
            await Paytoken.balanceOf(signer2Addr)
        ).to.equal(oneUnit.mul(100))
        expect(
            await Paytoken.balanceOf(signer3Addr)
        ).to.equal(oneUnit.mul(200))
        expect(
            await Paytoken.balanceOf(coreSigner1Addr)
        ).to.equal(oneUnit.mul(250))
		expect(
            await Paytoken.balanceOf(coreSigner2Addr)
        ).to.equal(oneUnit.mul(200))
        expect(
            await Paytoken.balanceOf(founder1Addr)
        ).to.equal(oneUnit.mul(400))
		expect(
            await Paytoken.balanceOf(founder2Addr)
        ).to.equal(oneUnit.mul(500))
		expect(await Paytoken.totalSupply()).to.equal(_totalSupply);
    })

    it("non owner accounts can't mint new tokens", async () => {
        let PaytokenS2 = Paytoken.connect(signer2)

        await expect(
            PaytokenS2.mintAndDistribute(
                oneHundred,
                [5000, 2500, 2500]
            )
        ).to.be.revertedWith("PayToken: caller is not a minter")
    })

	it("non owner accounts can't change other account's level", async () => {
        let PaytokenS2 = Paytoken.connect(signer2)

        await expect(
            PaytokenS2.changeLevel(
				signer3Addr,
                founder
            )
        ).to.be.revertedWith("PayToken: caller is not the masterMinter")
    })

	it("can't change level of fund wallet", async () => {
        await expect(
            Paytoken.changeLevel(
				fundWalletAddr,
                founder
            )
        ).to.be.revertedWith("Distribution: can not change fund address level")
    })

	const epsilon = BigNumber.from(10);

    it("owner can mint new tokens and new tokens distribution is correct", async () => {
        await Paytoken.configureMinter(
            signer1Addr,
            oneUnit.mul(1000)
        )
        await Paytoken.mintAndDistribute(
            oneUnit.mul(1000),
            [5000, 2500, 2500]
        )

        expect(
            await Paytoken.balanceOf(founder1Addr)
        ).to.equal(oneUnit.mul(400).add(oneUnit.mul(250 * 4).div(9)))

		expect(
            await Paytoken.balanceOf(founder2Addr)
        ).to.equal(oneUnit.mul(500).add(oneUnit.mul(250 * 5).div(9)))

        expect(
            await Paytoken.balanceOf(coreSigner1Addr)
        ).to.equal(oneUnit.mul(250).add(oneUnit.mul(250 * 25).div(45)))

		expect(
            await Paytoken.balanceOf(coreSigner2Addr)
        ).to.equal(oneUnit.mul(200).add(oneUnit.mul(250 * 20).div(45)))

        expect(
            await Paytoken.balanceOf(fundWalletAddr)
        ).to.equal(oneUnit.mul(500))

		expect(await Paytoken.totalSupply()).to.equal(_totalSupply.add(oneUnit.mul(1000)));
    })

    it("sum of distribution percentages must be 1", async () => {
        await Paytoken.configureMinter(
            signer1Addr,
            oneUnit.mul(1000)
        )

        await expect(
            Paytoken.mintAndDistribute(
                oneUnit.mul(1000),
                [5000, 2500, 100]
            )
        ).to.be.revertedWith("Distribution: sum of distribution percentages must be 10000")
    })

	it("mint, changing level from 0 to level 1, mint again works correctly", async () => {
        await Paytoken.configureMinter(
            signer1Addr,
            oneUnit.mul(3000)
        )
        await Paytoken.mintAndDistribute(
            oneUnit.mul(1000),
            [5000, 2500, 2500]
        )

		let oldBalanceCore1 =  await Paytoken.balanceOf(coreSigner1Addr);
		let oldBalanceCore2 = await Paytoken.balanceOf(coreSigner2Addr);
		let oldBalanceCore3 = await Paytoken.balanceOf(signer3Addr);
		let sumOldBalances = oldBalanceCore1.add(oldBalanceCore2).add(oldBalanceCore3);
        await Paytoken.changeLevel(
          signer3Addr,
          core
        )
		expect(
			await Paytoken.levelOf(signer3Addr)
		).to.equal(core)

		await Paytoken.mintAndDistribute(
            oneUnit.mul(2000),
            [5000, 2500, 2500]
        )
        
        expect(
            await Paytoken.balanceOf(fundWalletAddr)
        ).to.equal(oneUnit.mul(1500))

        expect(
            await Paytoken.balanceOf(coreSigner1Addr)
        ).to.be.closeTo(oldBalanceCore1.add(oneUnit.mul(500).mul(oldBalanceCore1).div(sumOldBalances)), epsilon)

		expect(
            await Paytoken.balanceOf(coreSigner2Addr)
        ).to.be.closeTo(oldBalanceCore2.add(oneUnit.mul(500).mul(oldBalanceCore2).div(sumOldBalances)), epsilon)

		expect(
            await Paytoken.balanceOf(signer3Addr)
        ).to.be.closeTo(oldBalanceCore3.add(oneUnit.mul(500).mul(oldBalanceCore3).div(sumOldBalances)), epsilon)


		expect(await Paytoken.totalSupply()).to.equal(_totalSupply.add(oneUnit.mul(3000)));

    })

	it("transfer between account and then mint works correctly", async () => {
		let PaytokenS2 = Paytoken.connect(signer2)
        await PaytokenS2.transfer(
			founder1Addr,
            oneUnit.mul(20)
        )

		let PaytokenF2 = Paytoken.connect(founderSigner2)
		await PaytokenF2.transfer(
			coreSigner1Addr,
            oneUnit.mul(50)
        )

		let PaytokenC2 = Paytoken.connect(coreSigner2)
		await PaytokenC2.transfer(
			coreSigner1Addr,
            oneUnit.mul(30)
        )

		expect(
            await Paytoken.balanceOf(signer2Addr)
        ).to.be.closeTo(oneUnit.mul(80), epsilon)

		expect(
            await Paytoken.balanceOf(founder1Addr)
        ).to.be.closeTo(oneUnit.mul(420), epsilon)

		expect(
            await Paytoken.balanceOf(founder2Addr)
        ).to.be.closeTo(oneUnit.mul(450), epsilon)

		expect(
            await Paytoken.balanceOf(coreSigner2Addr)
        ).to.be.closeTo(oneUnit.mul(170), epsilon)

		expect(
            await Paytoken.balanceOf(coreSigner1Addr)
        ).to.be.closeTo(oneUnit.mul(330), epsilon)

        await Paytoken.configureMinter(
            signer1Addr,
            oneUnit.mul(300)
        )

		await Paytoken.mintAndDistribute(
            oneUnit.mul(300),
            [5000, 2500, 2500]
        )
		
		expect(
            await Paytoken.balanceOf(founder1Addr)
        ).to.be.closeTo(oneUnit.mul(420).add(oneUnit.mul(420 * 75).div(870)), epsilon)

		expect(
            await Paytoken.balanceOf(founder2Addr)
        ).to.be.closeTo(oneUnit.mul(450).add(oneUnit.mul(450 * 75).div(870)), epsilon)

		expect(
            await Paytoken.balanceOf(coreSigner1Addr)
        ).to.be.closeTo(oneUnit.mul(330).add(oneUnit.mul(330 * 75).div(500)), epsilon)

		expect(
            await Paytoken.balanceOf(coreSigner2Addr)
        ).to.be.closeTo(oneUnit.mul(170).add(oneUnit.mul(170 * 75).div(500)), epsilon)

		expect(await Paytoken.totalSupply()).to.equal(_totalSupply.add(oneUnit.mul(300)));
    })

	// it("mint to non regular shareholder works correctly", async () => {
    //     await Paytoken.configureMinter(
    //         signer1Addr,
    //         oneUnit.mul(30)
    //     )
	// 	await Paytoken.mintForVIP(
	// 		coreSigner2Addr,
    //         oneUnit.mul(30)
    //     );
    //     expect(
    //         await Paytoken.balanceOf(fundWalletAddr)
    //     ).to.equal(oneUnit.mul(60))

	// 	expect(
    //         await Paytoken.balanceOf(founder1Addr)
    //     ).to.be.closeTo(oneUnit.mul(400).add(oneUnit.mul(30 * 4).div(9)), epsilon)

	// 	expect(
    //         await Paytoken.balanceOf(founder2Addr)
    //     ).to.be.closeTo(oneUnit.mul(500).add(oneUnit.mul(30 * 5).div(9)), epsilon)

	// 	expect(
    //         await Paytoken.balanceOf(coreSigner2Addr)
    //     ).to.be.closeTo(oneUnit.mul(230), epsilon)
		
	// 	expect(await Paytoken.totalSupply()).to.equal(_totalSupply.add(oneUnit.mul(120)));
	// })

	// it("mint to regular shareholder works correctly", async () => {
    //     await Paytoken.configureMinter(
    //         signer1Addr,
    //         oneUnit.mul(30)
    //     )

	// 	await Paytoken.mintForNormal(
	// 		signer2Addr,
    //         oneUnit.mul(30)
    //     );
		    
	// 	expect(
    //         await Paytoken.balanceOf(signer2Addr)
    //     ).to.be.closeTo(oneUnit.mul(130), epsilon)

	// 	expect(
    //         await Paytoken.balanceOf(founder1Addr)
    //     ).to.be.closeTo(oneUnit.mul(400).add(oneUnit.mul(15 * 4).div(9)), epsilon)

	// 	expect(
    //         await Paytoken.balanceOf(founder2Addr)
    //     ).to.be.closeTo(oneUnit.mul(500).add(oneUnit.mul(15 * 5).div(9)), epsilon)

	// 	expect(
    //         await Paytoken.balanceOf(coreSigner1Addr)
    //     ).to.be.closeTo(oneUnit.mul(250).add(oneUnit.mul(15 * 25).div(45)), epsilon)

	// 	expect(
    //         await Paytoken.balanceOf(coreSigner2Addr)
    //     ).to.be.closeTo(oneUnit.mul(200).add(oneUnit.mul(15 * 20).div(45)), epsilon)

	// 	expect(await Paytoken.totalSupply()).to.equal(_totalSupply.add(oneUnit.mul(60)));

	// })

	// it("mint to regular shareholder doesn't work for non regular shareholders", async () => {
    //     await Paytoken.configureMinter(
    //         signer1Addr,
    //         oneUnit.mul(6000)
    //     ) 

	// 	await expect ( Paytoken.mintForNormal(
	// 		founder1Addr,
    //         oneUnit.mul(2000)
    //     )).to.be.revertedWith("Distribution: account is not normal");

	// 	await expect ( Paytoken.mintForNormal(
	// 		coreSigner1Addr,
    //         oneUnit.mul(2000)
    //     )).to.be.revertedWith("Distribution: account is not normal");

	// 	await Paytoken.changeLevel(
	// 		signer3Addr,
	// 		core
	// 	)

	// 	await expect ( Paytoken.mintForNormal(
	// 		signer3Addr,
    //         oneUnit.mul(2000)
    //     )).to.be.revertedWith("Distribution: account is not normal");

	// })

	// it("mint to non regular shareholder doesn't work for regular shareholders", async () => {
    //     await Paytoken.configureMinter(
    //         signer1Addr,
    //         oneUnit.mul(4000)
    //     )

	// 	await expect ( Paytoken.mintForVIP(
	// 		signer2Addr,
    //         oneUnit.mul(2000)
    //     )).to.be.revertedWith("Distribution: account is not VIP");

	// 	await Paytoken.changeLevel(
	// 		founder1Addr,
	// 		user
	// 	)

	// 	await expect ( Paytoken.mintForVIP(
	// 		founder1Addr,
    //         oneUnit.mul(2000)
    //     )).to.be.revertedWith("Distribution: account is not VIP");

	// })

	it("burn and mint again works correctly", async () => {
        await Paytoken.configureMinter(
            founder1Addr,
            oneUnit.mul(100)
        )

        expect(
            await Paytoken.isMinter(founder1Addr)
        ).to.equal(true)

        let PaytokenF1 = Paytoken.connect(founderSigner1)

		await PaytokenF1.burn(
            oneUnit.mul(100)
        )


		expect(
            await Paytoken.balanceOf(founder1Addr)
        ).to.be.closeTo(oneUnit.mul(300), epsilon)

        await Paytoken.configureMinter(
            signer1Addr,
            oneUnit.mul(300)
        )

		await Paytoken.mintAndDistribute(
            oneUnit.mul(300),
            [5000, 2500, 2500]
        )

		expect(
            await Paytoken.balanceOf(founder1Addr)
        ).to.be.closeTo(oneUnit.mul(300).add(oneUnit.mul(75 * 3).div(8)), epsilon)

		expect(
            await Paytoken.balanceOf(founder2Addr)
        ).to.be.closeTo(oneUnit.mul(500).add(oneUnit.mul(75 * 5).div(8)), epsilon)

		expect(await Paytoken.totalSupply()).to.equal(_totalSupply.add(oneUnit.mul(200)));
	})
	
})

