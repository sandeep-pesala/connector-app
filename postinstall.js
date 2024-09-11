const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = path.resolve(`${os.homedir()}`);
const folderName = '.fs-connector';

const targetPath = path.join(rootDir, folderName);
const sourceTemplatePath = path.join(__dirname, 'template');
const targetTemplatePath = path.join(targetPath, 'template');

function copyFolderSync(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  fs.readdirSync(source).forEach((file) => {
    const srcFile = path.join(source, file);
    const destFile = path.join(destination, file);

    if (fs.lstatSync(srcFile).isDirectory()) {
      copyFolderSync(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fs.mkdirSync(targetPath, { recursive: true });
  console.log(`Directory ${targetPath} created successfully.`);
} else {
  console.log(`Directory ${targetPath} already exists.`);
}

if (fs.existsSync(sourceTemplatePath)) {
  copyFolderSync(sourceTemplatePath, targetTemplatePath);
  console.log(`Template folder copied to ${targetTemplatePath} successfully.`);
} else {
  console.error(`Template folder does not exist in the package.`);
}
