import { ethers } from "hardhat";
import { expect } from "chai";
import chai from "chai";
import { solidity } from "ethereum-waffle";
// import { beforeEach } from "mocha";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity); 

describe("Waves Minter - Mint Wave", () => {

    let pigsContract: Contract;
    let thiefsContract: Contract;
    let wavesMinterContract: Contract;

    const pigsNum: number = 0;
    const thiefsNum: number = 1;
    
    let presalePrice: BigNumber; // 1.1 usd in ETH
    let wave1Price: BigNumber;   // 1.25 usd in ETH
    let wave2Price: BigNumber;   // 1.5 usd in ETH
    let wave3Price: BigNumber;   // 1.75 usd in ETH

    let accounts: SignerWithAddress[]; // 10 accounts

    // accounts for presale
    let owner: SignerWithAddress;
    let account1: SignerWithAddress;
    // accounts for first wave
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let account4: SignerWithAddress;
    let account5: SignerWithAddress;
    let notInWhitelist: SignerWithAddress;

    enum SaleStatus {
        Disable, // 0
        Presale, // 1
        Wave1,   // 2
        Wave2,   // 3
        Wave3,   // 4
        Giveaway // 5
    }

    beforeEach(async () => {
        // accounts
        accounts = await ethers.getSigners();
        [owner, account1, account2, account3, account4, account5, notInWhitelist] = await ethers.getSigners();

        // deploy
        const PigsFactory = await ethers.getContractFactory("MetaPigs");
        pigsContract = await PigsFactory.connect(owner).deploy();
        await pigsContract.deployed();

        const ThiefsFactory = await ethers.getContractFactory("MetaThieves");
        thiefsContract = await ThiefsFactory.connect(owner).deploy();
        await thiefsContract.deployed();

        const WavesMinterFactory = await ethers.getContractFactory("WavesMinterForTests");
        wavesMinterContract = await WavesMinterFactory.connect(owner).deploy(
            pigsContract.address,
            thiefsContract.address
        );
        await wavesMinterContract.deployed();

        // set minter
        const setMinterTx = await pigsContract.connect(owner).setMinter(wavesMinterContract.address);
        await setMinterTx.wait();

        const setMinterTxx = await thiefsContract.connect(owner).setMinter(wavesMinterContract.address);
        await setMinterTxx.wait();

        // before sale
        const enableSaleTx = await wavesMinterContract.connect(owner).enableSale();
        await enableSaleTx.wait();

        presalePrice = await wavesMinterContract.getSalePrice(110); // 1.1 usd in ETH

        const addToWhiteListBatchTx = await wavesMinterContract.connect(owner).addToWhiteListBatch(
            [owner.address, account1.address, account2.address, account3.address, account4.address]
        );
        await addToWhiteListBatchTx.wait();

        // go to the first wave
        const mintPresaleTx1 = await wavesMinterContract.connect(owner).mintPresale(pigsNum, 0, { value: presalePrice });
        await mintPresaleTx1.wait();

        const mintPresaleTx2 = await wavesMinterContract.connect(owner).mintPresale(pigsNum, 1, { value: presalePrice });
        await mintPresaleTx2.wait();

        const mintPresaleTx3 = await wavesMinterContract.connect(owner).mintPresale(pigsNum, 2, { value: presalePrice });
        await mintPresaleTx3.wait();

        const mintPresaleTx4 = await wavesMinterContract.connect(account1).mintPresale(thiefsNum, 8, { value: presalePrice });
        await mintPresaleTx4.wait();
        
        const mintPresaleTx5 = await wavesMinterContract.connect(account1).mintPresale(thiefsNum, 9, { value: presalePrice });
        await mintPresaleTx5.wait();

        wave1Price = await wavesMinterContract.getSalePrice(135); // 1.35 usd in ETH
        wave2Price = await wavesMinterContract.getSalePrice(160); // 1.60 usd in ETH
        wave3Price = await wavesMinterContract.getSalePrice(185); // 1.85 usd in ETH
        
        const mintPresaleTx6 = await wavesMinterContract.connect(account1).mintPresale(thiefsNum, 10, { value: presalePrice });
        await mintPresaleTx6.wait();
    });

    describe("Mint Wave", () => {

        it("should mint pig nft to user", async () => {
            const mintWave1Tx = await wavesMinterContract.connect(account2).mintWave1(
                pigsNum,
                3, // id to test pigs
                { value: wave1Price }
            );

            await mintWave1Tx.wait();

            expect(
                await pigsContract.balanceOf(account2.address)
            ).to.equal(1);
        });

        it("should mint thief nft to user", async () => {            
            const mintWave1Tx = await wavesMinterContract.connect(account2).mintWave1(
                thiefsNum,
                11, // first id to test thiefs
                { value: wave1Price } 
            );

            await mintWave1Tx.wait();
            
            expect(
                await thiefsContract.connect(account2).balanceOf(account2.address)
            ).to.equal(1);
        });

        it("should not be minted more 3 pig nft to the same address", async () => {
            const mintWave1Tx1 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price });
            await mintWave1Tx1.wait();

            const mintWave1Tx2 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 4, { value: wave1Price });
            await mintWave1Tx2.wait();
            
            const mintWave1Tx3 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 5, { value: wave1Price });
            await mintWave1Tx3.wait();

            await expect(  
                wavesMinterContract.connect(account2).mintWave1(pigsNum, 6, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: Mints token limit exhausted");
        });

        it("should not be minted if msg.value is less than wave1 price", async () => {
            await expect(  
                wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: presalePrice })
            ).to.be.reverted;
        });

        it("should not be minted with incorrect contract number", async () => {
            const fakeContractNum: number = 2;

            await expect(  
                wavesMinterContract.connect(account2).mintWave1(fakeContractNum, 3, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: Incorrect contract number");
        });

        it("should not be minted pig with incorrect id", async () => {
            await expect(
                wavesMinterContract.connect(account2).mintWave1(pigsNum, 8, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: Incorrect pig id");
        });

        it("should not be minted pig with already minted id", async () => {
            const mintWave1Tx = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price });

            await mintWave1Tx.wait();

            await expect(
                wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: This pig id is already minted");
        });

        it("should not be minted thief with incorrect id", async () => {
            await expect(  
                wavesMinterContract.connect(account2).mintWave1(thiefsNum, 5, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: Incorrect thief id");
        });

        it("should not be minted thief with already minted id", async () => {
            const mintWave1TxmintWave1Tx = await wavesMinterContract.connect(account2).mintWave1(thiefsNum, 11, { value: wave1Price });

            await mintWave1TxmintWave1Tx.wait();

            await expect(  
                wavesMinterContract.connect(account2).mintWave1(thiefsNum, 11, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: This thief id is already minted");
        });

        it("should not be minted more 6 (2250) pig on first wave", async () => {
            const mintWave1Tx1 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price });
            await mintWave1Tx1.wait();

            const mintWave1Tx2 = await wavesMinterContract.connect(account3).mintWave1(pigsNum, 4, { value: wave1Price });
            await mintWave1Tx2.wait();

            const mintWave1Tx3 = await wavesMinterContract.connect(account4).mintWave1(pigsNum, 5, { value: wave1Price });
            await mintWave1Tx3.wait();

            await expect(  
                wavesMinterContract.connect(account4).mintWave1(pigsNum, 6, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: All pigs already minted in first wave");
        });

        it("should not be minted more 6 (2250) thief on first wave ", async () => {
            const mintWave1Tx1 = await wavesMinterContract.connect(account2).mintWave1(thiefsNum, 11, { value: wave1Price });
            await mintWave1Tx1.wait();
            
            const mintWave1Tx2 = await wavesMinterContract.connect(account3).mintWave1(thiefsNum, 12, { value: wave1Price });
            await mintWave1Tx2.wait();
            
            const mintWave1Tx3 = await wavesMinterContract.connect(account4).mintWave1(thiefsNum, 13, { value: wave1Price });
            await mintWave1Tx3.wait();
            
            await expect(  
                wavesMinterContract.connect(account4).mintWave1(thiefsNum, 14, { value: wave1Price })
            ).to.be.revertedWith("WavesMinter: All thiefs already minted in first wave");
        });

        it("should go to the second wave ", async () => {
            const mintWave1Tx1 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price });
            await mintWave1Tx1.wait();

            const mintWave1Tx2 = await wavesMinterContract.connect(account3).mintWave1(pigsNum, 4, { value: wave1Price });
            await mintWave1Tx2.wait();

            const mintWave1Tx3 = await wavesMinterContract.connect(account4).mintWave1(pigsNum, 5, { value: wave1Price });
            await mintWave1Tx3.wait();

            const mintWave1Tx4 = await wavesMinterContract.connect(account2).mintWave1(thiefsNum, 11, { value: wave1Price });
            await mintWave1Tx4.wait();
            
            const mintWave1Tx5 = await wavesMinterContract.connect(account3).mintWave1(thiefsNum, 12, { value: wave1Price });
            await mintWave1Tx5.wait();
            
            const mintWave1Tx6 = await wavesMinterContract.connect(account4).mintWave1(thiefsNum, 13, { value: wave1Price });
            await mintWave1Tx6.wait();
            
            expect(  
                await wavesMinterContract.connect(account2).saleStatus()
            ).to.be.equal(SaleStatus.Wave2);
        });

        it("should increase balance of contract", async () => {
            const contractBalanceBefore = await wavesMinterContract.getContractBalance();

            const mintWave1Tx = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price });
            await mintWave1Tx.wait();

            const contractBalanceAfter = await wavesMinterContract.getContractBalance();

            expect(contractBalanceAfter).to.equal(contractBalanceBefore.add(wave1Price));
        });

    });

    describe("Mint Waves", () => {

        it("should complete sale ", async () => {

            // one
            const mintWave1Tx1 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 3, { value: wave1Price });
            await mintWave1Tx1.wait();

            const mintWave1Tx2 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 4, { value: wave1Price });
            await mintWave1Tx2.wait();

            const mintWave1Tx3 = await wavesMinterContract.connect(account2).mintWave1(pigsNum, 5, { value: wave1Price });
            await mintWave1Tx3.wait();

            const mintWave1Tx4 = await wavesMinterContract.connect(account3).mintWave1(thiefsNum, 11, { value: wave1Price });
            await mintWave1Tx4.wait();
            
            const mintWave1Tx5 = await wavesMinterContract.connect(account3).mintWave1(thiefsNum, 12, { value: wave1Price });
            await mintWave1Tx5.wait();
            
            const mintWave1Tx6 = await wavesMinterContract.connect(account3).mintWave1(thiefsNum, 13, { value: wave1Price });
            await mintWave1Tx6.wait();

            // two
            const mintWave1Tx7 = await wavesMinterContract.connect(account4).mintWave2(pigsNum, 6, { value: wave2Price });
            await mintWave1Tx7.wait();

            const mintWave1Tx8 = await wavesMinterContract.connect(account4).mintWave2(thiefsNum, 14, { value: wave2Price });
            await mintWave1Tx8.wait();

            // three
            const mintWave1Tx9 = await wavesMinterContract.connect(account4).mintWave3(pigsNum, 7, { value: wave3Price });
            await mintWave1Tx9.wait();

            const mintWave1Tx10 = await wavesMinterContract.connect(account5).mintWave3(thiefsNum, 15, { value: wave3Price });
            await mintWave1Tx10.wait();

            // giveaway
            const mintWave1Tx11 = await wavesMinterContract.connect(account5).mintGiveaway(pigsNum, 16);
            await mintWave1Tx11.wait();

            const mintWave1Tx12 = await wavesMinterContract.connect(account5).mintGiveaway(thiefsNum, 17);
            await mintWave1Tx12.wait();

            expect(  
                await wavesMinterContract.connect(account2).saleStatus()
            ).to.be.equal(SaleStatus.Disable);
        });

    });

});
