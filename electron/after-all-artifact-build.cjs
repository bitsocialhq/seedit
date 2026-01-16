const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('../package.json');
const rootPath = path.resolve(__dirname, '..');
const distFolderPath = path.resolve(rootPath, 'dist');

function addPortableToPortableExecutableFileName() {
  const files = fs.readdirSync(distFolderPath);
  for (const file of files) {
    if (file.endsWith('.exe') && !file.match('Setup')) {
      const filePath = path.resolve(distFolderPath, file);
      const renamedFilePath = path.resolve(distFolderPath, file.replace('seedit', 'seedit Portable'));
      fs.moveSync(filePath, renamedFilePath);
    }
  }
}

function createHtmlArchive() {
  if (process.platform !== 'linux') {
    return;
  }
  const zipBinPath = path.resolve(rootPath, 'node_modules', '7zip-bin', 'linux', 'x64', '7za');
  const seeditHtmlFolderName = `seedit-html-${packageJson.version}`;
  const outputFile = path.resolve(distFolderPath, `${seeditHtmlFolderName}.zip`);
  const inputFolder = path.resolve(rootPath, 'build');
  try {
    execSync(`${zipBinPath} a ${outputFile} ${inputFolder}`);
    execSync(`${zipBinPath} rn -r ${outputFile} build ${seeditHtmlFolderName}`);
  } catch (e) {
    console.error('electron build createHtmlArchive error:', e);
  }
}

module.exports = async function afterAllArtifactBuild(_buildResult) {
  addPortableToPortableExecutableFileName();
  createHtmlArchive();
};