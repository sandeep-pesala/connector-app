document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();

  function renderApp() {
    const onInit = app.initialized();

    onInit
      .then(function getClient(_client) {
        window.client = _client;
        client.events.on('app.activated', onAppActivated);
      })
      .catch(handleErr);
  }
};

let appIparams, selectedEntityFields;

async function onAppActivated() {
  // off event so that it won't be attached multiple times during multiple pjax navigation
  client.events.off('app.activated', onAppActivated);

  // For each connector app, one have to create a recipe in freshservice workato account 
  // under the app folder to fetch the fields data
  try {
    appIparams = await client.iparams.get();
    renderDashboard();
    bindEvents();
  } catch(error) {
    handleErr(error);
  }

  // Show Quick Help popup first time of user visit
  client.db.get('quickHelpSeen').then(function(){
    // Assume user has seen
  }, function(){
    jQuery('#help-modal-trigger').click();
    client.db.set('quickHelpSeen', {'seen': true});
  });
}

function renderDashboard() {
  fetchToken({type: 'dashboard'});
}


function handleErr(err = 'None') {
  console.log(`Error occured. Details:`, err);
  let message;
  try {
    message = err.message ? JSON.parse(err.message).error : JSON.parse(err.response).message;
    if(!message) throw err;
  } catch(error) {
    console.error(error);
    message = 'Something went wrong. Please try again.';
  }
  document.querySelector('#toaster').trigger({
    type:'error',
    content: message,
    position: 'top-center'
  });
}

function handleRecipesStateChange($targerBtn, showStartOrStop, btnData) {
  $targerBtn
  .addClass('hide')
  .siblings('.'+showStartOrStop+'-recipe')
  .removeClass('hide')
  .removeAttr('disabled');
  setKebabMenu(btnData.index, btnData, btnData.key === 'start');
  document.querySelector('#toaster').trigger({
    type:'success',
    content: 'Recipe updated successfully.',
    position: 'top-center'
  });
}

function handleTimoutCase($targerBtn, showStartOrStop, btnData) {
  client.request.invoke("getAllRecipes", appIparams).then(
    function(data) {
      let recipeList = [];
      recipeList = JSON.parse(data.response.response);
      const recipeData = recipeList.find(function(recipe){ return btnData.id === recipe.id; });
      if((showStartOrStop === 'start' && !recipeData.running) || (showStartOrStop === 'stop' && recipeData.running)) {
        handleRecipesStateChange($targerBtn, showStartOrStop, btnData);
      } else {
        $targerBtn.removeAttr('disabled');
        handleErr();
      }
    },
    function(error) {
      $targerBtn.removeAttr('disabled');
      handleErr(error);
    }
  )
}

