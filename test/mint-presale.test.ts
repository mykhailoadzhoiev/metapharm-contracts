import { ethers } from "hardhat";
import { expect } from "chai";
import chai from "chai";
import { solidity } from "ethereum-waffle";
// import { beforeEach } from "mocha";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity); 

describe("Waves Minter - Mint Presale", () => {

    let pigsContract: Contract;
    let thiefsContract: Contract;
    let wavesMinterContract: Contract;

    const pigsNum: number = 0;
    const thiefsNum: number = 1;
    
    let fakePrice: BigNumber;    // 0.9 usd in ETH
    let presalePrice: BigNumber; // 1.1 usd in ETH

    let accounts: SignerWithAddress[]; // 10 accounts

    let owner: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let account4: SignerWithAddress;
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
        [owner, account1, account2, account3, account4, notInWhitelist] = await ethers.getSigners();

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
        fakePrice = await wavesMinterContract.getSalePrice(90); // 0.9 usd in ETH

        const addToWhiteListBatchTx = await wavesMinterContract.connect(owner).addToWhiteListBatch(
            [owner.address, account1.address, account2.address, account3.address, account4.address]
        );
        await addToWhiteListBatchTx.wait();

    });

    xdescribe("Mint Presale", () => {

        it("should mint pig nft to user", async () => {
            const mintPresaleTx = await wavesMinterContract.connect(account1).mintPresale(
                pigsNum,
                0, // first id to test pigs
                { value: presalePrice }
            );

            await mintPresaleTx.wait();

            expect(
                await pigsContract.balanceOf(account1.address)
            ).to.equal(1);
        });

        it("should mint thief nft to user", async () => {            
            const mintPresaleTx = await wavesMinterContract.connect(account1).mintPresale(
                thiefsNum,
                8, // first id to test thiefs
                { value: presalePrice } 
            );

            await mintPresaleTx.wait();
            
            expect(
                await thiefsContract.connect(account1).balanceOf(account1.address)
            ).to.equal(1);
        });

        it("should not be minted more 3 pig nft to the same address", async () => {
            const mintPresaleTx1 = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: presalePrice });
            await mintPresaleTx1.wait();

            const mintPresaleTx2 = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 1, { value: presalePrice });
            await mintPresaleTx2.wait();
            
            const mintPresaleTx3 = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 2, { value: presalePrice });
            await mintPresaleTx3.wait();

            await expect(  
                wavesMinterContract.connect(account1).mintPresale(pigsNum, 3, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: Mints token limit exhausted");
        });

        it("should not be minted if msg.value is less than presale price", async () => {
            await expect(  
                wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: fakePrice })
            ).to.be.reverted;
        });

        it("should not be minted with incorrect contract number", async () => {
            const fakeContractNum: number = 2;

            await expect(  
                wavesMinterContract.connect(account1).mintPresale(fakeContractNum, 2, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: Incorrect contract number");
        });

        it("should not be minted for not whitelist address", async () => {
            await expect(  
                wavesMinterContract.connect(notInWhitelist).mintPresale(pigsNum, 0, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: Token receiver is not in the whitelist");
        });

        it("should not be minted pig with incorrect id", async () => {
            await expect(
                wavesMinterContract.connect(account1).mintPresale(pigsNum, 8, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: Incorrect pig id");
        });

        it("should not be minted pig with already minted id", async () => {
            const mintPresaleTx = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: presalePrice });

            await mintPresaleTx.wait();

            await expect(
                wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: This pig id is already minted");
        });

        it("should not be minted thief with incorrect id", async () => {
            await expect(  
                wavesMinterContract.connect(account1).mintPresale(thiefsNum, 11, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: Incorrect thief id");
        });

        it("should not be minted thief with already minted id", async () => {
            const mintPresaleTx = await wavesMinterContract.connect(account1).mintPresale(thiefsNum, 8, { value: presalePrice });

            await mintPresaleTx.wait();

            await expect(  
                wavesMinterContract.connect(account1).mintPresale(thiefsNum, 8, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: This thief id is already minted");
        });

        it("should not be minted more 3 (1125) pig on presale ", async () => {
            const mintPresaleTx1 = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: presalePrice });
            await mintPresaleTx1.wait();

            const mintPresaleTx2 = await wavesMinterContract.connect(account2).mintPresale(pigsNum, 1, { value: presalePrice });
            await mintPresaleTx2.wait();

            const mintPresaleTx3 = await wavesMinterContract.connect(account3).mintPresale(pigsNum, 2, { value: presalePrice });
            await mintPresaleTx3.wait();

            await expect(  
                wavesMinterContract.connect(account4).mintPresale(pigsNum, 3, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: All pigs already minted on presale");
        });

        it("should not be minted more 3 (1125) thief on presale ", async () => {
            const mintPresaleTx1 = await wavesMinterContract.connect(account1).mintPresale(thiefsNum, 8, { value: presalePrice });
            await mintPresaleTx1.wait();
            
            const mintPresaleTx2 = await wavesMinterContract.connect(account2).mintPresale(thiefsNum, 9, { value: presalePrice });
            await mintPresaleTx2.wait();
            
            const mintPresaleTx3 = await wavesMinterContract.connect(account3).mintPresale(thiefsNum, 10, { value: presalePrice });
            await mintPresaleTx3.wait();
            
            await expect(  
                wavesMinterContract.connect(account4).mintPresale(thiefsNum, 11, { value: presalePrice })
            ).to.be.revertedWith("WavesMinter: All thiefs already minted on presale");
        });

        it("should go to the first wave ", async () => {
            const mintPresaleTx1 = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: presalePrice });
            await mintPresaleTx1.wait();

            const mintPresaleTx2 = await wavesMinterContract.connect(account2).mintPresale(pigsNum, 1, { value: presalePrice });
            await mintPresaleTx2.wait();

            const mintPresaleTx3 = await wavesMinterContract.connect(account3).mintPresale(pigsNum, 2, { value: presalePrice });
            await mintPresaleTx3.wait();

            const mintPresaleTx4 = await wavesMinterContract.connect(account1).mintPresale(thiefsNum, 8, { value: presalePrice });
            await mintPresaleTx4.wait();
            
            const mintPresaleTx5 = await wavesMinterContract.connect(account2).mintPresale(thiefsNum, 9, { value: presalePrice });
            await mintPresaleTx5.wait();
            
            const mintPresaleTx6 = await wavesMinterContract.connect(account3).mintPresale(thiefsNum, 10, { value: presalePrice });
            await mintPresaleTx6.wait();
            
            expect(  
                await wavesMinterContract.connect(account1).saleStatus()
            ).to.be.equal(SaleStatus.Wave1);
        });

        it("should increase balance of contract", async () => {
            const contractBalanceBefore = await wavesMinterContract.getContractBalance();

            const mintPresaleTx = await wavesMinterContract.connect(account1).mintPresale(pigsNum, 0, { value: presalePrice });
            await mintPresaleTx.wait();

            const contractBalanceAfter = await wavesMinterContract.getContractBalance();

            expect(contractBalanceAfter).to.equal(contractBalanceBefore.add(presalePrice));
        });

    });

});
