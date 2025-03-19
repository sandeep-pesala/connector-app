require('jsonwebtoken');

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
