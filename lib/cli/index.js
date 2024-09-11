'use strict';

const { Command } = require('commander');

async function initialize(argv) {

  const program = new Command();

  const createCommand = program.command('create').description('Creates a new app based on the specified options');
  createCommand
  .option('-p, --product <product>', 'where product is a Freshworks product. If this option is not specified, ' +
  'a prompt is displayed with the list of supported products')
  .option('-t, --template <template>', 'where template is the name of one of the templates that can be used as a starting point for development. ' +
  'If this option is not specified, a prompt is displayed with the list of supported templates for the given product.')
  .option('-n, --appname <appname>', 'where appname is the name of the connector app that you are building, it should match with the name of the connector in workato.')
  .addHelpText('after', 'fs-connector create -p freshservice -t connector_app');
  createCommand.action(options => require('../cli/create').run(process.cwd(), options.product, options.template, options.appname));

  return program.parseAsync(argv);
}

module.exports = { initialize };