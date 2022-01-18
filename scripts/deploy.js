async function main() {
  const Pigs = await ethers.getContractFactory("MetaPigs");
  const pigs = await Pigs.deploy();
  console.log("MetaPigs contract address:", pigs.address);

  const Thiefs = await ethers.getContractFactory("MetaThieves");
  const thiefs = await Thiefs.deploy();
  console.log("MetaThieves contract address:", thiefs.address);

  const WavesMinter = await ethers.getContractFactory("WavesMinter");
  const wavesMinter = await WavesMinter.deploy(
    pigs.address,
    thiefs.address
  );
  console.log("Waves Minter contract address:", wavesMinter.address);

  // Set minter
  await pigs.setMinter(wavesMinter.address);
  await thiefs.setMinter(wavesMinter.address);

  // Transfer ownership
  await wavesMinter.transferOwnership("0x31136Ac6e367F699FE4AB4BDbFB0C169D294271C");
}


main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});