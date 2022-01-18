import { ethers } from "hardhat";
import { expect } from "chai";
import chai from "chai";
// import { beforeEach } from "mocha"; 
import { solidity } from "ethereum-waffle";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity); 

describe("Waves Minter - Base", () => {

    let pigsContract: Contract;
    let thiefsContract: Contract;
    let wavesMinterContract: Contract;

    let owner: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let account3: SignerWithAddress;
    let account4: SignerWithAddress;

    let httpProvider = new ethers.providers.JsonRpcProvider();

    let rinkebyProvider = ethers.getDefaultProvider("rinkeby", {
        alchemy: "3lTMXStBkxTwC-oDMRjlhQ8A3kw1kh1Y"
    });

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
        [owner, account1, account2, account3, account4] = await ethers.getSigners();

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
    });

    xdescribe("Deployment", () => {
        it("should initialize the Waves Minter contract", async () => {
            expect(await wavesMinterContract.pigsContract()).to.equal(pigsContract.address);
            expect(await wavesMinterContract.thiefsContract()).to.equal(thiefsContract.address);
            expect(await wavesMinterContract.saleStatus()).to.equal(SaleStatus.Disable);
        });

        it("should set the right minter to pigs contract", async () => {
            // set minter
            const setMinterTx = await pigsContract.connect(owner).setMinter(wavesMinterContract.address);
            await setMinterTx.wait();
            
            expect(await pigsContract.getMinter()).to.equal(wavesMinterContract.address);
        });

        it("should set the right minter to thiefs contract", async () => {
            // set minter
            const setMinterTx = await thiefsContract.connect(owner).setMinter(wavesMinterContract.address);
            await setMinterTx.wait();
            
            expect(await thiefsContract.getMinter()).to.equal(wavesMinterContract.address);
        });

        it("should set the right owner", async () => {
            expect(await wavesMinterContract.owner()).to.equal(owner.address);
        });
    });

    xdescribe("Sale", () => {

        it("should enable Sale when called from the owner", async () => {
            const enableSaleTx = await wavesMinterContract.connect(owner).enableSale();

            // wait until the transaction is mined
            await enableSaleTx.wait();

            expect(await wavesMinterContract.saleStatus()).to.equal(SaleStatus.Presale);
        });

        it("should not enable Sale when called from any caller", async () => {
            // `require` will evaluate false and revert the transaction
            await expect(
                wavesMinterContract.connect(account1).enableSale()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    
        it("should prohibit enabling Sales for the second time", async () => {
            const enableSaleTx = await wavesMinterContract.connect(owner).enableSale();
            await enableSaleTx.wait();
            
            // `require` will evaluate false and revert the transaction
            await expect(
                wavesMinterContract.enableSale()
            ).to.be.revertedWith("WavesMinter: Sale already enabled");
        });

        xit("should withdraw funds from the contract when called from the owner (ganache-cli)", async () => {
            const ethReceiverBalance = await httpProvider.getBalance(account4.address);

            // send ether to the contract
            const sendEthTx = await account1.sendTransaction({
                to: wavesMinterContract.address,
                value: ethers.utils.parseEther("0.0001"), // send 0.0001 ETH
            });
            await sendEthTx.wait();

            const contractBalance = await httpProvider.getBalance(wavesMinterContract.address);

            const withdrawTx = await wavesMinterContract.connect(owner).withdraw(account4.address);
            await withdrawTx.wait();

            const newEthReceiverBalance = await httpProvider.getBalance(account4.address);
            expect(newEthReceiverBalance).to.equal(ethReceiverBalance.add(contractBalance));
        });

        it("should withdraw funds from the contract when called from the owner (rinkeby)", async () => {
            const ethReceiverBalance = await rinkebyProvider.getBalance(account4.address);

            // send ether to the contract
            const sendEthTx = await account1.sendTransaction({
                to: wavesMinterContract.address,
                value: ethers.utils.parseEther("0.001"), // send 0.0001 ETH
            });
            await sendEthTx.wait();

            const contractBalance = await rinkebyProvider.getBalance(wavesMinterContract.address);

            const withdrawTx = await wavesMinterContract.connect(owner).withdraw(account4.address);
            await withdrawTx.wait();

            const newEthReceiverBalance = await rinkebyProvider.getBalance(account4.address);
            expect(newEthReceiverBalance).to.equal(ethReceiverBalance.add(contractBalance));
        });
    
        it("should not withdraw funds from the contract when called from any caller", async () => {
            await expect(
                wavesMinterContract.connect(account1).withdraw(account1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should not mint presale with disable sale", async () => {
            const setMinterTx = await pigsContract.connect(owner).setMinter(wavesMinterContract.address);
            await setMinterTx.wait();

            const addToWhiteListTx = await wavesMinterContract.connect(owner).addToWhiteList(account1.address);
            await addToWhiteListTx.wait();

            await expect(wavesMinterContract.connect(account1).mintPresale(
                0, // pigsNum
                0, // first id to test pigs
                { value: ethers.utils.parseEther("0.35") }
            )).to.be.revertedWith("WavesMinter: Presale is not active");
        });

    });

    xdescribe("Whitelist", () => {

        it("should add a batch of users to the whitelist when called from the owner", async () => {
            const addToWhiteListBatchTx = await wavesMinterContract.connect(owner).addToWhiteListBatch(
                [account1.address, account2.address]
            );

            await addToWhiteListBatchTx.wait();

            expect(await wavesMinterContract.connect(owner).whitelistMember(account1.address)).to.equal(true);
            expect(await wavesMinterContract.connect(owner).whitelistMember(account2.address)).to.equal(true);
        });
    
        it("should not add a batch of users to the whitelist when called from any caller", async () => {
            await expect(  
                wavesMinterContract.connect(account1).addToWhiteListBatch([account1.address, account2.address])
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should add user to the whitelist when called from the owner ", async () => {
            const addToWhiteListTx = await wavesMinterContract.connect(owner).addToWhiteList(account1.address);
            await addToWhiteListTx.wait();

            expect(
                await wavesMinterContract.connect(owner).whitelistMember(account1.address)
            ).to.equal(true);
        });
    
        it("should not add user to the whitelist when called from any caller ", async () => {
            await expect(  
                wavesMinterContract.connect(account1).addToWhiteList(account1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    
    });

});
