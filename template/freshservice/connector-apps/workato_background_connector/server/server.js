const jwt = require('jsonwebtoken');
const secretKey = 'dummy_token_to_be_replaced';

const workatoDomainMapping = {
  AUS: 'apim.au.workato.com',
  EUC: 'apim.eu.workato.com'
};

const defaultWorkatoDomain = 'apim.workato.com';

function encodeData(data) {
  return jwt.sign(data, secretKey);
}

function decodeData(data) {
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
      const requestData = {
        path: endpoints.data_fetch_url,
        field_secret: decodeData(endpoints.field_secret).secret,
        base_url: baseUrl
      }
      if(options.user_id) {
        Object.assign(requestData, {query_params: 'user_id=' + options.user_id + '&email='+ options.email});
      }
      const fieldsData = await $request.invokeTemplate("triggerEndpoint",{ context: requestData});
      const userData = JSON.parse(fieldsData.response);
      const entityFields = await $db.get('entity_fields');
      const response = {};
      entityFields.fields_list.forEach(function(field){
        response[field[1]] = userData[field[0]] || '';
      });
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },

  onAppInstallCallback: function(args) {
    try {
      $db.set('podDetails', { region: args.region });
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
  }
}
