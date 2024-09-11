var jwt = require('jsonwebtoken');
var secretKey = 'dummy';

function encodeData(data) {
  return jwt.sign(data, secretKey);
}

function decodeData(data) {
  return jwt.verify(data, secretKey);
}

exports = {
  getJwtToken: async function(options) {
    try {
      var response = await $request.invokeTemplate("fetchToken", { context: {
        customer_id: options.customer_id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  getAllRecipes: async function(options) {
    try {
      var response = await $request.invokeTemplate("listRecipes", { context: {
        folder_id: options.folder_id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  startRecipe: async function(options) {
    try {
      var response = await $request.invokeTemplate("startRecipe", { context: {
        recipe_id: options.id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  stopRecipe: async function(options) {
    try {
      var response = await $request.invokeTemplate("stopRecipe", { context: {
        recipe_id: options.id
      }});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  fetchEndpoints: async function() {
    try {
      var response = await $request.invokeTemplate("fetchEndpoints");
      var apiDetails = JSON.parse(response.response);
      var data_fetch_url = apiDetails.endpoints.find(function(endpoint){ return endpoint.base_path.includes('sampleapp_data_fetch') }).base_path;
      var field_secret = apiDetails.profile[0].secret;
      await $db.set('endpointDetails', {'data_fetch_url': data_fetch_url, 'field_secret': encodeData({ secret: field_secret })});
      renderData(null,  response);
    } catch (err) {
      renderData(err);
    }
  },
  getEndpoints: async function() {
    try {
      var endpoints = await $db.get('endpointDetails');
      renderData(null,  { meta_fields_url: endpoints.meta_fields_url });
    } catch(err) {
      renderData(err);
    }
  },
  getFieldsData: async function(options) {
    try {
      var endpoints = await $db.get('endpointDetails');
      var requestData = {
        path: endpoints.data_fetch_url,
        field_secret: decodeData(endpoints.field_secret).secret,
      }
      if(options.user_id) {
        Object.assign(requestData, {query_params: 'user_id=' + options.user_id + '&email='+ options.email});
      }
      var fieldsData = await $request.invokeTemplate("triggerEndpoint",{ context: requestData});
      var userData = JSON.parse(fieldsData.response);
      var entityFields = await $db.get('entity_fields');
      var response = {};
      entityFields.fields_list.forEach(function(field){
        response[field[1]] = userData[field[0]] || '';
      });
      renderData(null,  response);
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
          var apis = []
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
