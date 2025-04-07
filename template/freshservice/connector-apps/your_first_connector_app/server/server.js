const jwt = require('jsonwebtoken');

const workatoDomainMapping = {
  AUS: 'apim.au.workato.com',
  EUC: 'apim.eu.workato.com'
};

const defaultWorkatoDomain = 'apim.workato.com';

function encodeData(data, secretKey) {
  return jwt.sign(data, secretKey);
}

function decodeData(data, secretKey) {
  return jwt.verify(data, secretKey);
}

exports = {
  getJwtToken: async function(options) {
    try {
      const response = await $request.invokeTemplate("fetchToken", { context: {
        customer_id: options.customer_id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  getAllRecipes: async function(options) {
    try {
      const response = await $request.invokeTemplate("listRecipes", { context: {
        folder_id: options.folder_id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  startRecipe: async function(options) {
    try {
      const response = await $request.invokeTemplate("startRecipe", { context: {
        recipe_id: options.id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  stopRecipe: async function(options) {
    try {
      const response = await $request.invokeTemplate("stopRecipe", { context: {
        recipe_id: options.id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  fetchEndpoints: async function() {
    try {
      const response = await $request.invokeTemplate("fetchEndpoints");
      const apiDetails = JSON.parse(response.response);
      // TODO: Use the appropriate value for base path of Widget API in below statement
      const data_fetch_url = apiDetails.endpoints.find(function(endpoint){ return endpoint.base_path.includes('sample_app_data_fetch') }).base_path;
      const field_secret = apiDetails.profile[0].secret;

      const appSettings = await $db.get('appSettings');
      await $db.set('endpointDetails', {'data_fetch_url': data_fetch_url, 'field_secret': encodeData({ secret: field_secret }, appSettings.server_secret)});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  getEndpoints: async function() {
    try {
      const endpoints = await $db.get('endpointDetails');
      renderData(null,  { meta_fields_url: endpoints.meta_fields_url });
    } catch(err) {
      renderData(err);
    }
  },
  getFieldsData: async function(options) {
    try {
      const endpoints = await $db.get('endpointDetails');
      const podDetails = await $db.get('podDetails');
      const baseUrl = workatoDomainMapping[podDetails.region] || defaultWorkatoDomain;
      const appSettings = await $db.get('appSettings');
      const requestData = {
        path: endpoints.data_fetch_url,
        field_secret: decodeData(endpoints.field_secret, appSettings.server_secret).secret,
        base_url: baseUrl
      }
      if(options.freshserviceId) {
        Object.assign(requestData, {query_params: 'freshserviceId=' + options.freshserviceId});
      }
      const fieldsData = await $request.invokeTemplate("triggerEndpoint",{ context: requestData});
      const userData = JSON.parse(fieldsData.response);

      if (options.meta) {
        // Handle meta option: Return keys only
        renderData(null, Object.keys(userData));
        return;
      }

      let entityFields = {};
      try {
        entityFields = await $db.get('entity_fields');
      } catch (error) {
        console.error("Error fetching entity fields:", error);
      }
      const response = {};
      entityFields.fields_list?.forEach(function(field){
        response[field[1]] = userData[field[1]] || '';
      });
      renderData(null, response);
    } catch (err) {
      renderData(err);
    }
  },
  onAppInstallCallback: async function(args) {
    try {
      console.log('before configureEndpoints called | folder id:', args.iparams.folder_id);
      await $request.invokeTemplate("configureEndpoints", { 
        context: {},
        body: JSON.stringify({folder_id: args.iparams.folder_id})
      });
      $db.set('podDetails', { region: args.region });
      $db.set('appSettings', args.app_settings);
      console.log('after configureEndpoints called');
    } catch (err) {
      console.log('onAppInstallCallback Error');
      console.log(err);
    }
    renderData();
  },
  onAppUninstallCallback: function() {
    $db.get("recipeIds").then (
      function(data) {
        if(data.recipe_ids.length) {
          const apis = []
          data.recipe_ids.forEach(function(recipeId){
            apis.push(
              $request.invokeTemplate("stopRecipe", { context: {
                recipe_id: recipeId
              }})
            )
          })
          Promise.all(apis)
          .then(function() {
            renderData();
          })
          .catch(function(error){
            console.log(error);
            renderData(error);
          });
        } else {
          renderData();
        }
      },
      function(error) {
        console.log(error)
        renderData();
      });
  },
  onSettingsUpdate: function (args) {
    console.log('onSettingsUpdate invoked with following data: \n', args);
    renderData();
  }
}
