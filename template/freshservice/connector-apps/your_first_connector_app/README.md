## Freshservice App Project

Congratulations on creating your first Workato App! Feel free to replace this text with your project description.

### TODOS:
1. Update third party connector name:
    config/iparams.html: Modify the third-party connector name to reflect the correct name as per Workato. This name will be available as the response of the `fetchTenant` function.
2. Update Screenshots:
    app/index.html: Uncomment the img tags with the updated images.
3. Update Solution articles:
    config/iparams.html: Modify the solution article link.
    app/index.html: Modify the solution article link.

All the steps to be done, are added as todos comments in the files.

#### Additional Checks
1. Review all TODOs:
    Before finalizing, search for any remaining TODO comments in your project files to ensure you've addressed all necessary tasks.
2. Test the Changes:
    After making the updates, ensure that your changes are reflected in the browser by opening the project locally or deploying it for testing.

### Project folder structure explained

├── README.md
├── app
│   ├── assets
│   │   ├── images
│   │   │   ├── connection_lost.svg
│   │   │   ├── empty-state.svg
│   │   │   ├── empty_data.svg
│   │   │   ├── no-permission.svg
│   │   │   └── not-found.svg
│   │   └── styles
│   │       ├── style.css
│   │       └── widget.css
│   ├── index.html
│   ├── scripts
│   │   ├── app.js
│   │   └── widget.js
│   └── widget.html
├── config
│   ├── assets
│   │   ├── css
│   │   │   └── iparams.css
│   │   └── iparams.js
│   ├── iparams.html
│   └── requests.json
├── log
│   └── fdk.log
├── manifest.json
└── server
    └── server.js

