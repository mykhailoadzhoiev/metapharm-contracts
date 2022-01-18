import { task } from "hardhat/config"; // import function
import "@nomiclabs/hardhat-waffle"; // change require to import

import * as dotenv from "dotenv";
dotenv.config({ path: __dirname+'/.env' });

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const { API_URL_RINKEBY, API_URL_KOVAN, MNEMONIC, 
        PRIVATE_KEY1, PRIVATE_KEY2,
        PRIVATE_KEY3, PRIVATE_KEY4,
        PRIVATE_KEY5, PRIVATE_KEY6, 
        PRIVATE_KEY7, PRIVATE_KEY8, 
        PRIVATE_KEY9, PRIVATE_KEY10  } = process.env;
        
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {

  defaultNetwork: "ganachecli",

  networks: {
    hardhat: {
      // default
    },
    ganachecli: {
      url: "http://127.0.0.1:8545"
    },
    ethermain: {
      url: "API_URL_MAINNET", // "https://mainnet.infura.io/v3/<your_infura_key"
      accounts: [
        PRIVATE_KEY1, PRIVATE_KEY2,
        PRIVATE_KEY3, PRIVATE_KEY4,
        PRIVATE_KEY5, PRIVATE_KEY6, 
        PRIVATE_KEY7, PRIVATE_KEY8, 
        PRIVATE_KEY9, PRIVATE_KEY10,
      ]
    },
    rinkeby: {
      url: API_URL_RINKEBY,  
      accounts: [
        PRIVATE_KEY1, PRIVATE_KEY2,
        PRIVATE_KEY3, PRIVATE_KEY4,
        PRIVATE_KEY5, PRIVATE_KEY6, 
        PRIVATE_KEY7, PRIVATE_KEY8, 
        PRIVATE_KEY9, PRIVATE_KEY10,
      ]
    },
    kovan: {
      url: API_URL_KOVAN,  
      accounts: [
        PRIVATE_KEY1, PRIVATE_KEY2,
        PRIVATE_KEY3, PRIVATE_KEY4,
        PRIVATE_KEY5, PRIVATE_KEY6, 
        PRIVATE_KEY7, PRIVATE_KEY8, 
        PRIVATE_KEY9, PRIVATE_KEY10,
      ]
    },
    bscmain: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: {mnemonic: MNEMONIC}
    },
    bsctest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {mnemonic: MNEMONIC}
    }
  },

  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // default
      }
    }
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 10000000
  }
}