function bindEvents() {
  jQuery(document).off(".sampleApp");
  jQuery('#tabs-container, fw-toggle, #entity-fields-list').off(".sampleApp");

  jQuery('#tabs-container').on( "fwChange.sampleApp", function( event ) {
    if(event.detail.tabIndex === 1) {
      const $tableContainer = jQuery('#list-table-container');
      if($tableContainer.hasClass('visited')) return;
      $tableContainer.addClass('visited');
      jQuery('#spinner-loader').removeClass('hide');
      client.request.invoke("getAllRecipes", appIparams).then(
        function(data) {
          let recipeList = [];
          recipeList = JSON.parse(data.response.response);
          if(recipeList && recipeList.length) {
            const recipeIds = recipeList.map(function(recipe) {return recipe.id });

            // save recipe to stop while app uninstall
            client.db.set('recipeIds', {'recipe_ids': recipeIds});
            jQuery('#tenant-list-body').empty();
            recipeList.forEach(function(recipe, i){
              jQuery('#tenant-list-body').append(`<tr>
                  <td>${recipe.name}</td>
                  <td>${recipe.description}</td>
                  <td class="action-btns">
                    <fw-button color="secondary" class="preview-recipe show-iframe" data-type="view" data-id="${recipe.id}" data-name="${recipe.name}"> Preview </fw-button>
                    <fw-button color="primary" class="start-recipe ${recipe.running ? 'hide' : ''}" data-id="${recipe.id}" data-name="${recipe.name}" data-index="${i}" data-key="start"> Start </fw-button>
                    <fw-button color="primary" class="stop-recipe ${recipe.running ? '' : 'hide'}" data-id="${recipe.id}" data-name="${recipe.name}" data-index="${i}" data-key="stop"> Stop </fw-button>
                    <fw-kebab-menu id="standard-kebab-menu-${i}"></fw-kebab-menu>
                  </td>
                </tr>`);
                setKebabMenu(i, recipe, recipe.running);
            });
            jQuery('#list-table-container, #recipe-table-info').removeClass('hide');
            jQuery('#spinner-loader').addClass('hide');
          } else {
            jQuery('#no-workflows').removeClass('hide').siblings('.sibling-container').addClass('hide');
          }

        },
        function(error) {
          handleErr(error);
          if([401, 403].includes(error.status)) {
            jQuery('#no-permission').removeClass('hide').siblings().addClass('hide');
          }
        }
      )
    }
  });

  jQuery(document).on('click.sampleApp', '.start-recipe, .stop-recipe', function(e){
    const btnData = e.target.dataset;
    const showStartOrStop = btnData.key === 'start' ? 'stop' : 'start';
    const requestData = jQuery.extend({}, appIparams, {id: btnData.id});
    const $targerBtn = jQuery(e.target);
    $targerBtn.attr('disabled', 'disabled');
    client.request.invoke(btnData.key+"Recipe", requestData).then(
      function() {
        handleRecipesStateChange($targerBtn, showStartOrStop, btnData);
      },
      function(error) {
        // Workato takes more than 8s, but freshworks marketplace app timeout in 5s. so, validating the state after freshworks marketplace app timeout.
        if([408, 502, 504].includes(error.status)) {
          setTimeout(handleTimoutCase($targerBtn, showStartOrStop, btnData), 5000);
        } else {
          $targerBtn.removeAttr('disabled');
          handleErr(error);
        }
      }
    );
  });

  jQuery(document).on('click.sampleApp', '.show-iframe', function(e) {
    handleTenantCrud(jQuery(e.target).data());
  });
}

function setKebabMenu(i, recipe, showLog) {
  const standardDataSource = [
    {
      value: {
        type: 'edit',
        id: recipe.id,
        name: recipe.name
      },
      text: 'Edit',
    }
  ];
  if(showLog) {
    standardDataSource.push({
      value: {
        type: 'log',
        id: recipe.id,
        name: recipe.name
      },
      text: 'View log',
    });
  }
  const standardVariant = jQuery('#standard-kebab-menu-'+i);
  standardVariant[0].options = standardDataSource;
  standardVariant.off('fwSelect.sampleApp').on('fwSelect.sampleApp', function(e) {
    handleTenantCrud(e.detail.value);
  });
}

function handleTenantCrud(data) {
  const $tenant = jQuery('#tenant-'+data.type);
  $tenant.find('.recipe-name').text(data.name);
  switch(data.type) {
    case 'view':
      $tenant.removeClass('hide').find('#edit-tenant-btn').data({id: data.id, type: 'edit'});
      jQuery('#list-table-container, #recipe-table-info').addClass('hide');
      break;
    case 'edit':
      jQuery('#tenant-view, #list-table-container, #recipe-table-info').addClass('hide');
      $tenant.removeClass('hide');
      break;
    case 'log':
      jQuery('#tenant-log, #list-table-container, #recipe-table-info').toggleClass('hide');
      break;
  }
  fetchToken(data);
}

function fetchToken(data) {
  const $appIframe = jQuery('#'+data.type+'-iframe');
  $appIframe.attr('src', '');
  client.request.invoke('getJwtToken', appIparams).then(
    function(resData) {
      const response = JSON.parse(resData.response.response);
      switch(data.type) {
        case 'view':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Frecipes%2F${data.id}%23recipe&workato_dl_token=${response.token}`);
          break;
        case 'edit':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Frecipes%2F${data.id}%2Fedit&workato_dl_token=${response.token}`);
          break;
        case 'log':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Frecipes%2F${data.id}%23jobs&workato_dl_token=${response.token}`);
          break;
        case 'dashboard':
          $appIframe.attr('src', `${appIparams.base_url}direct_link?workato_dl_path=%2Fdashboard%2Fmain&workato_dl_token=${response.token}&folder_id=${appIparams.folder_id}`);
          jQuery('#dashboard-loader').addClass('hide');
          break;
      }
    },
    function(error) {
      handleErr(error);
    }

  );
}

function backToTable(type) {
  jQuery('#tenant-'+type+', #list-table-container, #recipe-table-info').toggleClass('hide');
}
