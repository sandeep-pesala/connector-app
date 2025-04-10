'use strict';

const inquirer = require('inquirer');
const os = require('os');
const fs = require('fs-extra');
const replaceInFile = require('replace-in-file');
const _ = require('lodash');
const crypto = require('crypto');

const ALLOWED_PRODUCTS = ['freshservice'];
const ALLOWED_TEMPLATES = {'freshservice': ['your_first_connector_app', 'workato_background_connector']}

async function run(prjDir, product, template, appname) {
  console.log(prjDir, product, template, appname);
  if (product === undefined || !ALLOWED_PRODUCTS.includes(product)) {
    product = 'freshservice'
  }
  if (template === undefined) {
    return inquirer.prompt({
      type: 'list',
      name: 'template_name',
      message: 'Choose a template:',
      choices: ALLOWED_TEMPLATES[product]
    }).then(val => {
      template = val.template_name;
      if (appname === undefined) {
        return inquirer.prompt({
          type: 'input',
          name: 'connector_app_name',
          message: 'Enter the name of the connector app:'
        }).then(val => {
          appname = val.connector_app_name;
          if (product && template && appname) {
            initTemplate({prjDir, product, template, appname})
          }
        })
      }
    });
  }
}

async function replaceWithconnectorAppName(appName, prjDir, template) {
  var replacableFiles = [`${prjDir}/app/scripts/app.js`, `${prjDir}/app/scripts/widget.js`, `${prjDir}/app/index.html`, `${prjDir}/app/widget.html`, `${prjDir}/config/iparams.html`, `${prjDir}/server/server.js`, `${prjDir}/config/assets/css/iparams.css`, `${prjDir}/config/assets/iparams.js`]
  const widgetFiles = [`${prjDir}/app/scripts/widget.js`,  `${prjDir}/app/widget.html`]
  replacableFiles = template == 'your_first_connector_app' ? replacableFiles : replacableFiles.filter(item => !widgetFiles.includes(item))
  const filesToAddSecret = [`${prjDir}/server/server.js`];
  const secretGenerated = crypto.randomBytes(16).toString('hex');

  const optionsForSmallCase = {
    files: replacableFiles,
    from: /sampleapp/g,
    to: appName
  };

  const optionsForTitleCase = {
    files: replacableFiles,
    from: /SampleApp/g,
    to: capitalize(_.camelCase(appName))
  };

  const optionsForCamelCase = {
    files: replacableFiles,
    from: /sampleApp/g,
    to: _.camelCase(appName)
  };

  const optionsForSnakeCase = {
    files: replacableFiles,
    from: /sample_app/g,
    to: _.snakeCase(appName)
  };

  const optionsForKebabCase = {
    files: replacableFiles,
    from: /sample-app/g,
    to: _.kebabCase(appName)
  };

  const optionsForAddingSecret = {
    files: filesToAddSecret,
    from: /dummy_token_to_be_replaced/g,
    to: secretGenerated,
  }

  await replaceInFile(optionsForSmallCase);
  await replaceInFile(optionsForTitleCase);
  await replaceInFile(optionsForCamelCase);
  await replaceInFile(optionsForSnakeCase);
  await replaceInFile(optionsForKebabCase);
  await replaceInFile(optionsForAddingSecret);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function initTemplate({prjDir, product, template, appname}) {
  fs.copySync(`${os.homedir()}/.fs-connector/template/${product}/connector-apps/${template}`, prjDir);
  replaceWithconnectorAppName(appname, prjDir, template);
}

module.exports = { run };
